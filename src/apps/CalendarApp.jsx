import { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  CalendarDays,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = [
  { name: 'Blue', value: '#6d5dfc', dot: 'bg-[#6d5dfc]', ring: 'ring-[#6d5dfc]/30' },
  { name: 'Emerald', value: '#34d399', dot: 'bg-emerald-400', ring: 'ring-emerald-400/30' },
  { name: 'Rose', value: '#fb7185', dot: 'bg-rose-400', ring: 'ring-rose-400/30' },
  { name: 'Amber', value: '#fbbf24', dot: 'bg-amber-400', ring: 'ring-amber-400/30' },
  { name: 'Sky', value: '#38bdf8', dot: 'bg-sky-400', ring: 'ring-sky-400/30' },
  { name: 'Violet', value: '#a78bfa', dot: 'bg-violet-400', ring: 'ring-violet-400/30' },
];

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  return { firstDay, daysInMonth, prevMonthDays };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CalendarApp() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [events, setEvents] = useLocalStorage('yp-calendar-events', {});

  // Add-event form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newColor, setNewColor] = useState(EVENT_COLORS[0].value);

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(dateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  }, []);

  const { firstDay, daysInMonth, prevMonthDays } = useMemo(
    () => getMonthData(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const calendarCells = useMemo(() => {
    const cells = [];
    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, isCurrentMonth: false, key: `prev-${i}` });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        key: dateKey(currentYear, currentMonth, d),
        dateStr: dateKey(currentYear, currentMonth, d),
      });
    }
    // Next month leading days
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, isCurrentMonth: false, key: `next-${i}` });
    }
    return cells;
  }, [firstDay, daysInMonth, prevMonthDays, currentYear, currentMonth]);

  const todayStr = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return (events[selectedDate] || []).sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDate, events]);

  const addEvent = useCallback(() => {
    const trimmed = newTitle.trim();
    if (!trimmed || !selectedDate) return;
    const event = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: trimmed,
      time: newTime,
      color: newColor,
    };
    setEvents((prev) => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), event],
    }));
    setNewTitle('');
    setNewTime('09:00');
    setNewColor(EVENT_COLORS[0].value);
    setShowAddForm(false);
  }, [newTitle, newTime, newColor, selectedDate, setEvents]);

  const deleteEvent = useCallback(
    (id) => {
      if (!selectedDate) return;
      setEvents((prev) => {
        const updated = (prev[selectedDate] || []).filter((e) => e.id !== id);
        const copy = { ...prev };
        if (updated.length === 0) {
          delete copy[selectedDate];
        } else {
          copy[selectedDate] = updated;
        }
        return copy;
      });
    },
    [selectedDate, setEvents]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addEvent();
    if (e.key === 'Escape') setShowAddForm(false);
  };

  const formatSelectedDate = (ds) => {
    if (!ds) return '';
    const [y, m, d] = ds.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent-light)]">
            <CalendarDays size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-zinc-500 text-sm">Plan your days, track your events</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar grid */}
          <div className="flex-1">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold tracking-tight">
                {MONTH_NAMES[currentMonth]}{' '}
                <span className="text-zinc-500 font-mono">{currentYear}</span>
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-700/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-all"
                >
                  Today
                </button>
                <button
                  onClick={goToPrevMonth}
                  className="p-1.5 rounded-lg border border-zinc-700/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-all"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 rounded-lg border border-zinc-700/60 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-all"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500 py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7 border border-zinc-800/60 rounded-xl overflow-hidden">
              {calendarCells.map((cell) => {
                const isToday = cell.dateStr === todayStr;
                const isSelected = cell.dateStr === selectedDate;
                const cellEvents = cell.dateStr ? events[cell.dateStr] || [] : [];
                const isCurrentMonth = cell.isCurrentMonth;

                return (
                  <button
                    key={cell.key}
                    onClick={() => {
                      if (isCurrentMonth && cell.dateStr) {
                        setSelectedDate(cell.dateStr);
                        setShowAddForm(false);
                      }
                    }}
                    disabled={!isCurrentMonth}
                    className={`relative aspect-square flex flex-col items-center justify-start pt-2 border-b border-r border-zinc-800/40 transition-all duration-150 ${
                      !isCurrentMonth
                        ? 'text-zinc-700 bg-zinc-950/50 cursor-default'
                        : isSelected
                        ? 'bg-[var(--color-accent)]/10 text-zinc-100'
                        : 'text-zinc-300 hover:bg-zinc-800/40 cursor-pointer'
                    }`}
                  >
                    <span
                      className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                        isToday
                          ? 'bg-[var(--color-accent)] text-white font-bold'
                          : isSelected
                          ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent-light)]'
                          : ''
                      }`}
                    >
                      {cell.day}
                    </span>

                    {/* Event dots */}
                    {cellEvents.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-1 flex-wrap justify-center max-w-full px-1">
                        {cellEvents.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: ev.color }}
                          />
                        ))}
                        {cellEvents.length > 3 && (
                          <span className="text-[8px] text-zinc-500 font-mono">+{cellEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event panel */}
          <div className="lg:w-80 shrink-0">
            {selectedDate ? (
              <div className="card rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-4 animate-fade-in">
                {/* Selected date header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {formatSelectedDate(selectedDate)}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/60 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Event list */}
                {selectedEvents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="group flex items-start gap-2.5 p-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800/60 hover:border-zinc-700/60 transition-all"
                      >
                        <span
                          className="w-1 h-full min-h-[2rem] rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: ev.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 font-medium truncate">{ev.title}</p>
                          <div className="flex items-center gap-1 mt-1 text-zinc-500">
                            <Clock size={11} />
                            <span className="text-[11px] font-mono">{ev.time}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEvent(ev.id)}
                          className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                          aria-label="Delete event"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-600">
                    <CalendarDays size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No events for this day</p>
                  </div>
                )}

                {/* Add event */}
                {!showAddForm ? (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-zinc-700/60 text-zinc-500 hover:text-[var(--color-accent-light)] hover:border-[var(--color-accent)]/40 text-xs font-medium transition-all"
                  >
                    <Plus size={14} />
                    Add Event
                  </button>
                ) : (
                  <div className="space-y-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/40 animate-fade-in">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Event title"
                      autoFocus
                      className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[var(--color-accent)]/60 focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-all"
                    />

                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-zinc-500 shrink-0" />
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="flex-1 bg-zinc-800/70 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-[var(--color-accent)]/60 transition-all font-mono [color-scheme:dark]"
                      />
                    </div>

                    {/* Color picker */}
                    <div className="flex items-center gap-1.5">
                      {EVENT_COLORS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setNewColor(c.value)}
                          className={`w-6 h-6 rounded-full transition-all ${
                            newColor === c.value ? `ring-2 ${c.ring} scale-110` : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: c.value }}
                          aria-label={c.name}
                        />
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={addEvent}
                        disabled={!newTitle.trim()}
                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} />
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewTitle('');
                        }}
                        className="px-3 py-2 rounded-lg border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-8 text-center animate-fade-in">
                <CalendarDays size={36} className="mx-auto mb-3 text-zinc-700 opacity-60" />
                <p className="text-sm text-zinc-500">Select a day to view or add events</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
