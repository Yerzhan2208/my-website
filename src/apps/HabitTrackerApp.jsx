import { useState, useMemo, useCallback } from 'react'
import { Plus, Trash2, Flame, Check, ChevronLeft, ChevronRight, Target, Activity } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EMOJI_OPTIONS = ['✅', '💪', '📚', '🏃', '💧', '🧘', '🎯', '💤', '🥗', '✍️', '🎨', '🎸', '💊', '🧹']

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export default function HabitTrackerApp() {
  const [data, setData] = useLocalStorage('yp-habits-data', { habits: [], completions: {} })
  const [weekOffset, setWeekOffset] = useState(0)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('✅')
  const [showForm, setShowForm] = useState(false)

  const today = useMemo(() => new Date(), [])

  const monday = useMemo(() => {
    const m = getMonday(today)
    m.setDate(m.getDate() + weekOffset * 7)
    return m
  }, [today, weekOffset])

  const weekDays = useMemo(() => getWeekDays(monday), [monday])

  const weekLabel = useMemo(() => {
    const first = weekDays[0]
    const last = weekDays[6]
    const fMonth = first.toLocaleString('en-US', { month: 'short' })
    const lMonth = last.toLocaleString('en-US', { month: 'short' })
    if (fMonth === lMonth) {
      return `${first.getDate()} – ${last.getDate()} ${fMonth} ${last.getFullYear()}`
    }
    return `${first.getDate()} ${fMonth} – ${last.getDate()} ${lMonth} ${last.getFullYear()}`
  }, [weekDays])

  const isCurrentWeek = weekOffset === 0

  const todayKey = formatDateKey(today)

  const addHabit = useCallback(() => {
    const name = newName.trim()
    if (!name) return
    setData(prev => ({
      ...prev,
      habits: [...prev.habits, { id: generateId(), name, emoji: newEmoji, createdAt: new Date().toISOString() }],
    }))
    setNewName('')
    setNewEmoji('✅')
    setShowForm(false)
  }, [newName, newEmoji, setData])

  const deleteHabit = useCallback((id) => {
    setData(prev => {
      const completions = { ...prev.completions }
      Object.keys(completions).forEach(key => {
        if (key.endsWith(`-${id}`)) delete completions[key]
      })
      return { habits: prev.habits.filter(h => h.id !== id), completions }
    })
  }, [setData])

  const toggleCompletion = useCallback((dateKey, habitId) => {
    const key = `${dateKey}-${habitId}`
    setData(prev => {
      const completions = { ...prev.completions }
      completions[key] = !completions[key]
      if (!completions[key]) delete completions[key]
      return { ...prev, completions }
    })
  }, [setData])

  const getStreak = useCallback((habitId) => {
    let streak = 0
    const d = new Date(today)
    // check today first; if not completed, start from yesterday
    const todayCompleted = data.completions[`${formatDateKey(d)}-${habitId}`]
    if (!todayCompleted) {
      d.setDate(d.getDate() - 1)
    }
    while (true) {
      const key = `${formatDateKey(d)}-${habitId}`
      if (data.completions[key]) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [data.completions, today])

  const weeklyStats = useMemo(() => {
    const habits = data.habits
    if (habits.length === 0) return { overall: 0, perHabit: {} }
    let totalCells = habits.length * 7
    let completedCells = 0
    const perHabit = {}
    habits.forEach(h => {
      let count = 0
      weekDays.forEach(day => {
        const key = `${formatDateKey(day)}-${h.id}`
        if (data.completions[key]) {
          count++
          completedCells++
        }
      })
      perHabit[h.id] = Math.round((count / 7) * 100)
    })
    return { overall: totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0, perHabit }
  }, [data, weekDays])

  const getCompletionColor = (pct) => {
    if (pct === 0) return 'text-zinc-600'
    if (pct < 50) return 'text-danger'
    if (pct < 100) return 'text-warning'
    return 'text-success'
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Activity className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Habit Tracker</h1>
            <p className="text-sm text-zinc-500">Build consistency, one day at a time</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Habit
        </button>
      </div>

      {/* Add Habit Form */}
      {showForm && (
        <div className="card p-5 mb-6 animate-scale-in">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Add a New Habit</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHabit()}
                placeholder="e.g. Drink 8 glasses of water"
                className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1 flex-wrap">
                {EMOJI_OPTIONS.map(em => (
                  <button
                    key={em}
                    onClick={() => setNewEmoji(em)}
                    className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                      newEmoji === em
                        ? 'bg-accent/20 ring-2 ring-accent scale-110'
                        : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={addHabit}
              disabled={!newName.trim()}
              className="px-5 py-2 bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Add Habit
            </button>
          </div>
        </div>
      )}

      {/* Weekly Overview Card */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-100">{weekLabel}</p>
            {isCurrentWeek && (
              <p className="text-xs text-accent mt-0.5">This week</p>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Progress */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 mb-5">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#27272a" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke={weeklyStats.overall === 100 ? '#34d399' : weeklyStats.overall >= 50 ? '#fbbf24' : '#6d5dfc'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${(weeklyStats.overall / 100) * 175.93} 175.93`}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-zinc-100 font-mono">
              {weeklyStats.overall}%
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-200">Weekly Completion</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {data.habits.length === 0
                ? 'Add habits to start tracking'
                : weeklyStats.overall === 100
                  ? '🎉 Perfect week!'
                  : weeklyStats.overall >= 70
                    ? 'Great progress, keep it up!'
                    : 'Stay consistent!'}
            </p>
          </div>
        </div>

        {/* Habit Grid */}
        {data.habits.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No habits yet. Add one to start building your streaks!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px]">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-zinc-500 pb-3 pr-2 w-48">Habit</th>
                  {DAY_LABELS.map((label, i) => {
                    const dayKey = formatDateKey(weekDays[i])
                    const isToday = dayKey === todayKey
                    return (
                      <th
                        key={label}
                        className={`text-center text-xs font-medium pb-3 w-12 ${
                          isToday ? 'text-accent' : 'text-zinc-500'
                        }`}
                      >
                        <div>{label}</div>
                        <div className={`text-[10px] mt-0.5 font-mono ${isToday ? 'text-accent' : 'text-zinc-600'}`}>
                          {weekDays[i].getDate()}
                        </div>
                      </th>
                    )
                  })}
                  <th className="text-center text-xs font-medium text-zinc-500 pb-3 w-14">%</th>
                  <th className="text-center text-xs font-medium text-zinc-500 pb-3 w-14">
                    <Flame className="w-3.5 h-3.5 inline" />
                  </th>
                  <th className="w-10 pb-3"></th>
                </tr>
              </thead>
              <tbody className="stagger-children">
                {data.habits.map(habit => {
                  const streak = getStreak(habit.id)
                  const pct = weeklyStats.perHabit[habit.id] || 0
                  return (
                    <tr key={habit.id} className="group">
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{habit.emoji}</span>
                          <span className="text-sm text-zinc-200 truncate max-w-[140px]">{habit.name}</span>
                        </div>
                      </td>
                      {weekDays.map((day, i) => {
                        const dateKey = formatDateKey(day)
                        const key = `${dateKey}-${habit.id}`
                        const completed = !!data.completions[key]
                        const isToday = dateKey === todayKey
                        return (
                          <td key={i} className="py-2">
                            <button
                              onClick={() => toggleCompletion(dateKey, habit.id)}
                              className={`w-9 h-9 mx-auto rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                completed
                                  ? 'bg-success/20 text-success hover:bg-success/30 scale-100'
                                  : isToday
                                    ? 'bg-zinc-800 border border-accent/30 text-zinc-600 hover:bg-zinc-700 hover:text-zinc-400'
                                    : 'bg-zinc-800/50 text-zinc-700 hover:bg-zinc-700 hover:text-zinc-500'
                              }`}
                              aria-label={`Toggle ${habit.name} on ${dateKey}`}
                            >
                              {completed && <Check className="w-4 h-4" />}
                            </button>
                          </td>
                        )
                      })}
                      <td className="py-2 text-center">
                        <span className={`text-xs font-bold font-mono ${getCompletionColor(pct)}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                          streak >= 7
                            ? 'bg-success/10 text-success'
                            : streak >= 3
                              ? 'bg-warning/10 text-warning'
                              : streak > 0
                                ? 'bg-accent/10 text-accent'
                                : 'text-zinc-600'
                        }`}>
                          {streak > 0 && <Flame className="w-3 h-3" />}
                          {streak}
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          aria-label={`Delete ${habit.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Habit summary cards */}
      {data.habits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
          {data.habits.map(habit => {
            const streak = getStreak(habit.id)
            const pct = weeklyStats.perHabit[habit.id] || 0
            const completedDays = weekDays.filter(day => data.completions[`${formatDateKey(day)}-${habit.id}`]).length
            return (
              <div key={habit.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{habit.emoji}</span>
                    <span className="text-sm font-medium text-zinc-200 truncate">{habit.name}</span>
                  </div>
                  {streak > 0 && (
                    <div className={`flex items-center gap-1 text-xs font-bold font-mono ${
                      streak >= 7 ? 'text-success' : streak >= 3 ? 'text-warning' : 'text-accent'
                    }`}>
                      <Flame className="w-3.5 h-3.5" />
                      {streak}d
                    </div>
                  )}
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-accent'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[11px] text-zinc-500">{completedDays}/7 days</span>
                  <span className={`text-[11px] font-mono font-bold ${getCompletionColor(pct)}`}>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
