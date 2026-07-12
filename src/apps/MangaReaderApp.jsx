import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BookOpen, Search, ChevronLeft, ChevronRight, ArrowLeft,
  Heart, Loader2, AlertCircle, X, Clock, Eye, RefreshCw,
  ChevronDown, Star, Filter, Tag, FolderPlus, LayoutGrid, Columns2,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

/* ═══════════════════════════════════════════════════════════
   API Layer — caching, rate-limiting, helpers
   ═══════════════════════════════════════════════════════════ */

const API_BASE = 'https://api.mangadex.org';
const IMG_CDN = 'https://uploads.mangadex.org';

function proxyApi(path) {
  return `/api/proxy?api=${encodeURIComponent(path)}`;
}

function proxyImage(url) {
  if (!url || url.startsWith('/api/')) return url;
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

// Simple in-memory cache: key → { data, ts }
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

// Rate-limiter: max 5 requests per second
const requestTimestamps = [];
function waitForRateLimit() {
  const now = Date.now();
  // prune old timestamps
  while (requestTimestamps.length && requestTimestamps[0] < now - 1000) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= 5) {
    const wait = requestTimestamps[0] + 1000 - now + 10;
    return new Promise((r) => setTimeout(r, wait));
  }
  return Promise.resolve();
}

async function apiFetch(path, skipCache = false) {
  const cacheKey = path;
  if (!skipCache && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (Date.now() - cached.ts < CACHE_TTL) return cached.data;
  }
  await waitForRateLimit();
  requestTimestamps.push(Date.now());
  const res = await fetch(proxyApi(path));
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  if (!skipCache) {
    apiCache.set(cacheKey, { data: json, ts: Date.now() });
  }
  return json;
}

// ── Helpers ──────────────────────────────────────────────

function getMangaTitle(manga) {
  const t = manga.attributes?.title;
  if (!t) return 'Untitled';
  return t.en || t['ja-ro'] || t.ja || Object.values(t)[0] || 'Untitled';
}

function getMangaDescription(manga) {
  const d = manga.attributes?.description;
  if (!d) return '';
  return d.en || d['ja-ro'] || Object.values(d)[0] || '';
}

function getMangaCover(manga) {
  const coverRel = manga.relationships?.find((r) => r.type === 'cover_art');
  if (!coverRel?.attributes?.fileName) return null;
  return proxyImage(`${IMG_CDN}/covers/${manga.id}/${coverRel.attributes.fileName}.256.jpg`);
}

function getMangaCoverHQ(manga) {
  const coverRel = manga.relationships?.find((r) => r.type === 'cover_art');
  if (!coverRel?.attributes?.fileName) return null;
  return proxyImage(`${IMG_CDN}/covers/${manga.id}/${coverRel.attributes.fileName}.512.jpg`);
}

function getMangaAuthor(manga) {
  const authorRel = manga.relationships?.find((r) => r.type === 'author');
  return authorRel?.attributes?.name || 'Unknown';
}

function getMangaTags(manga) {
  return (manga.attributes?.tags || []).map((t) => t.attributes?.name?.en).filter(Boolean);
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

function useMangaFetch(endpoint, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!endpoint) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetch(endpoint);
      if (mountedRef.current) setData(json);
    } catch (err) {
      if (mountedRef.current) setError(err.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData]);

  return { data, loading, error, retry: fetchData };
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

// ── Skeleton Cards ──────────────────────────────────────

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

// ── Error State ─────────────────────────────────────────

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

// ── Manga Card ──────────────────────────────────────────

function MangaCard({ manga, isInLibrary, progress, category, onClick }) {
  const title = getMangaTitle(manga);
  const cover = getMangaCover(manga);
  const author = getMangaAuthor(manga);
  const status = manga.attributes?.status;
  const lastChapter = progress?.lastChapter;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl bg-zinc-900/60 border border-zinc-800/60 overflow-hidden hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
    >
      {/* Cover */}
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
        {/* Status badge */}
        {status && (
          <div className="absolute top-2 right-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status] || 'bg-zinc-700/50 text-zinc-300 border-zinc-600'}`}>
              {status}
            </span>
          </div>
        )}
        {/* Library indicator */}
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
      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-[var(--color-accent-light)] transition-colors">
          {title}
        </h3>
        <p className="text-[11px] text-zinc-500 truncate">{author}</p>
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
  const [activeTab, setActiveTab] = useState('popular'); // popular | latest | library
  const [offset, setOffset] = useState(0);
  const [allManga, setAllManga] = useState([]);
  const debouncedSearch = useDebounce(searchInput, 300);
  const scrollRef = useRef(null);
  const lastAccumulatedRef = useRef(null);

  const isSearching = debouncedSearch.trim().length > 0;

  const buildEndpoint = useCallback(() => {
    const base = '/manga?limit=20&includes[]=cover_art&includes[]=author&contentRating[]=safe&contentRating[]=suggestive';
    if (isSearching) {
      return `${base}&title=${encodeURIComponent(debouncedSearch.trim())}&offset=${offset}&order[relevance]=desc`;
    }
    if (activeTab === 'latest') {
      return `${base}&offset=${offset}&order[latestUploadedChapter]=desc`;
    }
    // popular
    return `${base}&offset=${offset}&order[followedCount]=desc`;
  }, [debouncedSearch, isSearching, activeTab, offset]);

  const endpoint = activeTab === 'library' ? null : buildEndpoint();
  const { data, loading, error, retry } = useMangaFetch(endpoint, [endpoint]);

  // Accumulate results across pages
  useEffect(() => {
    if (data?.data && data !== lastAccumulatedRef.current) {
      lastAccumulatedRef.current = data;
      if (offset === 0) {
        setAllManga(data.data);
      } else {
        setAllManga((prev) => [...prev, ...data.data]);
      }
    }
  }, [data, offset]);

  // Reset when search/tab changes
  useEffect(() => {
    setOffset(0);
    setAllManga([]);
    lastAccumulatedRef.current = null;
  }, [debouncedSearch, activeTab]);

  const hasMore = data ? offset + 20 < data.total : false;

  const loadMore = () => {
    setOffset((o) => o + 20);
  };

  // Build library manga list from stored IDs
  const libraryIds = Object.keys(library);
  const libraryEndpoint = libraryIds.length > 0 && activeTab === 'library'
    ? `/manga?limit=100&includes[]=cover_art&includes[]=author&${libraryIds.map((id) => `ids[]=${id}`).join('&')}`
    : null;
  const { data: libraryData, loading: libraryLoading, error: libraryError, retry: libraryRetry } = useMangaFetch(libraryEndpoint, [libraryEndpoint]);

  const tabs = [
    { id: 'popular', label: 'Popular', icon: Star },
    { id: 'latest', label: 'Latest', icon: Clock },
    { id: 'library', label: 'Library', icon: Heart },
  ];

  const displayManga = activeTab === 'library' ? (libraryData?.data || []) : allManga;
  const isLoading = activeTab === 'library' ? libraryLoading : loading;
  const currentError = activeTab === 'library' ? libraryError : error;
  const currentRetry = activeTab === 'library' ? libraryRetry : retry;

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 sm:px-5 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
            <BookOpen size={18} className="text-[var(--color-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">Manga Reader</h1>
            <p className="text-[11px] text-zinc-500">{libraryIds.length} saved · Powered by MangaDex</p>
          </div>
        </div>

        {/* Search */}
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

        {/* Tabs */}
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

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {isSearching && searchInput !== debouncedSearch && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="text-zinc-500 animate-spin" />
          </div>
        )}

        {currentError && <ErrorState message={currentError} onRetry={currentRetry} />}

        {!currentError && activeTab === 'library' && libraryIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Heart size={40} className="text-zinc-700" />
            <p className="text-zinc-500 text-sm">Your library is empty</p>
            <p className="text-zinc-600 text-xs">Save manga to access them quickly</p>
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
            {/* Load more */}
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
  const status = manga.attributes?.status;
  const tags = getMangaTags(manga);
  const isInLibrary = !!library[manga.id];
  const mangaProgress = progress[manga.id];
  const currentCategory = library[manga.id]?.category || '';

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Fetch chapters
  const chaptersEndpoint = `/manga/${manga.id}/feed?limit=500&offset=0&translatedLanguage[]=en&order[chapter]=asc&includes[]=scanlation_group&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica`;
  const { data: chaptersData, loading: chapLoading, error: chapError, retry: chapRetry } = useMangaFetch(chaptersEndpoint);

  const chapters = useMemo(() => {
    if (!chaptersData?.data) return [];
    // Deduplicate by chapter number, keep first
    const seen = new Map();
    for (const ch of chaptersData.data) {
      const num = ch.attributes?.chapter;
      const key = num || ch.id;
      if (!seen.has(key)) seen.set(key, ch);
    }
    return Array.from(seen.values());
  }, [chaptersData]);

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
    // Return next chapter if current was completed, or current
    if (idx >= 0 && idx < chapters.length - 1) return idx + 1;
    return idx;
  }, [mangaProgress, chapters]);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      {/* Header with cover */}
      <div className="shrink-0 border-b border-zinc-800">
        <div className="flex items-start gap-4 p-4 sm:p-5">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors mt-1 shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          {/* Cover */}
          <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-lg overflow-hidden shrink-0 shadow-lg bg-zinc-800">
            {cover ? (
              <img src={cover} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={24} className="text-zinc-600" />
              </div>
            )}
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 line-clamp-2">{title}</h2>
            <p className="text-xs text-zinc-400">{author}</p>
            <div className="flex flex-wrap gap-1.5">
              {status && (
                <span className={`text-xs px-2 py-0.5 rounded border capitalize ${STATUS_STYLES[status] || 'bg-zinc-700/50 text-zinc-300 border-zinc-600'}`}>
                  {status}
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
            {/* Actions */}
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
        {/* Description */}
        {description && (
          <div className="px-4 sm:px-5 pb-4">
            <p className="text-xs text-zinc-400 line-clamp-4 leading-relaxed">{description}</p>
          </div>
        )}
      </div>

      {/* Continue reading */}
      {continueChapterIndex >= 0 && (
        <div className="shrink-0 px-4 sm:px-5 pt-4">
          <button
            onClick={() => onReadChapter(chapters[continueChapterIndex], chapters)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-medium text-sm transition-colors"
          >
            <BookOpen size={16} />
            Continue Ch. {chapters[continueChapterIndex].attributes?.chapter || '?'}
          </button>
        </div>
      )}

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 sm:px-5 py-3">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">
            Chapters {!chapLoading && `(${chapters.length})`}
          </h3>

          {chapLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-zinc-500 animate-spin" />
            </div>
          )}

          {chapError && <ErrorState message={chapError} onRetry={chapRetry} />}

          {!chapLoading && !chapError && chapters.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500 text-sm">No English chapters available</p>
            </div>
          )}

          <div className="space-y-1">
            {chapters.map((ch) => {
              const chNum = ch.attributes?.chapter;
              const chTitle = ch.attributes?.title;
              const pages = ch.attributes?.pages;
              const isRead = mangaProgress?.readChapters?.[ch.id];
              const groupRel = ch.relationships?.find((r) => r.type === 'scanlation_group');
              const groupName = groupRel?.attributes?.name;

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
                    {groupName && (
                      <span className="text-[10px] text-zinc-600 block truncate">{groupName}</span>
                    )}
                  </div>
                  {pages && (
                    <span className="text-[10px] text-zinc-600 shrink-0">{pages}p</span>
                  )}
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
  const chNum = chapter.attributes?.chapter;
  const isPager = readingMode === 'pager';

  // Find current index in chapters array for navigation
  const currentIndex = useMemo(
    () => chapters.findIndex((ch) => ch.id === chapter.id),
    [chapters, chapter.id]
  );
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  // Fetch page URLs via at-home API
  useEffect(() => {
    let cancelled = false;
    async function fetchPages() {
      setLoading(true);
      setError(null);
      setPageUrls([]);
      setLoadedImages(new Set());
      try {
        const json = await apiFetch(`/at-home/server/${chapter.id}`, true);
        if (cancelled) return;
        if (json.result === 'error' || !json.chapter) {
          throw new Error(json.errors?.[0]?.detail || 'At-home server returned an error');
        }
        const { baseUrl, chapter: chData } = json;
        if (!baseUrl || (!chData?.data?.length && !chData?.dataSaver?.length)) {
          throw new Error('No page data available for this chapter');
        }
        const useSaver = chData.dataSaver?.length > 0;
        const quality = useSaver ? 'data-saver' : 'data';
        const filenames = useSaver ? chData.dataSaver : chData.data;
        const urls = filenames.map(
          (filename) => `${baseUrl}/${quality}/${chData.hash}/${filename}`
        );
        setPageUrls(urls);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPages();
    return () => { cancelled = true; };
  }, [chapter.id]);

  // Scroll to top / reset pager when chapter changes
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    setPagerIndex(0);
  }, [chapter.id]);

  // Mark chapter as read
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
    apiFetch(`/at-home/server/${chapter.id}`, true)
      .then((json) => {
        if (json.result === 'error' || !json.chapter) {
          throw new Error(json.errors?.[0]?.detail || 'At-home server returned an error');
        }
        const { baseUrl, chapter: chData } = json;
        if (!baseUrl || (!chData?.data?.length && !chData?.dataSaver?.length)) {
          throw new Error('No page data available for this chapter');
        }
        const useSaver = chData.dataSaver?.length > 0;
        const quality = useSaver ? 'data-saver' : 'data';
        const filenames = useSaver ? chData.dataSaver : chData.data;
        const urls = filenames.map(
          (filename) => `${baseUrl}/${quality}/${chData.hash}/${filename}`
        );
        setPageUrls(urls);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [chapter.id]);

  // Pager keyboard navigation
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
      {/* Reader header */}
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

      {/* Pages — Pager mode */}
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
                  src={proxyImage(pageUrls[pagerIndex])}
                  alt={`Page ${pagerIndex + 1}`}
                  className="max-h-full max-w-full object-contain"
                  onLoad={() => handleImageLoad(pagerIndex)}
                  onError={(e) => {
                    if (!e.target.dataset.retried) {
                      e.target.dataset.retried = 'true';
                      e.target.src = proxyImage(pageUrls[pagerIndex].replace('/data-saver/', '/data/'));
                    }
                  }}
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
      /* Pages — Webtoon mode (vertical scroll) */
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
                {/* Loading spinner per page */}
                {!loadedImages.has(i) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10 min-h-[200px]">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={20} className="text-zinc-500 animate-spin" />
                      <span className="text-[10px] text-zinc-600">{i + 1} / {pageUrls.length}</span>
                    </div>
                  </div>
                )}
                <img
                  src={proxyImage(url)}
                  alt={`Page ${i + 1}`}
                  loading="lazy"
                  className="w-full h-auto block"
                  onLoad={() => handleImageLoad(i)}
                  onError={(e) => {
                    if (!e.target.dataset.retried) {
                      e.target.dataset.retried = 'true';
                      e.target.src = proxyImage(url.replace('/data-saver/', '/data/'));
                    }
                  }}
                />
              </div>
            ))}

            {/* Chapter end navigation */}
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
  // Views: 'browse' | 'detail' | 'reader'
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

  // ── Navigation callbacks ───────────────────────────────

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

  // ── Render ─────────────────────────────────────────────

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
