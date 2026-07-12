import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, Search, ChevronLeft, ChevronRight, ArrowLeft,
  Heart, Loader2, AlertCircle, X, Clock, Eye, RefreshCw,
  ChevronDown, Star, Filter, Tag, FolderPlus, LayoutGrid, Columns2,
  ArrowUpDown, ArrowDownUp,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

/* ═══════════════════════════════════════════════════════════
   AllManga API Layer
   ═══════════════════════════════════════════════════════════ */

const ALLMANGA_API = 'https://api.allanime.day/api';
const ASSET_CDN = 'https://wp.youtube-anime.com/aln.youtube-anime.com';
const MANGA_CDN = 'https://ytimgf.fast4speed.rsvp';

const SEARCH_HASH = '2d48e19fb67ddcac42fbb885204b6abb0a84f406f15ef83f36de4a66f49f651a';
const DETAIL_HASH = 'd77781dcf964b97aea0be621dbde430e89e200b58526823ee6010dd11c3ca96a';

const CHAPTER_PAGES_QUERY = `query chaptersForRead($mangaId: String!, $chapterString: String!, $translationType: VaildTranslationTypeMangaEnumType!) {
  chaptersForRead(mangaId: $mangaId, translationType: $translationType, chapterString: $chapterString, limit: 100) {
    edges { _id chapterString pictureUrls pictureUrlHead }
  }
}`;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function gqlFetch(variables, sha256Hash, referer = 'https://allmanga.to/') {
  const body = JSON.stringify({
    extensions: { persistedQuery: { version: 1, sha256Hash } },
    variables,
  });
  return fetch(ALLMANGA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': referer,
      'User-Agent': UA,
    },
    body,
  }).then((r) => {
    if (!r.ok) throw new Error(`AllManga API ${r.status}`);
    return r.json();
  });
}

function normalizeThumbnail(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${ASSET_CDN}/${path.replace(/^\//, '')}`;
}

function proxyImage(url) {
  if (!url) return url;
  if (url.startsWith('/api/proxy')) return url;
  const needsProxy = url.includes('fast4speed.rsvp') || url.includes('youtube-anime.com');
  if (needsProxy) {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

function getCoverUrl(thumbnail, w = 250) {
  if (!thumbnail) return null;
  let url = normalizeThumbnail(thumbnail);
  if (url && !url.includes('?')) url = `${url}?w=${w}`;
  return proxyImage(url);
}

const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const requestTimestamps = [];
function waitForRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length && requestTimestamps[0] < now - 1000) requestTimestamps.shift();
  if (requestTimestamps.length >= 4) {
    const wait = requestTimestamps[0] + 1000 - now + 10;
    return new Promise((r) => setTimeout(r, wait));
  }
  return Promise.resolve();
}

async function cachedGql(variables, hash, referer) {
  const key = JSON.stringify({ variables, hash });
  if (apiCache.has(key)) {
    const cached = apiCache.get(key);
    if (Date.now() - cached.ts < CACHE_TTL) return cached.data;
  }
  await waitForRateLimit();
  requestTimestamps.push(Date.now());
  const data = await gqlFetch(variables, hash, referer);
  apiCache.set(key, { data, ts: Date.now() });
  return data;
}

async function searchManga(query, page = 1, translationType = 'sub', countryOrigin = 'ALL') {
  const data = await cachedGql(
    { search: { query, isManga: true }, limit: 26, page, translationType, countryOrigin },
    SEARCH_HASH
  );
  const edges = data?.data?.mangas?.edges || [];
  const total = data?.data?.mangas?.pageInfo?.total || 0;
  return {
    manga: edges.map((e) => ({
      id: e._id,
      title: e.name || e.englishName || 'Untitled',
      description: '',
      coverUrl: getCoverUrl(e.thumbnail),
      author: 'Unknown',
      status: 'ongoing',
      chapterCount: e.availableChapters?.sub || 0,
      genres: [],
      _allManga: { availableChapters: e.availableChapters, thumbnail: e.thumbnail },
    })),
    pagination: { page, totalPages: Math.ceil(total / 26), total },
  };
}

async function fetchMangaDetail(id) {
  const data = await cachedGql(
    { _id: id, search: { allowAdult: false, allowUnknown: false } },
    DETAIL_HASH
  );
  const m = data?.data?.manga;
  if (!m) throw new Error('Manga not found');

  const chapters = [];
  const maxCh = m.availableChapters?.sub || 0;
  for (let i = 1; i <= maxCh; i++) {
    chapters.push({
      id: `${id}:sub:${i}`,
      chapterNumber: i,
      title: '',
      pageCount: 0,
    });
  }

  return {
    manga: {
      id: m._id,
      title: m.name || m.englishName || 'Untitled',
      description: m.description || '',
      coverUrl: getCoverUrl(m.thumbnail),
      author: 'Unknown',
      status: m.lastChapterInfo?.sub ? 'ongoing' : 'completed',
      chapterCount: maxCh,
      genres: [],
      _allManga: {
        availableChapters: m.availableChapters,
        thumbnail: m.thumbnail,
        description: m.description,
      },
    },
    chapters,
  };
}

async function fetchChapterPages(mangaId, chapterString, translationType = 'sub') {
  const body = JSON.stringify({
    query: CHAPTER_PAGES_QUERY,
    variables: { mangaId, chapterString: String(chapterString), translationType },
  });

  await waitForRateLimit();
  requestTimestamps.push(Date.now());
  const res = await fetch(ALLMANGA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://allmanga.to/',
      'User-Agent': UA,
    },
    body,
  });
  if (!res.ok) throw new Error(`AllManga API ${res.status}`);
  const json = await res.json();

  const edge = json?.data?.chaptersForRead?.edges?.[0];
  if (!edge) throw new Error('No chapter data');

  const pages = edge.pictureUrls || [];
  return pages
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0))
    .map((p) => {
      const path = typeof p === 'string' ? p : p.url || '';
      if (!path) return null;
      const fullUrl = path.startsWith('http') ? path : `${MANGA_CDN}/${path.replace(/^\//, '')}`;
      return proxyImage(fullUrl);
    })
    .filter(Boolean);
}

/* ═══════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════ */

function getMangaTitle(manga) {
  return manga.title || 'Untitled';
}

function getMangaDescription(manga) {
  return manga.description || manga._allManga?.description || '';
}

function getMangaCover(manga) {
  return manga.coverUrl || getCoverUrl(manga._allManga?.thumbnail);
}

function getMangaCoverHQ(manga) {
  return getMangaCover(manga);
}

function getMangaAuthor(manga) {
  return manga.author || 'Unknown';
}

function getMangaTags(manga) {
  if (!manga.genres) return [];
  return manga.genres.filter(Boolean);
}

function normalizeStatus(status) {
  if (!status) return 'ongoing';
  const s = status.toLowerCase();
  if (s.includes('ongoing') || s.includes('releasing')) return 'ongoing';
  if (s.includes('completed') || s.includes('finished')) return 'completed';
  if (s.includes('hiatus')) return 'hiatus';
  if (s.includes('cancel')) return 'cancelled';
  return 'ongoing';
}

const STATUS_STYLES = {
  ongoing: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  hiatus: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DEFAULT_CATEGORIES = ['Reading', 'Plan to Read', 'Completed', 'On Hold'];

/* ═══════════════════════════════════════════════════════════
   Custom Hooks
   ═══════════════════════════════════════════════════════════ */

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-zinc-800/60" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-3/4" />
        <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
      <AlertCircle size={40} className="text-red-400/60" />
      <p className="text-zinc-400 text-sm text-center max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

function MangaCard({ manga, isInLibrary, progress, category, onClick }) {
  const title = getMangaTitle(manga);
  const cover = getMangaCover(manga);
  const author = getMangaAuthor(manga);
  const status = normalizeStatus(manga.status);
  const lastChapter = progress?.lastChapter;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-800">
        {cover ? (
          <img
            src={cover}
            alt={title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
            <BookOpen size={48} className="text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {status && (
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status] || 'bg-zinc-700/50 text-zinc-300 border-zinc-600'}`}>
              {status}
            </span>
          </div>
        )}
        {isInLibrary && (
          <div className="absolute top-2 left-2">
            <Heart size={14} className="text-red-400 fill-red-400 drop-shadow" />
          </div>
        )}
        {category && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/60 text-zinc-300 backdrop-blur-sm">
              {category}
            </span>
          </div>
        )}
        {lastChapter && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div className="h-full bg-[var(--color-accent)] w-full" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-[var(--color-accent-light)] transition-colors">
          {title}
        </h3>
        <p className="text-[11px] text-zinc-500 truncate">{author}</p>
        {manga.chapterCount > 0 && (
          <p className="text-[10px] text-zinc-600">{manga.chapterCount} chapters</p>
        )}
        {lastChapter && (
          <p className="text-[10px] text-[var(--color-accent)]">
            Ch. {lastChapter}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Browse View ─────────────────────────────────────────

function BrowseView({ onSelectManga, library, progress, categories }) {
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState('latest');
  const [page, setPage] = useState(1);
  const [allManga, setAllManga] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const debouncedSearch = useDebounce(searchInput, 300);
  const scrollRef = useRef(null);
  const lastFetchKey = useRef('');

  const isSearching = debouncedSearch.trim().length > 0;

  const fetchBrowse = useCallback(async (query, p, tab) => {
    const key = `${query}|${p}|${tab}`;
    if (key === lastFetchKey.current) return;
    lastFetchKey.current = key;
    setLoading(true);
    setError(null);
    try {
      let result;
      if (tab === 'latest' || isSearching) {
        result = await searchManga(query || '', p);
      } else if (tab === 'popular') {
        result = await searchManga(query || '', p);
        result.manga.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      } else {
        result = await searchManga(query || '', p);
      }
      setTotalPages(result.pagination?.totalPages || 0);
      if (p === 1) {
        setAllManga(result.manga);
      } else {
        setAllManga((prev) => [...prev, ...result.manga]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isSearching]);

  useEffect(() => {
    if (activeTab === 'library') return;
    setPage(1);
    setAllManga([]);
    lastFetchKey.current = '';
    const query = isSearching ? debouncedSearch.trim() : '';
    fetchBrowse(query, 1, activeTab);
  }, [debouncedSearch, activeTab]);

  useEffect(() => {
    if (page > 1 && activeTab !== 'library') {
      const query = isSearching ? debouncedSearch.trim() : '';
      fetchBrowse(query, page, activeTab);
    }
  }, [page]);

  const hasMore = page < totalPages;

  const loadMore = () => setPage((p) => p + 1);

  const libraryIds = Object.keys(library);
  const [libraryData, setLibraryData] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState(null);

  useEffect(() => {
    if (activeTab !== 'library') return;
    if (libraryIds.length === 0) {
      setLibraryData([]);
      return;
    }
    setLibraryLoading(true);
    setLibraryError(null);
    Promise.all(
      libraryIds.map((id) =>
        fetchMangaDetail(id).then((r) => r.manga).catch(() => null)
      )
    ).then((results) => {
      setLibraryData(results.filter(Boolean));
      setLibraryLoading(false);
    }).catch((err) => {
      setLibraryError(err.message);
      setLibraryLoading(false);
    });
  }, [activeTab, libraryIds.join(',')]);

  const tabs = [
    { id: 'latest', label: 'Latest', icon: Clock },
    { id: 'popular', label: 'All', icon: Star },
    { id: 'library', label: 'Library', icon: Heart },
  ];

  const displayManga = activeTab === 'library' ? libraryData : allManga;
  const isLoading = activeTab === 'library' ? libraryLoading : loading;
  const currentError = activeTab === 'library' ? libraryError : error;

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 sm:px-5 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
            <BookOpen size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Manga Reader</h1>
            <p className="text-[11px] text-zinc-500">{libraryIds.length} saved · Powered by AllManga</p>
          </div>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search manga..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-zinc-800/60 border border-zinc-700/40 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!isSearching && (
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/30'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                  {tab.id === 'library' && libraryIds.length > 0 && (
                    <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === 'library' ? 'bg-white/20' : 'bg-zinc-700'
                    }`}>
                      {libraryIds.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {isSearching && searchInput !== debouncedSearch && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-zinc-500 animate-spin" />
          </div>
        )}

        {currentError && <ErrorState message={currentError} onRetry={() => {
          lastFetchKey.current = '';
          const query = isSearching ? debouncedSearch.trim() : '';
          fetchBrowse(query, 1, activeTab);
        }} />}

        {!currentError && activeTab === 'library' && libraryIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Heart size={40} className="text-zinc-700" />
            <p className="text-zinc-500 text-sm">Your library is empty</p>
            <p className="text-zinc-600 text-xs">Save manga to access them quickly</p>
          </div>
        )}

        {!currentError && activeTab === 'library' && libraryIds.length > 0 && libraryData.length === 0 && !libraryLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Heart size={40} className="text-zinc-700" />
            <p className="text-zinc-500 text-sm">No saved manga found</p>
            <p className="text-zinc-600 text-xs">Saved manga may have been removed from the source</p>
          </div>
        )}

        {isLoading && allManga.length === 0 && !currentError && <SkeletonGrid />}

        {displayManga.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {displayManga.map((manga) => {
                const libEntry = library[manga.id];
                return (
                  <MangaCard
                    key={manga.id}
                    manga={manga}
                    isInLibrary={!!libEntry}
                    progress={progress[manga.id]}
                    category={libEntry?.category}
                    onClick={() => onSelectManga(manga)}
                  />
                );
              })}
            </div>
            {activeTab !== 'library' && hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                  Load more
                </button>
              </div>
            )}
          </>
        )}

        {!isLoading && !currentError && displayManga.length === 0 && (isSearching || activeTab !== 'library') && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Search size={40} className="text-zinc-700" />
            <p className="text-zinc-500 text-sm">No manga found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail View ─────────────────────────────────────────

function DetailView({ manga, onBack, onReadChapter, library, setLibrary, progress, categories, setCategories }) {
  const title = getMangaTitle(manga);
  const cover = getMangaCoverHQ(manga);
  const author = getMangaAuthor(manga);
  const description = getMangaDescription(manga);
  const status = normalizeStatus(manga.status);
  const tags = getMangaTags(manga);
  const isInLibrary = !!library[manga.id];
  const mangaProgress = progress[manga.id];
  const currentCategory = library[manga.id]?.category || '';

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [chapLoading, setChapLoading] = useState(true);
  const [chapError, setChapError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setChapLoading(true);
    setChapError(null);
    fetchMangaDetail(manga.id)
      .then((r) => {
        if (!cancelled) setChapters(r.chapters);
      })
      .catch((err) => {
        if (!cancelled) setChapError(err.message);
      })
      .finally(() => {
        if (!cancelled) setChapLoading(false);
      });
    return () => { cancelled = true; };
  }, [manga.id]);

  const toggleLibrary = () => {
    setLibrary((prev) => {
      const next = { ...prev };
      if (next[manga.id]) {
        delete next[manga.id];
      } else {
        next[manga.id] = { title, addedAt: Date.now(), category: '' };
      }
      return next;
    });
  };

  const setCategory = (cat) => {
    setLibrary((prev) => {
      if (!prev[manga.id]) return prev;
      return { ...prev, [manga.id]: { ...prev[manga.id], category: cat } };
    });
    setShowCategoryPicker(false);
  };

  const addNewCategory = () => {
    const name = newCategoryName.trim();
    if (!name || categories.includes(name)) return;
    setCategories((prev) => [...prev, name]);
    setCategory(name);
    setNewCategoryName('');
  };

  const continueChapterIndex = useMemo(() => {
    if (!mangaProgress?.lastChapterId || chapters.length === 0) return -1;
    const idx = chapters.findIndex((ch) => ch.id === mangaProgress.lastChapterId);
    if (idx >= 0 && idx < chapters.length - 1) return idx + 1;
    return idx;
  }, [mangaProgress, chapters]);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="shrink-0 border-b border-zinc-800">
        <div className="flex items-start gap-4 p-4 sm:p-5">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors mt-1 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-lg overflow-hidden shrink-0 shadow-lg bg-zinc-800">
            {cover ? (
              <img src={cover} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={24} className="text-zinc-600" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 line-clamp-2">{title}</h2>
            <p className="text-xs text-zinc-400">{author}</p>
            <div className="flex flex-wrap gap-1.5">
              {status && (
                <span className={`text-xs px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[status] || 'bg-zinc-700/50 text-zinc-300 border-zinc-600'}`}>
                  {status}
                </span>
              )}
              {manga.chapterCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40">
                  {manga.chapterCount} chapters
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.slice(0, 6).map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/40">
                  {tag}
                </span>
              ))}
              {tags.length > 6 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  +{tags.length - 6}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={toggleLibrary}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isInLibrary
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700/40 hover:bg-zinc-700'
                }`}
              >
                <Heart size={13} className={isInLibrary ? 'fill-red-400' : ''} />
                {isInLibrary ? 'Saved' : 'Save'}
              </button>
              {isInLibrary && (
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/40 hover:bg-zinc-700 transition-all"
                  >
                    <Tag size={13} />
                    {currentCategory || 'Category'}
                    <ChevronDown size={12} />
                  </button>
                  {showCategoryPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl py-1 z-20 min-w-[180px] shadow-xl animate-scale-in">
                      <button
                        onClick={() => setCategory('')}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                          !currentCategory ? 'text-[var(--color-accent-light)] bg-[var(--color-accent)]/10' : 'text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        None
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            currentCategory === cat ? 'text-[var(--color-accent-light)] bg-[var(--color-accent)]/10' : 'text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                      <div className="border-t border-zinc-700 mt-1 pt-1 px-2">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addNewCategory()}
                            placeholder="New category..."
                            className="flex-1 px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded-md text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[var(--color-accent)]/50"
                          />
                          <button
                            onClick={addNewCategory}
                            disabled={!newCategoryName.trim()}
                            className="p-1 rounded-md bg-[var(--color-accent)]/20 text-[var(--color-accent-light)] hover:bg-[var(--color-accent)]/30 transition-colors disabled:opacity-30"
                          >
                            <FolderPlus size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {description && (
          <div className="px-4 sm:px-5 pb-4">
            <p className="text-xs text-zinc-400 line-clamp-4 leading-relaxed">{description}</p>
          </div>
        )}
      </div>

      {continueChapterIndex >= 0 && (
        <div className="shrink-0 px-4 sm:px-5 pt-4">
          <button
            onClick={() => onReadChapter(chapters[continueChapterIndex], chapters)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-medium text-sm transition-colors"
          >
            <BookOpen size={16} />
            Continue Ch. {chapters[continueChapterIndex].chapterNumber || '?'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-zinc-300">
              Chapters {!chapLoading && `(${chapters.length})`}
            </h3>
            {chapters.length > 0 && (
              <button
                onClick={() => setSortAsc((s) => !s)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title={sortAsc ? 'Sort newest first' : 'Sort oldest first'}
              >
                {sortAsc ? <ArrowDownUp size={12} /> : <ArrowUpDown size={12} />}
                {sortAsc ? 'Oldest' : 'Newest'}
              </button>
            )}
          </div>

          {chapLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-zinc-500 animate-spin" />
            </div>
          )}

          {chapError && <ErrorState message={chapError} onRetry={() => {}} />}

          {!chapLoading && !chapError && chapters.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-sm">No chapters available</p>
            </div>
          )}

          <div className="space-y-1">
            {(sortAsc ? chapters : [...chapters].reverse()).map((ch) => {
              const chNum = ch.chapterNumber;
              const chTitle = ch.title;
              const isRead = mangaProgress?.readChapters?.[ch.id];

              return (
                <button
                  key={ch.id}
                  onClick={() => onReadChapter(ch, chapters)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all group ${
                    isRead
                      ? 'bg-zinc-800/30 hover:bg-zinc-800/60'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <span className={`font-mono text-sm w-14 shrink-0 ${isRead ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {chNum ? `#${chNum}` : '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm block truncate ${isRead ? 'text-zinc-500' : 'text-zinc-300'}`}>
                      {chTitle || `Chapter ${chNum || '?'}`}
                    </span>
                  </div>
                  {isRead && (
                    <span className="text-[10px] text-[var(--color-accent)] font-medium px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 shrink-0">
                      READ
                    </span>
                  )}
                  <ChevronRight size={14} className="text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reader View ─────────────────────────────────────────

function ReaderView({ manga, chapter, chapters, onBack, onNavigate, setProgress, readingMode, onToggleMode }) {
  const [pageUrls, setPageUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [pagerIndex, setPagerIndex] = useState(0);
  const scrollRef = useRef(null);

  const title = getMangaTitle(manga);
  const chNum = chapter.chapterNumber;
  const isPager = readingMode === 'pager';

  const currentIndex = useMemo(
    () => chapters.findIndex((ch) => ch.id === chapter.id),
    [chapters, chapter.id]
  );
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  useEffect(() => {
    let cancelled = false;
    async function fetchPages() {
      setLoading(true);
      setError(null);
      setPageUrls([]);
      setLoadedImages(new Set());
      try {
        const pages = await fetchChapterPages(manga.id, chNum);
        if (!cancelled) {
          if (pages.length > 0) {
            setPageUrls(pages);
          } else {
            throw new Error('No pages available for this chapter');
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPages();
    return () => { cancelled = true; };
  }, [chapter.id, manga.id, chNum]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    setPagerIndex(0);
  }, [chapter.id]);

  useEffect(() => {
    setProgress((prev) => ({
      ...prev,
      [manga.id]: {
        ...prev[manga.id],
        lastChapterId: chapter.id,
        lastChapter: chNum,
        readChapters: {
          ...(prev[manga.id]?.readChapters || {}),
          [chapter.id]: true,
        },
      },
    }));
  }, [chapter.id, manga.id, chNum, setProgress]);

  const handleImageLoad = useCallback((index) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  }, []);

  const retryFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    setPageUrls([]);
  }, []);

  useEffect(() => {
    if (!isPager || pageUrls.length === 0) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setPagerIndex((i) => Math.min(i + 1, pageUrls.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPagerIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPager, pageUrls.length]);

  const pagerGoPrev = useCallback(() => setPagerIndex((i) => Math.max(i - 1, 0)), []);
  const pagerGoNext = useCallback(() => setPagerIndex((i) => Math.min(i + 1, pageUrls.length - 1)), [pageUrls.length]);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm z-20">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-zinc-200 truncate">{title}</h3>
          <p className="text-[11px] text-zinc-500">Ch. {chNum || '?'}{isPager ? ` · ${pagerIndex + 1}/${pageUrls.length}` : ''}</p>
        </div>
        <button
          onClick={onToggleMode}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40 hover:border-zinc-600 transition-all"
          title={isPager ? 'Switch to webtoon mode' : 'Switch to pager mode'}
        >
          {isPager ? <Columns2 size={13} /> : <LayoutGrid size={13} />}
          {isPager ? 'Pager' : 'Webtoon'}
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => prevChapter && onNavigate(prevChapter)}
            disabled={!prevChapter}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous chapter"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => nextChapter && onNavigate(nextChapter)}
            disabled={!nextChapter}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next chapter"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {isPager ? (
        <div className="flex-1 flex flex-col bg-zinc-950 relative">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={32} className="text-[var(--color-accent)] animate-spin" />
            </div>
          )}
          {error && <div className="flex-1 overflow-y-auto"><ErrorState message={error} onRetry={retryFetch} /></div>}
          {!loading && !error && pageUrls.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <BookOpen size={40} className="text-zinc-700" />
              <p className="text-zinc-500 text-sm">No pages available</p>
            </div>
          )}
          {!loading && !error && pageUrls.length > 0 && (
            <>
              <div
                className="flex-1 flex items-center justify-center relative select-none cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  if (x < rect.width / 2) pagerGoPrev();
                  else pagerGoNext();
                }}
              >
                {!loadedImages.has(pagerIndex) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={28} className="text-zinc-500 animate-spin" />
                  </div>
                )}
                <img
                  src={pageUrls[pagerIndex]}
                  alt={`Page ${pagerIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                  onLoad={() => handleImageLoad(pagerIndex)}
                  draggable={false}
                />
                {pagerIndex > 0 && (
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <ChevronLeft size={20} className="text-white" />
                  </div>
                )}
                {pagerIndex < pageUrls.length - 1 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <ChevronRight size={20} className="text-white" />
                  </div>
                )}
              </div>
              <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur-sm px-4 py-3">
                <div className="flex items-center gap-3 max-w-xl mx-auto">
                  <button onClick={pagerGoPrev} disabled={pagerIndex === 0} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30">
                    <ChevronLeft size={18} />
                  </button>
                  <input
                    type="range" min={0} max={pageUrls.length - 1} value={pagerIndex}
                    onChange={(e) => setPagerIndex(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[var(--color-accent)]"
                  />
                  <button onClick={pagerGoNext} disabled={pagerIndex >= pageUrls.length - 1} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30">
                    <ChevronRight size={18} />
                  </button>
                </div>
                {pagerIndex >= pageUrls.length - 1 && (
                  <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-zinc-800/50">
                    {nextChapter && (
                      <button onClick={() => onNavigate(nextChapter)} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white text-sm font-medium transition-colors">
                        Next Chapter <ChevronRight size={14} />
                      </button>
                    )}
                    <button onClick={onBack} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Back to chapters</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-zinc-950">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="text-[var(--color-accent)] animate-spin" />
          </div>
        )}

        {error && <ErrorState message={error} onRetry={retryFetch} />}

        {!loading && !error && pageUrls.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BookOpen size={40} className="text-zinc-700" />
            <p className="text-zinc-500 text-sm">No pages available for this chapter</p>
          </div>
        )}

        {pageUrls.length > 0 && (
          <div className="max-w-3xl mx-auto py-2 px-1 sm:px-2 space-y-1">
            {pageUrls.map((url, i) => (
              <div key={i} className="relative w-full bg-zinc-900 rounded overflow-hidden">
                {!loadedImages.has(i) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10 min-h-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={20} className="text-zinc-500 animate-spin" />
                      <span className="text-[10px] text-zinc-600">{i + 1} / {pageUrls.length}</span>
                    </div>
                  </div>
                )}
                <img
                  src={url}
                  alt={`Page ${i + 1}`}
                  loading="lazy"
                  className="w-full h-auto block"
                  onLoad={() => handleImageLoad(i)}
                />
              </div>
            ))}

            <div className="py-8 flex flex-col items-center gap-4">
              <div className="text-sm text-zinc-500">End of Chapter {chNum || '?'}</div>
              <div className="flex items-center gap-3">
                {prevChapter && (
                  <button
                    onClick={() => onNavigate(prevChapter)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>
                )}
                {nextChapter && (
                  <button
                    onClick={() => onNavigate(nextChapter)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white text-sm font-medium transition-colors"
                  >
                    Next Chapter
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={onBack}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Back to chapter list
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════ */

export default function MangaReaderApp() {
  const [view, setView] = useState('browse');
  const [selectedManga, setSelectedManga] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [chapters, setChapters] = useState([]);

  const [library, setLibrary] = useLocalStorage('yp-manga-library', {});
  const [progress, setProgress] = useLocalStorage('yp-manga-progress', {});
  const [readingMode, setReadingMode] = useLocalStorage('yp-manga-reading-mode', 'webtoon');
  const [categories, setCategories] = useLocalStorage('yp-manga-categories', DEFAULT_CATEGORIES);

  const toggleReadingMode = useCallback(() => {
    setReadingMode((prev) => prev === 'webtoon' ? 'pager' : 'webtoon');
  }, [setReadingMode]);

  const openDetail = useCallback((manga) => {
    setSelectedManga(manga);
    setView('detail');
  }, []);

  const openReader = useCallback((chapter, allChapters) => {
    setSelectedChapter(chapter);
    if (allChapters) setChapters(allChapters);
    setView('reader');
  }, []);

  const goToBrowse = useCallback(() => {
    setView('browse');
    setSelectedManga(null);
    setSelectedChapter(null);
    setChapters([]);
  }, []);

  const goToDetail = useCallback(() => {
    setView('detail');
    setSelectedChapter(null);
  }, []);

  const navigateChapter = useCallback((chapter) => {
    setSelectedChapter(chapter);
  }, []);

  const handleReadChapter = useCallback((chapter, allChapters) => {
    setSelectedChapter(chapter);
    if (allChapters?.length) setChapters(allChapters);
    setView('reader');
  }, []);

  if (view === 'reader' && selectedManga && selectedChapter) {
    return (
      <div className="h-full bg-zinc-950 text-zinc-300">
        <ReaderView
          manga={selectedManga}
          chapter={selectedChapter}
          chapters={chapters}
          onBack={goToDetail}
          onNavigate={navigateChapter}
          setProgress={setProgress}
          readingMode={readingMode}
          onToggleMode={toggleReadingMode}
        />
      </div>
    );
  }

  if (view === 'detail' && selectedManga) {
    return (
      <div className="h-full bg-zinc-950 text-zinc-300">
        <DetailView
          manga={selectedManga}
          onBack={goToBrowse}
          onReadChapter={(chapter, allChapters) => {
            handleReadChapter(chapter, allChapters);
          }}
          library={library}
          setLibrary={setLibrary}
          progress={progress}
          categories={categories}
          setCategories={setCategories}
        />
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-950 text-zinc-300">
      <BrowseView
        onSelectManga={openDetail}
        library={library}
        progress={progress}
        categories={categories}
      />
    </div>
  );
}
