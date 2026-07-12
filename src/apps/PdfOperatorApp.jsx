import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FileText, Layers, Scissors, Minimize2, Image, Upload, Download,
  Plus, Trash2, GripVertical, ArrowLeft, ChevronRight, Check, X,
  Loader2, File, RotateCcw, ZoomIn, Move, RefreshCw, ChevronDown,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/* ────────────────────────────────────────────────────────
   Constants & Helpers
   ──────────────────────────────────────────────────────── */

const TOOLS = [
  {
    id: 'merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into a single document',
    icon: Layers,
    color: '#6d5dfc',
    gradient: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Extract or split pages from a PDF file',
    icon: Scissors,
    color: '#f97316',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Reduce file size by stripping metadata',
    icon: Minimize2,
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'pdf-to-images',
    name: 'PDF to Images',
    description: 'Export PDF pages as PNG images',
    icon: Image,
    color: '#3b82f6',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'images-to-pdf',
    name: 'Images to PDF',
    description: 'Convert images into a PDF document',
    icon: FileText,
    color: '#ec4899',
    gradient: 'from-pink-500 to-rose-500',
  },
];

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function downloadBlob(bytes, filename) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function renderPageThumbnail(pdfBytes, pageNum, scale = 0.4) {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/png');
    pdf.destroy();
    return dataUrl;
  } catch {
    return null;
  }
}

async function renderPageHighRes(pdfBytes, pageNum, scale = 2.0) {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes.slice(0) }).promise;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/png');
  pdf.destroy();
  return dataUrl;
}

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ────────────────────────────────────────────────────────
   Drop Zone Component
   ──────────────────────────────────────────────────────── */

function DropZone({ onFiles, accept = '.pdf', multiple = false, label, sublabel }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(multiple ? files : [files[0]]);
  }, [onFiles, multiple]);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDrag}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center gap-3 p-8 sm:p-12 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
        dragging
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 scale-[1.01]'
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/60'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
        dragging ? 'bg-[var(--color-accent)]/20' : 'bg-zinc-800'
      }`}>
        <Upload size={24} className={dragging ? 'text-[var(--color-accent-light)]' : 'text-zinc-400'} />
      </div>
      <div className="text-center">
        <p className={`text-sm font-medium ${dragging ? 'text-[var(--color-accent-light)]' : 'text-zinc-300'}`}>
          {label || 'Drop files here or click to browse'}
        </p>
        {sublabel && <p className="text-xs text-zinc-500 mt-1">{sublabel}</p>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Progress Bar Component
   ──────────────────────────────────────────────────────── */

function ProgressBar({ progress, label }) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">{label}</span>
          <span className="text-zinc-500 font-mono">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-light)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   Tool Header Component
   ──────────────────────────────────────────────────────── */

function ToolHeader({ tool, onBack }) {
  const Icon = tool.icon;
  return (
    <div className="shrink-0 border-b border-zinc-800 px-4 sm:px-6 py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">{tool.name}</h2>
          <p className="text-xs text-zinc-500">{tool.description}</p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   MERGE TOOL
   ──────────────────────────────────────────────────────── */

function MergeTool({ onBack }) {
  const tool = TOOLS.find((t) => t.id === 'merge');
  const [files, setFiles] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragIdx, setDragIdx] = useState(null);

  const handleFiles = useCallback(async (newFiles) => {
    const pdfFiles = newFiles.filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    const entries = [];
    for (const file of pdfFiles) {
      const bytes = await readFileAsArrayBuffer(file);
      const id = crypto.randomUUID();
      entries.push({ id, name: file.name, bytes, size: file.size });
    }
    setFiles((prev) => [...prev, ...entries]);

    for (const entry of entries) {
      const thumb = await renderPageThumbnail(entry.bytes, 1);
      setThumbnails((prev) => ({ ...prev, [entry.id]: thumb }));
    }
  }, []);

  const removeFile = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setThumbnails((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, []);

  const handleDragStart = (idx) => setDragIdx(idx);

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setFiles((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(dragIdx, 1);
      copy.splice(idx, 0, item);
      return copy;
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setProgress(0);
    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const doc = await PDFDocument.load(files[i].bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((page) => merged.addPage(page));
        setProgress(((i + 1) / files.length) * 90);
      }
      const mergedBytes = await merged.save();
      setProgress(100);
      downloadBlob(mergedBytes, 'merged.pdf');
    } catch (err) {
      console.error('Merge failed:', err);
    } finally {
      setTimeout(() => setProcessing(false), 500);
    }
  }, [files]);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <ToolHeader tool={tool} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <DropZone
          onFiles={handleFiles}
          accept=".pdf"
          multiple
          label="Drop PDF files here or click to browse"
          sublabel="You can add multiple PDFs at once"
        />

        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">
                {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(files.reduce((s, f) => s + f.size, 0))}
              </h3>
              <button
                onClick={() => { setFiles([]); setThumbnails({}); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> Clear all
              </button>
            </div>

            <div className="space-y-1.5">
              {files.map((file, idx) => (
                <div
                  key={file.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`card flex items-center gap-3 p-3 cursor-move group ${
                    dragIdx === idx ? 'opacity-50 scale-[0.98]' : ''
                  }`}
                >
                  <GripVertical size={16} className="text-zinc-600 shrink-0" />
                  <div className="w-10 h-14 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {thumbnails[file.id] ? (
                      <img src={thumbnails[file.id]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <File size={16} className="text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                  </div>
                  <span className="text-xs text-zinc-600 font-mono shrink-0">#{idx + 1}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/15 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {processing && <ProgressBar progress={progress} label="Merging PDFs..." />}

        {files.length >= 2 && !processing && (
          <button
            onClick={handleMerge}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-medium text-sm transition-colors"
          >
            <Layers size={16} />
            Merge {files.length} PDFs
          </button>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   SPLIT TOOL
   ──────────────────────────────────────────────────────── */

function SplitTool({ onBack }) {
  const tool = TOOLS.find((t) => t.id === 'split');
  const [fileData, setFileData] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('extract'); // 'extract' | 'individual'

  const handleFile = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setSelected(new Set());
    try {
      const bytes = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      setFileData({ name: file.name, bytes, size: file.size });
      setPageCount(count);

      const thumbs = [];
      for (let i = 1; i <= Math.min(count, 50); i++) {
        const thumb = await renderPageThumbnail(bytes, i, 0.3);
        thumbs.push(thumb);
      }
      setPageThumbs(thumbs);
    } catch (err) {
      console.error('Failed to load PDF:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePage = useCallback((idx) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(idx)) copy.delete(idx);
      else copy.add(idx);
      return copy;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  }, [pageCount]);

  const selectNone = useCallback(() => setSelected(new Set()), []);

  const handleExtract = useCallback(async () => {
    if (!fileData || selected.size === 0) return;
    setProcessing(true);
    setProgress(0);
    try {
      const sourceDoc = await PDFDocument.load(fileData.bytes);
      const newDoc = await PDFDocument.create();
      const indices = Array.from(selected).sort((a, b) => a - b);
      const pages = await newDoc.copyPages(sourceDoc, indices);
      pages.forEach((page) => newDoc.addPage(page));
      setProgress(80);
      const newBytes = await newDoc.save();
      setProgress(100);
      downloadBlob(newBytes, `extracted_pages.pdf`);
    } catch (err) {
      console.error('Extract failed:', err);
    } finally {
      setTimeout(() => setProcessing(false), 500);
    }
  }, [fileData, selected]);

  const handleSplitIndividual = useCallback(async () => {
    if (!fileData) return;
    setProcessing(true);
    setProgress(0);
    try {
      const sourceDoc = await PDFDocument.load(fileData.bytes);
      const indices = selected.size > 0
        ? Array.from(selected).sort((a, b) => a - b)
        : Array.from({ length: pageCount }, (_, i) => i);

      for (let i = 0; i < indices.length; i++) {
        const newDoc = await PDFDocument.create();
        const [page] = await newDoc.copyPages(sourceDoc, [indices[i]]);
        newDoc.addPage(page);
        const newBytes = await newDoc.save();
        downloadBlob(newBytes, `page_${indices[i] + 1}.pdf`);
        setProgress(((i + 1) / indices.length) * 100);
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch (err) {
      console.error('Split failed:', err);
    } finally {
      setTimeout(() => setProcessing(false), 500);
    }
  }, [fileData, selected, pageCount]);

  const handleReset = useCallback(() => {
    setFileData(null);
    setPageCount(0);
    setPageThumbs([]);
    setSelected(new Set());
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <ToolHeader tool={tool} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {!fileData ? (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={32} className="text-[var(--color-accent)] animate-spin" />
                <p className="text-sm text-zinc-400">Loading PDF...</p>
              </div>
            ) : (
              <DropZone
                onFiles={handleFile}
                accept=".pdf"
                label="Drop a PDF file here"
                sublabel="The pages will be shown for selection"
              />
            )}
          </>
        ) : (
          <>
            {/* File info + controls */}
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <File size={18} className="text-[var(--color-accent)] shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{fileData.name}</p>
                  <p className="text-xs text-zinc-500">{pageCount} pages · {formatBytes(fileData.size)}</p>
                </div>
              </div>
              <button onClick={handleReset} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Selection controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                Select all
              </button>
              <button onClick={selectNone} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                Select none
              </button>
              <span className="text-xs text-zinc-500 ml-auto">
                {selected.size} of {pageCount} selected
              </span>
            </div>

            {/* Page thumbnails grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {pageThumbs.map((thumb, idx) => (
                <button
                  key={idx}
                  onClick={() => togglePage(idx)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                    selected.has(idx)
                      ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30 scale-[1.02]'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="aspect-[3/4] bg-zinc-900 flex items-center justify-center">
                    {thumb ? (
                      <img src={thumb} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" />
                    ) : (
                      <FileText size={16} className="text-zinc-700" />
                    )}
                  </div>
                  <div className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[10px] font-medium ${
                    selected.has(idx)
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-zinc-900/80 text-zinc-400'
                  }`}>
                    {idx + 1}
                  </div>
                  {selected.has(idx) && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
              {pageCount > 50 && (
                <div className="col-span-full text-center text-xs text-zinc-600 py-2">
                  Showing first 50 of {pageCount} pages
                </div>
              )}
            </div>

            {/* Mode selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('extract')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'extract'
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40'
                }`}
              >
                Extract as one PDF
              </button>
              <button
                onClick={() => setMode('individual')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'individual'
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40'
                }`}
              >
                Split into individual PDFs
              </button>
            </div>

            {processing && <ProgressBar progress={progress} label={mode === 'extract' ? 'Extracting pages...' : 'Splitting pages...'} />}

            {!processing && (
              <button
                onClick={mode === 'extract' ? handleExtract : handleSplitIndividual}
                disabled={mode === 'extract' && selected.size === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] text-white font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Scissors size={16} />
                {mode === 'extract'
                  ? `Extract ${selected.size} page${selected.size !== 1 ? 's' : ''}`
                  : `Split ${selected.size > 0 ? selected.size : pageCount} page${(selected.size > 0 ? selected.size : pageCount) !== 1 ? 's' : ''}`
                }
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   COMPRESS TOOL
   ──────────────────────────────────────────────────────── */

function CompressTool({ onBack }) {
  const tool = TOOLS.find((t) => t.id === 'compress');
  const [fileData, setFileData] = useState(null);
  const [result, setResult] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    const bytes = await readFileAsArrayBuffer(file);
    setFileData({ name: file.name, bytes, size: file.size });
    setResult(null);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!fileData) return;
    setProcessing(true);
    setProgress(0);
    try {
      setProgress(20);
      const doc = await PDFDocument.load(fileData.bytes, { updateMetadata: false });
      setProgress(40);
      doc.setTitle('');
      doc.setAuthor('');
      doc.setSubject('');
      doc.setKeywords([]);
      doc.setProducer('');
      doc.setCreator('');
      setProgress(60);
      const compressed = await doc.save({ useObjectStreams: true });
      setProgress(100);
      const savings = fileData.size - compressed.length;
      const pct = ((savings / fileData.size) * 100).toFixed(1);
      setResult({
        bytes: compressed,
        size: compressed.length,
        savings,
        pct: parseFloat(pct),
      });
    } catch (err) {
      console.error('Compress failed:', err);
    } finally {
      setTimeout(() => setProcessing(false), 300);
    }
  }, [fileData]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const name = fileData.name.replace(/\.pdf$/i, '') + '_compressed.pdf';
    downloadBlob(result.bytes, name);
  }, [result, fileData]);

  const handleReset = useCallback(() => {
    setFileData(null);
    setResult(null);
    setProgress(0);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <ToolHeader tool={tool} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {!fileData ? (
          <DropZone
            onFiles={handleFile}
            accept=".pdf"
            label="Drop a PDF file to compress"
            sublabel="Metadata will be stripped and objects optimized"
          />
        ) : (
          <>
            {/* File card */}
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <File size={18} className="text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{fileData.name}</p>
                  <p className="text-xs text-zinc-500">Original size: {formatBytes(fileData.size)}</p>
                </div>
              </div>
              <button onClick={handleReset} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            {processing && <ProgressBar progress={progress} label="Compressing..." />}

            {!result && !processing && (
              <button
                onClick={handleCompress}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
              >
                <Minimize2 size={16} />
                Compress PDF
              </button>
            )}

            {result && (
              <div className="space-y-4 animate-fade-in">
                {/* Results card */}
                <div className="card p-5 space-y-4">
                  <h3 className="text-sm font-medium text-zinc-200">Compression Results</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-zinc-800/60">
                      <p className="text-xs text-zinc-500 mb-1">Original</p>
                      <p className="text-sm font-bold text-zinc-200">{formatBytes(fileData.size)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-800/60">
                      <p className="text-xs text-zinc-500 mb-1">Compressed</p>
                      <p className="text-sm font-bold text-emerald-400">{formatBytes(result.size)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-zinc-800/60">
                      <p className="text-xs text-zinc-500 mb-1">Saved</p>
                      <p className={`text-sm font-bold ${result.savings > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {result.savings > 0 ? `${result.pct}%` : '0%'}
                      </p>
                    </div>
                  </div>

                  {/* Visual bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Compressed</span>
                      <span>{formatBytes(result.size)} / {formatBytes(fileData.size)}</span>
                    </div>
                    <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                        style={{ width: `${(result.size / fileData.size) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
                >
                  <Download size={16} />
                  Download Compressed PDF
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   PDF TO IMAGES TOOL
   ──────────────────────────────────────────────────────── */

function PdfToImagesTool({ onBack }) {
  const tool = TOOLS.find((t) => t.id === 'pdf-to-images');
  const [fileData, setFileData] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageThumbs, setPageThumbs] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [scale, setScale] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scaleOpen, setScaleOpen] = useState(false);

  const scaleOptions = [
    { value: 1, label: '1x (72 DPI)' },
    { value: 1.5, label: '1.5x (108 DPI)' },
    { value: 2, label: '2x (144 DPI)' },
    { value: 3, label: '3x (216 DPI)' },
  ];

  const handleFile = useCallback(async (files) => {
    const file = files[0];
    if (!file) return;
    setLoading(true);
    setSelected(new Set());
    setResults([]);
    try {
      const bytes = await readFileAsArrayBuffer(file);
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      setFileData({ name: file.name, bytes, size: file.size });
      setPageCount(count);

      const thumbs = [];
      for (let i = 1; i <= Math.min(count, 50); i++) {
        const thumb = await renderPageThumbnail(bytes, i, 0.3);
        thumbs.push(thumb);
      }
      setPageThumbs(thumbs);
    } catch (err) {
      console.error('Failed to load PDF:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePage = useCallback((idx) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(idx)) copy.delete(idx);
      else copy.add(idx);
      return copy;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(Array.from({ length: pageCount }, (_, i) => i)));
  }, [pageCount]);

  const handleConvert = useCallback(async () => {
    if (!fileData) return;
    setProcessing(true);
    setProgress(0);
    setResults([]);
    try {
      const indices = selected.size > 0
        ? Array.from(selected).sort((a, b) => a - b)
        : Array.from({ length: pageCount }, (_, i) => i);

      const images = [];
      for (let i = 0; i < indices.length; i++) {
        const dataUrl = await renderPageHighRes(fileData.bytes, indices[i] + 1, scale);
        images.push({ page: indices[i] + 1, dataUrl });
        setProgress(((i + 1) / indices.length) * 100);
      }
      setResults(images);
    } catch (err) {
      console.error('Convert failed:', err);
    } finally {
      setTimeout(() => setProcessing(false), 300);
    }
  }, [fileData, selected, pageCount, scale]);

  const handleReset = useCallback(() => {
    setFileData(null);
    setPageCount(0);
    setPageThumbs([]);
    setSelected(new Set());
    setResults([]);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <ToolHeader tool={tool} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {!fileData ? (
          loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="text-[var(--color-accent)] animate-spin" />
              <p className="text-sm text-zinc-400">Loading PDF...</p>
            </div>
          ) : (
            <DropZone
              onFiles={handleFile}
              accept=".pdf"
              label="Drop a PDF to convert to images"
              sublabel="Pages will be exported as PNG"
            />
          )
        ) : (
          <>
            <div className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <File size={18} className="text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{fileData.name}</p>
                  <p className="text-xs text-zinc-500">{pageCount} pages</p>
                </div>
              </div>
              <button onClick={handleReset} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={selectAll} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                Select all
              </button>
              <button onClick={() => setSelected(new Set())} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
                Select none
              </button>

              {/* Scale dropdown */}
              <div className="relative ml-auto">
                <button
                  onClick={() => setScaleOpen(!scaleOpen)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                >
                  <ZoomIn size={12} />
                  {scaleOptions.find((o) => o.value === scale)?.label}
                  <ChevronDown size={12} />
                </button>
                {scaleOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg py-1 z-10 min-w-[140px] shadow-xl animate-scale-in">
                    {scaleOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setScale(opt.value); setScaleOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                          scale === opt.value ? 'text-[var(--color-accent-light)] bg-[var(--color-accent)]/10' : 'text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-xs text-zinc-500">
                {selected.size > 0 ? `${selected.size} selected` : 'All pages'}
              </span>
            </div>

            {/* Page grid */}
            {results.length === 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {pageThumbs.map((thumb, idx) => (
                  <button
                    key={idx}
                    onClick={() => togglePage(idx)}
                    className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                      selected.has(idx)
                        ? 'border-blue-500 ring-2 ring-blue-500/30 scale-[1.02]'
                        : 'border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-zinc-900 flex items-center justify-center">
                      {thumb ? (
                        <img src={thumb} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" />
                      ) : (
                        <FileText size={16} className="text-zinc-700" />
                      )}
                    </div>
                    <div className={`absolute bottom-0 inset-x-0 text-center py-0.5 text-[10px] font-medium ${
                      selected.has(idx) ? 'bg-blue-500 text-white' : 'bg-zinc-900/80 text-zinc-400'
                    }`}>
                      {idx + 1}
                    </div>
                    {selected.has(idx) && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {processing && <ProgressBar progress={progress} label="Rendering pages..." />}

            {!processing && results.length === 0 && (
              <button
                onClick={handleConvert}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
              >
                <Image size={16} />
                Convert {selected.size > 0 ? selected.size : pageCount} page{(selected.size > 0 ? selected.size : pageCount) !== 1 ? 's' : ''} to PNG
              </button>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-200">{results.length} images ready</h3>
                  <button
                    onClick={() => setResults([])}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} /> Back to selection
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {results.map((img) => (
                    <div key={img.page} className="card overflow-hidden group">
                      <div className="aspect-[3/4] bg-zinc-900 overflow-hidden">
                        <img src={img.dataUrl} alt={`Page ${img.page}`} className="w-full h-full object-contain" />
                      </div>
                      <div className="p-2 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Page {img.page}</span>
                        <button
                          onClick={() => downloadDataUrl(img.dataUrl, `page_${img.page}.png`)}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        >
                          <Download size={11} />
                          PNG
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   IMAGES TO PDF TOOL
   ──────────────────────────────────────────────────────── */

function ImagesToPdfTool({ onBack }) {
  const tool = TOOLS.find((t) => t.id === 'images-to-pdf');
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState('fit'); // 'fit' | 'a4'
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragIdx, setDragIdx] = useState(null);

  const handleFiles = useCallback(async (files) => {
    const imgFiles = files.filter((f) => f.type.startsWith('image/'));
    const entries = [];
    for (const file of imgFiles) {
      const dataUrl = await readFileAsDataURL(file);
      const id = crypto.randomUUID();
      entries.push({ id, name: file.name, dataUrl, type: file.type, size: file.size });
    }
    setImages((prev) => [...prev, ...entries]);
  }, []);

  const removeImage = useCallback((id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleDragStart = (idx) => setDragIdx(idx);

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(dragIdx, 1);
      copy.splice(idx, 0, item);
      return copy;
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  const handleConvert = useCallback(async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setProgress(0);
    try {
      const doc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const response = await fetch(img.dataUrl);
        const imgBytes = await response.arrayBuffer();

        let embeddedImg;
        if (img.type === 'image/png') {
          embeddedImg = await doc.embedPng(imgBytes);
        } else {
          embeddedImg = await doc.embedJpg(imgBytes);
        }

        if (pageSize === 'fit') {
          const page = doc.addPage([embeddedImg.width, embeddedImg.height]);
          page.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: embeddedImg.width,
            height: embeddedImg.height,
          });
        } else {
          // A4: 595.28 x 841.89 points
          const pageW = 595.28;
          const pageH = 841.89;
          const page = doc.addPage([pageW, pageH]);
          const margin = 36; // 0.5 inch
          const maxW = pageW - 2 * margin;
          const maxH = pageH - 2 * margin;
          const ratio = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height);
          const drawW = embeddedImg.width * ratio;
          const drawH = embeddedImg.height * ratio;
          const x = (pageW - drawW) / 2;
          const y = (pageH - drawH) / 2;
          page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH });
        }
        setProgress(((i + 1) / images.length) * 90);
      }

      const pdfBytes = await doc.save();
      setProgress(100);
      downloadBlob(pdfBytes, 'images.pdf');
    } catch (err) {
      console.error('Convert failed:', err);
    } finally {
      setTimeout(() => setProcessing(false), 500);
    }
  }, [images, pageSize]);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <ToolHeader tool={tool} onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <DropZone
          onFiles={handleFiles}
          accept="image/*"
          multiple
          label="Drop images here or click to browse"
          sublabel="PNG, JPEG, and other image formats"
        />

        {images.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300">
                {images.length} image{images.length !== 1 ? 's' : ''}
              </h3>
              <button
                onClick={() => setImages([])}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> Clear all
              </button>
            </div>

            {/* Image previews */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`relative card overflow-hidden cursor-move group ${
                    dragIdx === idx ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <div className="aspect-[3/4] bg-zinc-900 overflow-hidden flex items-center justify-center">
                    <img src={img.dataUrl} alt={img.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="p-1.5 flex items-center gap-1">
                    <GripVertical size={10} className="text-zinc-600 shrink-0" />
                    <span className="text-[10px] text-zinc-400 truncate flex-1">{img.name}</span>
                    <span className="text-[10px] text-zinc-600 font-mono shrink-0">#{idx + 1}</span>
                  </div>
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-red-500/80 text-zinc-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Page size toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setPageSize('fit')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pageSize === 'fit'
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40'
                }`}
              >
                Fit to image
              </button>
              <button
                onClick={() => setPageSize('a4')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pageSize === 'a4'
                    ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent-light)] border border-[var(--color-accent)]/30'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40'
                }`}
              >
                A4 page
              </button>
            </div>

            {processing && <ProgressBar progress={progress} label="Creating PDF..." />}

            {!processing && (
              <button
                onClick={handleConvert}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-sm transition-colors"
              >
                <FileText size={16} />
                Create PDF from {images.length} image{images.length !== 1 ? 's' : ''}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   MAIN APP — DASHBOARD + ROUTING
   ──────────────────────────────────────────────────────── */

export default function PdfOperatorApp() {
  const [activeTool, setActiveTool] = useState(null);

  const goBack = useCallback(() => setActiveTool(null), []);

  if (activeTool === 'merge') return <MergeTool onBack={goBack} />;
  if (activeTool === 'split') return <SplitTool onBack={goBack} />;
  if (activeTool === 'compress') return <CompressTool onBack={goBack} />;
  if (activeTool === 'pdf-to-images') return <PdfToImagesTool onBack={goBack} />;
  if (activeTool === 'images-to-pdf') return <ImagesToPdfTool onBack={goBack} />;

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-300 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
            <FileText size={20} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">PDF Operator</h1>
            <p className="text-[11px] text-zinc-500">All-in-one client-side PDF toolkit — nothing leaves your browser</p>
          </div>
        </div>
      </div>

      {/* Tool Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 stagger-children">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className="group text-left card p-5 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <Icon size={22} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-[var(--color-accent-light)] transition-colors">
                        {tool.name}
                      </h3>
                      <ChevronRight
                        size={16}
                        className="text-zinc-700 group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all shrink-0"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{tool.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs text-zinc-600">
            🔒 All processing happens locally in your browser
          </p>
          <p className="text-[11px] text-zinc-700">
            Powered by pdf-lib and PDF.js · No files are uploaded to any server
          </p>
        </div>
      </div>
    </div>
  );
}
