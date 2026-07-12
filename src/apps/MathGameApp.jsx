import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Trophy, Clock, Target, RotateCcw, ChevronRight, Brain, Zap } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const DURATIONS = [30, 60, 120]
const OPERATORS = [
  { key: '+', label: '+', name: 'Addition' },
  { key: '-', label: '−', name: 'Subtraction' },
  { key: '*', label: '×', name: 'Multiplication' },
  { key: '/', label: '÷', name: 'Division' },
]

function generateQuestion(ops) {
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a, b, answer

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 100) + 1
      b = Math.floor(Math.random() * 100) + 1
      answer = a + b
      break
    case '-':
      a = Math.floor(Math.random() * 100) + 1
      b = Math.floor(Math.random() * a) + 1
      answer = a - b
      break
    case '*':
      a = Math.floor(Math.random() * 11) + 2
      b = Math.floor(Math.random() * 11) + 2
      answer = a * b
      break
    case '/': {
      b = Math.floor(Math.random() * 11) + 2
      const quotient = Math.floor(Math.random() * 11) + 2
      a = b * quotient
      answer = quotient
      break
    }
    default:
      a = 1; b = 1; answer = 2
  }

  const symbol = op === '*' ? '×' : op === '/' ? '÷' : op === '-' ? '−' : '+'
  return { a, b, symbol, answer, display: `${a} ${symbol} ${b}` }
}

// Screens
const SCREEN = { CONFIG: 'config', GAME: 'game', RESULT: 'result' }

export default function MathGameApp() {
  const [highScore, setHighScore] = useLocalStorage('yp-math-highscore', 0)
  const [screen, setScreen] = useState(SCREEN.CONFIG)

  // Config state
  const [duration, setDuration] = useState(60)
  const [enabledOps, setEnabledOps] = useState(['+', '-', '*', '/'])

  // Game state
  const [timeLeft, setTimeLeft] = useState(0)
  const [question, setQuestion] = useState(null)
  const [input, setInput] = useState('')
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState('')
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const totalDuration = useRef(0)

  const nextQuestion = useCallback((ops) => {
    setQuestion(generateQuestion(ops))
    setInput('')
  }, [])

  const startGame = useCallback(() => {
    const ops = enabledOps.length > 0 ? enabledOps : ['+']
    totalDuration.current = duration
    setTimeLeft(duration)
    setCorrect(0)
    setWrong(0)
    setInput('')
    setScreen(SCREEN.GAME)
    nextQuestion(ops)
  }, [duration, enabledOps, nextQuestion])

  // Countdown
  useEffect(() => {
    if (screen !== SCREEN.GAME) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          setScreen(SCREEN.RESULT)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [screen])

  // Focus input
  useEffect(() => {
    if (screen === SCREEN.GAME && inputRef.current) {
      inputRef.current.focus()
    }
  }, [screen, question])

  const handleInputChange = (e) => {
    const val = e.target.value
    // Allow only digits and leading minus
    if (val !== '' && val !== '-' && isNaN(Number(val))) return
    setInput(val)

    // Check answer on every keystroke
    if (val !== '' && val !== '-' && Number(val) === question?.answer) {
      setCorrect((c) => c + 1)
      setFlash('correct')
      setTimeout(() => setFlash(''), 300)
      nextQuestion(enabledOps.length > 0 ? enabledOps : ['+'])
    }
  }

  const handleSkip = () => {
    setWrong((w) => w + 1)
    setShake(true)
    setTimeout(() => setShake(false), 400)
    nextQuestion(enabledOps.length > 0 ? enabledOps : ['+'])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      if (input !== '' && Number(input) !== question?.answer) {
        handleSkip()
      }
    }
  }

  const toggleOp = (op) => {
    setEnabledOps((prev) => {
      if (prev.includes(op)) {
        if (prev.length <= 1) return prev // must have at least one
        return prev.filter((o) => o !== op)
      }
      return [...prev, op]
    })
  }

  // Result stats
  const total = correct + wrong
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const qpm = totalDuration.current > 0 ? ((correct / totalDuration.current) * 60).toFixed(1) : '0'
  const isNewHighScore = correct > highScore

  useEffect(() => {
    if (screen === SCREEN.RESULT && correct > highScore) {
      setHighScore(correct)
    }
  }, [screen, correct, highScore, setHighScore])

  // Timer progress
  const timerProgress = totalDuration.current > 0 ? timeLeft / totalDuration.current : 1
  const timerColor = timerProgress > 0.5 ? '#34d399' : timerProgress > 0.2 ? '#fbbf24' : '#f87171'

  // ── CONFIG SCREEN ──
  if (screen === SCREEN.CONFIG) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/10 mb-4">
              <Brain className="text-purple-400" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-zinc-100 mb-2">Math Trainer</h1>
            <p className="text-zinc-500">Zetamac-style mental math speed drill</p>
          </div>

          {/* High score badge */}
          {highScore > 0 && (
            <div className="flex items-center justify-center gap-2 mb-8 text-amber-400">
              <Trophy size={18} />
              <span className="text-sm font-medium">Best: {highScore} correct</span>
            </div>
          )}

          {/* Duration selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-400 mb-3">Timer Duration</label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer border ${
                    duration === d
                      ? 'bg-purple-500/15 border-purple-500/50 text-purple-400'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Operator toggles */}
          <div className="mb-10">
            <label className="block text-sm font-medium text-zinc-400 mb-3">Operations</label>
            <div className="grid grid-cols-2 gap-2">
              {OPERATORS.map((op) => {
                const active = enabledOps.includes(op.key)
                return (
                  <button
                    key={op.key}
                    onClick={() => toggleOp(op.key)}
                    className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer border ${
                      active
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-600'
                    }`}
                  >
                    <span className="text-lg font-mono font-bold w-6 text-center">{op.label}</span>
                    <span>{op.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={startGame}
            className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30 active:scale-[0.98]"
          >
            <Zap size={20} />
            Start Training
          </button>
        </div>
      </div>
    )
  }

  // ── GAME SCREEN ──
  if (screen === SCREEN.GAME) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        {/* Top bar */}
        <div className="w-full max-w-lg flex items-center justify-between mb-12">
          {/* Score */}
          <div className="flex items-center gap-2 text-emerald-400">
            <Target size={18} />
            <span className="font-mono text-2xl font-bold">{correct}</span>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2.5">
            <Clock size={18} style={{ color: timerColor }} />
            <span
              className="font-mono text-2xl font-bold transition-colors duration-300"
              style={{ color: timerColor }}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-full max-w-lg h-1.5 bg-zinc-800 rounded-full mb-12 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 linear"
            style={{
              width: `${timerProgress * 100}%`,
              backgroundColor: timerColor,
              boxShadow: `0 0 12px ${timerColor}66`,
            }}
          />
        </div>

        {/* Question */}
        <div
          className={`text-center mb-10 transition-transform duration-100 ${
            shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
          }`}
        >
          <p
            className={`font-mono text-5xl sm:text-6xl font-bold tracking-wide transition-colors duration-150 ${
              flash === 'correct' ? 'text-emerald-400' : 'text-zinc-100'
            }`}
          >
            {question?.display} = ?
          </p>
        </div>

        {/* Input */}
        <div className="w-full max-w-xs mb-6">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full text-center font-mono text-4xl font-bold py-4 bg-zinc-900 border-2 border-zinc-700 rounded-2xl text-zinc-100 outline-none focus:border-purple-500 transition-colors duration-200 placeholder-zinc-700"
            placeholder="?"
            autoComplete="off"
          />
        </div>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-200 cursor-pointer rounded-lg hover:bg-zinc-800/50"
        >
          Skip
          <ChevronRight size={16} />
        </button>

        {/* Shake animation */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
          }
        `}</style>
      </div>
    )
  }

  // ── RESULT SCREEN ──
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* New high score flair */}
        {isNewHighScore && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-sm font-semibold mb-6 border border-amber-500/20">
            <Trophy size={16} />
            New High Score!
          </div>
        )}

        <h2 className="text-3xl font-bold text-zinc-100 mb-2">Time's Up!</h2>
        <p className="text-zinc-500 mb-10">Here's how you did</p>

        {/* Big score */}
        <div className="mb-10">
          <span className="font-mono text-7xl font-bold text-purple-400">{correct}</span>
          <p className="text-zinc-500 text-sm mt-1">correct answers</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: 'Wrong / Skipped', value: wrong, color: 'text-red-400' },
            { label: 'Accuracy', value: `${accuracy}%`, color: 'text-emerald-400' },
            { label: 'Per Minute', value: qpm, color: 'text-blue-400' },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-zinc-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setScreen(SCREEN.CONFIG)}
            className="flex-1 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border border-zinc-700"
          >
            <RotateCcw size={18} />
            Settings
          </button>
          <button
            onClick={startGame}
            className="flex-1 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
          >
            <Play size={18} />
            Play Again
          </button>
        </div>
      </div>
    </div>
  )
}
