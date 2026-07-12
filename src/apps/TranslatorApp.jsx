import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  ArrowLeftRight,
  Copy,
  Trash2,
  Clock,
  Check,
  RotateCcw,
  Languages,
  ChevronDown,
  Volume2,
} from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// ─── Language Data ──────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'auto', name: 'Auto-Detect', flag: '🔍' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'kk', name: 'Kazakh', flag: '🇰🇿' },
]

const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.code !== 'auto')

// ─── Phrase Dictionaries (bidirectional lookups) ────────────────────────────────

const PHRASE_DICT = {
  'en-es': {
    hello: 'hola', goodbye: 'adiós', 'thank you': 'gracias', please: 'por favor',
    yes: 'sí', no: 'no', 'good morning': 'buenos días', 'good night': 'buenas noches',
    'how are you': 'cómo estás', water: 'agua', food: 'comida', love: 'amor',
    friend: 'amigo', world: 'mundo', time: 'tiempo', day: 'día', house: 'casa',
    book: 'libro', cat: 'gato', dog: 'perro', sun: 'sol', moon: 'luna',
  },
  'en-fr': {
    hello: 'bonjour', goodbye: 'au revoir', 'thank you': 'merci', please: "s'il vous plaît",
    yes: 'oui', no: 'non', 'good morning': 'bonjour', 'good night': 'bonne nuit',
    'how are you': 'comment allez-vous', water: 'eau', food: 'nourriture', love: 'amour',
    friend: 'ami', world: 'monde', time: 'temps', day: 'jour', house: 'maison',
    book: 'livre', cat: 'chat', dog: 'chien', sun: 'soleil', moon: 'lune',
  },
  'en-de': {
    hello: 'hallo', goodbye: 'auf wiedersehen', 'thank you': 'danke', please: 'bitte',
    yes: 'ja', no: 'nein', 'good morning': 'guten morgen', 'good night': 'gute nacht',
    'how are you': 'wie geht es ihnen', water: 'wasser', food: 'essen', love: 'liebe',
    friend: 'freund', world: 'welt', time: 'zeit', day: 'tag', house: 'haus',
    book: 'buch', cat: 'katze', dog: 'hund', sun: 'sonne', moon: 'mond',
  },
  'en-ja': {
    hello: 'こんにちは', goodbye: 'さようなら', 'thank you': 'ありがとう', please: 'お願いします',
    yes: 'はい', no: 'いいえ', 'good morning': 'おはようございます', 'good night': 'おやすみなさい',
    'how are you': 'お元気ですか', water: '水', food: '食べ物', love: '愛',
    friend: '友達', world: '世界', time: '時間', day: '日', house: '家',
    book: '本', cat: '猫', dog: '犬', sun: '太陽', moon: '月',
  },
  'en-ko': {
    hello: '안녕하세요', goodbye: '안녕히 가세요', 'thank you': '감사합니다', please: '제발',
    yes: '네', no: '아니요', 'good morning': '좋은 아침', 'good night': '잘 자요',
    'how are you': '어떻게 지내세요', water: '물', food: '음식', love: '사랑',
    friend: '친구', world: '세계', time: '시간', day: '일', house: '집',
    book: '책', cat: '고양이', dog: '개', sun: '태양', moon: '달',
  },
  'en-zh': {
    hello: '你好', goodbye: '再见', 'thank you': '谢谢', please: '请',
    yes: '是', no: '不', 'good morning': '早上好', 'good night': '晚安',
    'how are you': '你好吗', water: '水', food: '食物', love: '爱',
    friend: '朋友', world: '世界', time: '时间', day: '天', house: '房子',
    book: '书', cat: '猫', dog: '狗', sun: '太阳', moon: '月亮',
  },
  'en-ru': {
    hello: 'привет', goodbye: 'до свидания', 'thank you': 'спасибо', please: 'пожалуйста',
    yes: 'да', no: 'нет', 'good morning': 'доброе утро', 'good night': 'спокойной ночи',
    'how are you': 'как дела', water: 'вода', food: 'еда', love: 'любовь',
    friend: 'друг', world: 'мир', time: 'время', day: 'день', house: 'дом',
    book: 'книга', cat: 'кот', dog: 'собака', sun: 'солнце', moon: 'луна',
  },
  'en-ar': {
    hello: 'مرحبا', goodbye: 'مع السلامة', 'thank you': 'شكرا', please: 'من فضلك',
    yes: 'نعم', no: 'لا', 'good morning': 'صباح الخير', 'good night': 'تصبح على خير',
    'how are you': 'كيف حالك', water: 'ماء', food: 'طعام', love: 'حب',
    friend: 'صديق', world: 'عالم', time: 'وقت', day: 'يوم', house: 'بيت',
    book: 'كتاب', cat: 'قط', dog: 'كلب', sun: 'شمس', moon: 'قمر',
  },
  'en-pt': {
    hello: 'olá', goodbye: 'adeus', 'thank you': 'obrigado', please: 'por favor',
    yes: 'sim', no: 'não', 'good morning': 'bom dia', 'good night': 'boa noite',
    'how are you': 'como vai você', water: 'água', food: 'comida', love: 'amor',
    friend: 'amigo', world: 'mundo', time: 'tempo', day: 'dia', house: 'casa',
    book: 'livro', cat: 'gato', dog: 'cachorro', sun: 'sol', moon: 'lua',
  },
  'en-it': {
    hello: 'ciao', goodbye: 'arrivederci', 'thank you': 'grazie', please: 'per favore',
    yes: 'sì', no: 'no', 'good morning': 'buongiorno', 'good night': 'buonanotte',
    'how are you': 'come stai', water: 'acqua', food: 'cibo', love: 'amore',
    friend: 'amico', world: 'mondo', time: 'tempo', day: 'giorno', house: 'casa',
    book: 'libro', cat: 'gatto', dog: 'cane', sun: 'sole', moon: 'luna',
  },
  'en-tr': {
    hello: 'merhaba', goodbye: 'hoşça kal', 'thank you': 'teşekkürler', please: 'lütfen',
    yes: 'evet', no: 'hayır', 'good morning': 'günaydın', 'good night': 'iyi geceler',
    'how are you': 'nasılsınız', water: 'su', food: 'yemek', love: 'aşk',
    friend: 'arkadaş', world: 'dünya', time: 'zaman', day: 'gün', house: 'ev',
    book: 'kitap', cat: 'kedi', dog: 'köpek', sun: 'güneş', moon: 'ay',
  },
  'en-kk': {
    hello: 'сәлем', goodbye: 'сау болыңыз', 'thank you': 'рахмет', please: 'өтінемін',
    yes: 'иә', no: 'жоқ', 'good morning': 'қайырлы таң', 'good night': 'қайырлы түн',
    'how are you': 'қалыңыз қалай', water: 'су', food: 'тамақ', love: 'махаббат',
    friend: 'дос', world: 'әлем', time: 'уақыт', day: 'күн', house: 'үй',
    book: 'кітап', cat: 'мысық', dog: 'ит', sun: 'күн', moon: 'ай',
  },
}

// Build reverse dictionaries for non-en source translations
function getDict(src, tgt) {
  const directKey = `${src}-${tgt}`
  if (PHRASE_DICT[directKey]) return PHRASE_DICT[directKey]

  // Reverse: e.g. es-en → flip en-es
  const reverseKey = `${tgt}-${src}`
  if (PHRASE_DICT[reverseKey]) {
    const reversed = {}
    for (const [k, v] of Object.entries(PHRASE_DICT[reverseKey])) {
      reversed[v] = k
    }
    return reversed
  }

  // Route through English: src→en then en→tgt
  const srcToEn = `en-${src}`
  const enToTgt = `en-${tgt}`
  if (PHRASE_DICT[srcToEn] && PHRASE_DICT[enToTgt]) {
    const step1 = {}
    for (const [k, v] of Object.entries(PHRASE_DICT[srcToEn])) {
      step1[v] = k // src_word → en_word
    }
    const step2 = PHRASE_DICT[enToTgt]
    const combined = {}
    for (const [srcWord, enWord] of Object.entries(step1)) {
      if (step2[enWord]) combined[srcWord] = step2[enWord]
    }
    return combined
  }

  return {}
}

// ─── Translation Engine ─────────────────────────────────────────────────────────

function caesarShift(text, shift) {
  return text
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0)
      if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift) % 26) + 65)
      if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift) % 26) + 97)
      return ch
    })
    .join('')
}

function mockTranslate(text, srcLang, tgtLang) {
  if (!text.trim()) return ''
  const src = srcLang === 'auto' ? 'en' : srcLang
  if (src === tgtLang) return text

  const dict = getDict(src, tgtLang)
  const lower = text.toLowerCase().trim()

  // Check full phrase match first
  if (dict[lower]) {
    // Preserve original casing style
    if (text[0] === text[0].toUpperCase()) {
      const t = dict[lower]
      return t.charAt(0).toUpperCase() + t.slice(1)
    }
    return dict[lower]
  }

  // Word-by-word translation with dict fallback to cipher
  const shiftAmount = ((tgtLang.charCodeAt(0) + tgtLang.charCodeAt(1)) % 13) + 3
  const words = text.split(/(\s+)/)

  const translated = words.map((segment) => {
    if (/^\s+$/.test(segment)) return segment
    // Strip punctuation
    const match = segment.match(/^([^\w]*)(\w+)([^\w]*)$/)
    if (!match) return segment
    const [, pre, word, post] = match
    const lw = word.toLowerCase()
    if (dict[lw]) {
      const t = dict[lw]
      // Preserve capitalization
      if (word[0] === word[0].toUpperCase()) {
        return pre + t.charAt(0).toUpperCase() + t.slice(1) + post
      }
      return pre + t + post
    }
    // Fallback: caesar cipher
    return pre + caesarShift(word, shiftAmount) + post
  })

  return translated.join('')
}

// ─── Dropdown Component ─────────────────────────────────────────────────────────

function LangDropdown({ value, onChange, languages, label }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = languages.find((l) => l.code === value) || languages[0]

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200 text-sm font-medium text-zinc-200 min-w-[160px]"
        aria-label={label}
      >
        <span className="text-base">{selected.flag}</span>
        <span className="flex-1 text-left truncate">{selected.name}</span>
        <ChevronDown
          size={14}
          className={`text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl shadow-black/40 z-50 py-1.5 animate-fade-in max-h-72 overflow-y-auto">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                onChange(lang.code)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors duration-150 ${
                lang.code === value
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent-light)]'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.code === value && <Check size={14} className="ml-auto text-[var(--color-accent)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main App ───────────────────────────────────────────────────────────────────

export default function TranslatorApp() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('auto')
  const [targetLang, setTargetLang] = useState('es')
  const [isTranslating, setIsTranslating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useLocalStorage('yp-translator-history', [])
  const timerRef = useRef(null)

  // Resolve effective source lang for display
  const effectiveSourceLang = sourceLang === 'auto' ? 'en' : sourceLang

  // ── Debounced translation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText('')
      return
    }

    setIsTranslating(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const result = mockTranslate(sourceText, sourceLang, targetLang)
      setTranslatedText(result)
      setIsTranslating(false)
    }, 300)

    return () => clearTimeout(timerRef.current)
  }, [sourceText, sourceLang, targetLang])

  // ── Save to history (on translation settle) ───────────────────────────────
  const saveToHistory = useCallback(() => {
    if (!sourceText.trim() || !translatedText.trim()) return
    const entry = {
      id: Date.now(),
      sourceText: sourceText.slice(0, 200),
      translatedText: translatedText.slice(0, 200),
      sourceLang: effectiveSourceLang,
      targetLang,
      timestamp: new Date().toISOString(),
    }
    setHistory((prev) => {
      const deduped = prev.filter(
        (h) =>
          h.sourceText !== entry.sourceText ||
          h.sourceLang !== entry.sourceLang ||
          h.targetLang !== entry.targetLang
      )
      return [entry, ...deduped].slice(0, 5)
    })
  }, [sourceText, translatedText, effectiveSourceLang, targetLang, setHistory])

  // Save after user stops typing for 2s
  useEffect(() => {
    if (!translatedText.trim()) return
    const t = setTimeout(saveToHistory, 2000)
    return () => clearTimeout(t)
  }, [translatedText, saveToHistory])

  // ── Swap languages ────────────────────────────────────────────────────────
  const handleSwap = useCallback(() => {
    if (sourceLang === 'auto') {
      setSourceLang('en')
      setTargetLang((prev) => prev)
    } else {
      const oldSrc = sourceLang
      const oldTgt = targetLang
      setSourceLang(oldTgt)
      setTargetLang(oldSrc)
    }
    setSourceText(translatedText)
  }, [sourceLang, targetLang, translatedText])

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!translatedText) return
    try {
      await navigator.clipboard.writeText(translatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* noop */
    }
  }, [translatedText])

  // ── Clear ─────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setSourceText('')
    setTranslatedText('')
  }, [])

  // ── Load from history ─────────────────────────────────────────────────────
  const loadHistory = useCallback(
    (item) => {
      setSourceLang(item.sourceLang)
      setTargetLang(item.targetLang)
      setSourceText(item.sourceText)
    },
    []
  )

  const clearHistory = useCallback(() => setHistory([]), [setHistory])

  // ── Character count ───────────────────────────────────────────────────────
  const charCount = sourceText.length
  const wordCount = sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0

  // ── Language name helpers ─────────────────────────────────────────────────
  const getLangName = useCallback(
    (code) => LANGUAGES.find((l) => l.code === code)?.name || code,
    []
  )

  const formatTime = useCallback((iso) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString()
  }, [])

  // ── Speak (TTS) ───────────────────────────────────────────────────────────
  const speak = useCallback(
    (text, lang) => {
      if (!text || !window.speechSynthesis) return
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = lang === 'auto' ? 'en' : lang
      utter.rate = 0.9
      window.speechSynthesis.speak(utter)
    },
    []
  )

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
          <Languages size={22} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Translation Engine</h2>
          <p className="text-xs text-zinc-500">Mock translation with phrase dictionary & cipher encoding</p>
        </div>
      </div>

      {/* ── Language Selectors ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <LangDropdown
          value={sourceLang}
          onChange={setSourceLang}
          languages={LANGUAGES}
          label="Source language"
        />
        <button
          onClick={handleSwap}
          className="group p-2.5 rounded-full bg-zinc-800/50 hover:bg-[var(--color-accent)]/15 border border-zinc-700/50 hover:border-[var(--color-accent)]/30 transition-all duration-300"
          title="Swap languages"
        >
          <ArrowLeftRight
            size={18}
            className="text-zinc-400 group-hover:text-[var(--color-accent)] transition-colors duration-300 group-hover:rotate-180 transform"
            style={{ transition: 'transform 0.4s ease, color 0.3s ease' }}
          />
        </button>
        <LangDropdown
          value={targetLang}
          onChange={setTargetLang}
          languages={TARGET_LANGUAGES}
          label="Target language"
        />
      </div>

      {/* ── Translation Panels ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Panel */}
        <div className="card flex flex-col rounded-2xl overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/40">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {sourceLang === 'auto' ? 'Auto-Detect → English' : getLangName(sourceLang)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => speak(sourceText, effectiveSourceLang)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Listen"
              >
                <Volume2 size={14} />
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-[var(--color-danger)] transition-colors"
                title="Clear"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="relative flex-1">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-56 md:h-64 bg-transparent text-zinc-100 text-[15px] leading-relaxed p-4 resize-none outline-none placeholder:text-zinc-600 font-sans"
              spellCheck={false}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/40 bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-zinc-500">
                {charCount.toLocaleString()} chars
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-[11px] font-mono text-zinc-500">
                {wordCount.toLocaleString()} words
              </span>
            </div>
          </div>
        </div>

        {/* Target Panel */}
        <div className="card flex flex-col rounded-2xl overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/40">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {getLangName(targetLang)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => speak(translatedText, targetLang)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Listen"
              >
                <Volume2 size={14} />
              </button>
              <button
                onClick={handleCopy}
                className={`p-1.5 rounded-lg transition-colors ${
                  copied
                    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                    : 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
                title="Copy translation"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Output */}
          <div className="relative flex-1 h-56 md:h-64 p-4 overflow-y-auto">
            {isTranslating ? (
              <div className="flex items-center gap-2.5 text-zinc-500">
                <div className="flex gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-sm">Translating...</span>
              </div>
            ) : translatedText ? (
              <p className="text-zinc-100 text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                {translatedText}
              </p>
            ) : (
              <p className="text-zinc-600 text-[15px]">Translation will appear here...</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800/40 bg-zinc-900/30">
            <span className="text-[11px] font-mono text-zinc-500">
              {translatedText.length.toLocaleString()} chars
            </span>
            {copied && (
              <span className="text-[11px] text-[var(--color-success)] animate-fade-in">
                Copied to clipboard!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── History ────────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock size={15} />
              <span className="text-sm font-medium">Recent Translations</span>
              <span className="text-[11px] text-zinc-600 font-mono">({history.length})</span>
            </div>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-zinc-500 hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
            >
              <RotateCcw size={12} />
              Clear
            </button>
          </div>

          <div className="divide-y divide-zinc-800/30">
            {history.map((item) => {
              const srcFlag = LANGUAGES.find((l) => l.code === item.sourceLang)?.flag || '🌐'
              const tgtFlag = LANGUAGES.find((l) => l.code === item.targetLang)?.flag || '🌐'

              return (
                <button
                  key={item.id}
                  onClick={() => loadHistory(item)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-800/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 truncate group-hover:text-zinc-100 transition-colors">
                        {item.sourceText}
                      </p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{item.translatedText}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-600 flex items-center gap-1">
                        {srcFlag} → {tgtFlag}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
