import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Trash2, FileText, Search, Edit3, Eye, Clock } from 'lucide-react';
import Markdown from 'react-markdown';
import { useLocalStorage } from '../hooks/useLocalStorage';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const STARTER_CONTENT = `# Welcome to Notes
Start writing your thoughts here...

## Markdown Supported
- **Bold**, *italic*, ~~strikethrough~~
- Lists, headings, code blocks
- And much more!
`;

function extractTitle(content) {
  if (!content || !content.trim()) return 'Untitled Note';
  const lines = content.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const headingMatch = trimmed.match(/^#+\s+(.+)/);
    if (headingMatch) return headingMatch[1].trim();
    return trimmed.slice(0, 60);
  }
  return 'Untitled Note';
}

function extractPreview(content) {
  if (!content || !content.trim()) return 'Empty note';
  const lines = content.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^#+\s+/.test(trimmed)) continue;
    const clean = trimmed.replace(/[*_~`#>\-[\]()!]/g, '').trim();
    if (clean) return clean.slice(0, 80);
  }
  return 'Empty note';
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotesApp() {
  const [notes, setNotes] = useLocalStorage('yp-notes-data', []);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const saveTimerRef = useRef(null);
  const textareaRef = useRef(null);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) || null,
    [notes, selectedId]
  );

  // Sync editor content when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setEditorContent(selectedNote.content);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter((n) => {
      const title = extractTitle(n.content).toLowerCase();
      return title.includes(q) || n.content.toLowerCase().includes(q);
    });
  }, [notes, searchQuery]);

  const saveNote = useCallback(
    (content) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === selectedId
            ? { ...n, content, title: extractTitle(content), updatedAt: Date.now() }
            : n
        )
      );
    },
    [selectedId, setNotes]
  );

  const handleContentChange = useCallback(
    (e) => {
      const val = e.target.value;
      setEditorContent(val);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveNote(val), 500);
    },
    [saveNote]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const createNote = useCallback(() => {
    const newNote = {
      id: generateId(),
      title: 'Welcome to Notes',
      content: STARTER_CONTENT,
      updatedAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(newNote.id);
    setEditorContent(newNote.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [setNotes]);

  const deleteNote = useCallback(
    (id, e) => {
      e.stopPropagation();
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setEditorContent('');
      }
    },
    [selectedId, setNotes]
  );

  const selectNote = useCallback((note) => {
    // Flush any pending save before switching
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSelectedId(note.id);
    setEditorContent(note.content);
  }, []);

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-300 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur shrink-0">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors lg:hidden"
        >
          <FileText size={18} />
        </button>
        <div className="flex items-center gap-2 text-zinc-100">
          <FileText size={20} className="text-[var(--color-accent)]" />
          <h1 className="text-lg font-semibold tracking-tight">Notes</h1>
        </div>
        <span className="text-xs text-zinc-500 font-mono">{notes.length} notes</span>
        <div className="flex-1" />
        {selectedNote && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
            <Clock size={12} />
            <span>{formatDate(selectedNote.updatedAt)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? 'w-72 xl:w-80' : 'w-0'
          } shrink-0 border-r border-zinc-800 bg-zinc-925 flex flex-col transition-all duration-200 overflow-hidden`}
        >
          {/* Search & New */}
          <div className="p-3 space-y-2 shrink-0">
            <button
              onClick={createNote}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              New Note
            </button>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-[var(--color-accent)]/50 focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-all"
              />
            </div>
          </div>

          {/* Note List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {filteredNotes.length === 0 && searchQuery && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No notes match &ldquo;{searchQuery}&rdquo;
              </div>
            )}
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                  selectedId === note.id
                    ? 'bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/30 text-zinc-100'
                    : 'hover:bg-zinc-800/50 border border-transparent text-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate leading-snug">
                      {extractTitle(note.content)}
                    </div>
                    <div className="text-xs text-zinc-500 truncate mt-0.5">
                      {extractPreview(note.content)}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                      <Clock size={10} />
                      {formatDate(note.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteNote(note.id, e)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 transition-all shrink-0 mt-0.5"
                    title="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedNote ? (
            <>
              {/* Editor Toolbar */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors hidden lg:block"
                  title="Toggle sidebar"
                >
                  <FileText size={16} />
                </button>
                <div className="flex-1" />
                <div className="flex items-center bg-zinc-800/60 rounded-lg p-0.5 border border-zinc-700/40">
                  <button
                    onClick={() => setShowPreview(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      !showPreview
                        ? 'bg-[var(--color-accent)] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Edit3 size={13} />
                    Editor
                  </button>
                  <button
                    onClick={() => setShowPreview(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      showPreview
                        ? 'bg-[var(--color-accent)] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Eye size={13} />
                    Split
                  </button>
                </div>
              </div>

              {/* Dual Pane */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Editor */}
                <div
                  className={`${
                    showPreview ? 'w-1/2 border-r border-zinc-800' : 'w-full'
                  } flex flex-col min-h-0`}
                >
                  <textarea
                    ref={textareaRef}
                    value={editorContent}
                    onChange={handleContentChange}
                    spellCheck={false}
                    className="flex-1 w-full resize-none bg-zinc-950 text-zinc-200 font-mono text-sm leading-relaxed p-5 outline-none placeholder-zinc-600 overflow-y-auto"
                    placeholder="Start writing... (Markdown supported)"
                  />
                </div>

                {/* Preview */}
                {showPreview && (
                  <div className="w-1/2 overflow-y-auto bg-zinc-900/30">
                    <div className="p-5 max-w-none">
                      <div className="markdown-body">
                        <Markdown>{editorContent}</Markdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4 animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center mx-auto">
                  <FileText size={36} className="text-zinc-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-zinc-300 mb-1">
                    {notes.length === 0 ? 'No Notes Yet' : 'Select a Note'}
                  </h2>
                  <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                    {notes.length === 0
                      ? 'Create your first note to start capturing ideas with full Markdown support.'
                      : 'Choose a note from the sidebar to view and edit.'}
                  </p>
                </div>
                {notes.length === 0 && (
                  <button
                    onClick={createNote}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-medium text-sm transition-colors"
                  >
                    <Plus size={16} />
                    Create First Note
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
