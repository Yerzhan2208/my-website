import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, RotateCcw, Coffee, Brain, Timer } from 'lucide-react'

const MODES = [
  { key: 'focus', label: 'Focus', duration: 25 * 60, icon: Brain, color: '#f87171' },
  { key: 'shortBreak', label: 'Short Break', duration: 5 * 60, icon: Coffee, color: '#34d399' },
  { key: 'longBreak', label: 'Long Break', duration: 15 * 60, icon: Timer, color: '#60a5fa' },
]

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      gain.gain.setValueAtTime(0.3, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }
    playTone(880, 0, 0.15)
    playTone(880, 0.2, 0.15)
    playTone(1100, 0.45, 0.3)
  } catch {
    // Audio not supported
  }
}

export default function PomodoroApp() {
  const [modeIndex, setModeIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(MODES[0].duration)
  const [isRunning, setIsRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef(null)

  const mode = MODES[modeIndex]
  const progress = timeLeft / mode.duration
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  // SVG ring constants
  const size = 280
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const switchMode = useCallback((newIndex) => {
    setIsRunning(false)
    clearInterval(intervalRef.current)
    setModeIndex(newIndex)
    setTimeLeft(MODES[newIndex].duration)
  }, [])

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          setIsRunning(false)
          playBeep()

          // Auto-switch logic
          if (modeIndex === 0) {
            // Focus -> increment sessions, then go to break
            setSessions((s) => s + 1)
            const nextSessions = sessions + 1
            const nextMode = nextSessions % 4 === 0 ? 2 : 1
            setTimeout(() => switchMode(nextMode), 600)
          } else {
            // Break -> go to focus
            setTimeout(() => switchMode(0), 600)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [isRunning, modeIndex, sessions, switchMode])

  const handleStart = () => setIsRunning(true)
  const handlePause = () => setIsRunning(false)
  const handleReset = () => {
    setIsRunning(false)
    clearInterval(intervalRef.current)
    setTimeLeft(mode.duration)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl mb-10">
        {MODES.map((m, i) => {
          const Icon = m.icon
          const active = i === modeIndex
          return (
            <button
              key={m.key}
              onClick={() => switchMode(i)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                active
                  ? 'text-white shadow-lg'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={active ? { backgroundColor: m.color + '22', color: m.color } : {}}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          )
        })}
      </div>

      {/* Timer ring */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-colors duration-500"
          style={{ backgroundColor: mode.color }}
        />

        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-zinc-800/50"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={mode.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            className="transition-[stroke-dashoffset] duration-1000 linear"
            style={{
              filter: `drop-shadow(0 0 8px ${mode.color}66)`,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono text-6xl font-bold tracking-wider text-zinc-100"
          >
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-sm font-medium mt-2 tracking-widest uppercase" style={{ color: mode.color }}>
            {mode.label}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={handleReset}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/80 hover:text-zinc-200 transition-all duration-200 cursor-pointer border border-zinc-700/50"
          title="Reset"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={isRunning ? handlePause : handleStart}
          className="w-16 h-16 flex items-center justify-center rounded-full text-white transition-all duration-200 cursor-pointer shadow-lg hover:scale-105 active:scale-95"
          style={{
            backgroundColor: mode.color,
            boxShadow: `0 0 30px ${mode.color}44`,
          }}
          title={isRunning ? 'Pause' : 'Start'}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>

        <button
          onClick={() => {
            if (modeIndex === 0) switchMode(1)
            else switchMode(0)
          }}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700/80 hover:text-zinc-200 transition-all duration-200 cursor-pointer border border-zinc-700/50"
          title="Skip"
        >
          {modeIndex === 0 ? <Coffee size={18} /> : <Brain size={18} />}
        </button>
      </div>

      {/* Session counter */}
      <div className="flex items-center gap-3 text-zinc-500">
        <div className="flex gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full transition-all duration-300"
              style={{
                backgroundColor: i < (sessions % 4) ? mode.color : 'transparent',
                border: `2px solid ${i < (sessions % 4) ? mode.color : '#3f3f46'}`,
                boxShadow: i < (sessions % 4) ? `0 0 8px ${mode.color}66` : 'none',
              }}
            />
          ))}
        </div>
        <span className="text-sm font-medium">
          {sessions} session{sessions !== 1 ? 's' : ''} completed
        </span>
      </div>

      {/* Helpful tip */}
      <p className="text-zinc-600 text-xs mt-8 text-center max-w-xs">
        Complete 4 focus sessions to earn a long break. Timer auto-advances between modes.
      </p>
    </div>
  )
}
