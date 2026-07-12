import { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Check,
  Filter,
  SortAsc,
  Tag,
  Circle,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const CATEGORIES = [
  { value: 'Work', color: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
  { value: 'Personal', color: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  { value: 'Health', color: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  { value: 'Learning', color: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
];

const PRIORITIES = [
  { value: 'High', color: 'text-red-400', dot: 'bg-red-500', ring: 'ring-red-500/20', sort: 0 },
  { value: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-500', ring: 'ring-yellow-500/20', sort: 1 },
  { value: 'Low', color: 'text-zinc-400', dot: 'bg-zinc-500', ring: 'ring-zinc-500/20', sort: 2 },
];

function getCategoryMeta(name) {
  return CATEGORIES.find((c) => c.value === name) || CATEGORIES[0];
}

function getPriorityMeta(name) {
  return PRIORITIES.find((p) => p.value === name) || PRIORITIES[1];
}

export default function TodoApp() {
  const [tasks, setTasks] = useLocalStorage('yp-todo-data', []);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Work');
  const [priority, setPriority] = useState('Medium');
  const [sortBy, setSortBy] = useState('date');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const addTask = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        text: trimmed,
        category,
        priority,
        completed: false,
        createdAt: Date.now(),
      },
    ]);
    setText('');
  }, [text, category, priority, setTasks]);

  const toggleTask = useCallback(
    (id) =>
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      ),
    [setTasks]
  );

  const deleteTask = useCallback(
    (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    [setTasks]
  );

  const filtered = useMemo(() => {
    let result = [...tasks];
    if (filterCategory !== 'All') result = result.filter((t) => t.category === filterCategory);
    if (filterStatus === 'Completed') result = result.filter((t) => t.completed);
    else if (filterStatus === 'Pending') result = result.filter((t) => !t.completed);
    return result;
  }, [tasks, filterCategory, filterStatus]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'priority':
        return arr.sort((a, b) => getPriorityMeta(a.priority).sort - getPriorityMeta(b.priority).sort);
      case 'category':
        return arr.sort((a, b) => a.category.localeCompare(b.category));
      case 'status':
        return arr.sort((a, b) => Number(a.completed) - Number(b.completed));
      case 'date':
      default:
        return arr.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [filtered, sortBy]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    return { total, completed, pending: total - completed };
  }, [tasks]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addTask();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/15 text-[var(--color-accent-light)]">
            <ListTodo size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">To-Do List</h1>
            <p className="text-zinc-500 text-sm">Stay organized, get things done</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-zinc-100' },
            { label: 'Done', value: stats.completed, color: 'text-emerald-400' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
          ].map((s) => (
            <div
              key={s.label}
              className="card rounded-xl p-4 text-center border border-zinc-800/80 bg-zinc-900/60"
            >
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="card rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What needs to be done?"
              className="flex-1 bg-zinc-800/70 border border-zinc-700/60 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[var(--color-accent)]/60 focus:ring-1 focus:ring-[var(--color-accent)]/30 transition-all"
            />
            <button
              onClick={addTask}
              disabled={!text.trim()}
              className="px-4 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-light)] disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {/* Category & Priority selectors */}
          <div className="flex flex-wrap gap-2 items-center">
            <Tag size={14} className="text-zinc-500" />
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  category === c.value
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {c.value}
              </button>
            ))}

            <span className="w-px h-5 bg-zinc-800 mx-1" />

            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                  priority === p.value
                    ? `${p.color} ring-1 ${p.ring} border-transparent`
                    : 'border-zinc-700/40 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                {p.value}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar: Sort + Filter */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SortAsc size={14} className="text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-zinc-800/70 border border-zinc-700/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[var(--color-accent)]/60 transition-all cursor-pointer"
            >
              <option value="date">Date Added</option>
              <option value="priority">Priority</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
            </select>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showFilters
                ? 'border-[var(--color-accent)]/40 text-[var(--color-accent-light)] bg-[var(--color-accent)]/10'
                : 'border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
            }`}
          >
            <Filter size={13} />
            Filters
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500 w-16 shrink-0">Category</span>
              {['All', ...CATEGORIES.map((c) => c.value)].map((c) => (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    filterCategory === c
                      ? 'border-[var(--color-accent)]/50 text-[var(--color-accent-light)] bg-[var(--color-accent)]/10'
                      : 'border-zinc-700/40 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500 w-16 shrink-0">Status</span>
              {['All', 'Completed', 'Pending'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    filterStatus === s
                      ? 'border-[var(--color-accent)]/50 text-[var(--color-accent-light)] bg-[var(--color-accent)]/10'
                      : 'border-zinc-700/40 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <ListTodo size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {tasks.length === 0 ? 'No tasks yet — add one above!' : 'No tasks match your filters.'}
              </p>
            </div>
          )}

          {sorted.map((task) => {
            const catMeta = getCategoryMeta(task.category);
            const priMeta = getPriorityMeta(task.priority);

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 rounded-xl border p-3.5 transition-all duration-200 ${
                  task.completed
                    ? 'bg-zinc-900/30 border-zinc-800/50'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700/80'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 shrink-0 transition-colors"
                  aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.completed ? (
                    <CheckCircle2 size={20} className="text-emerald-500" />
                  ) : (
                    <Circle size={20} className="text-zinc-600 hover:text-zinc-400" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p
                    className={`text-sm leading-relaxed transition-all ${
                      task.completed ? 'line-through text-zinc-600' : 'text-zinc-200'
                    }`}
                  >
                    {task.text}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${catMeta.bg} ${catMeta.text} ${catMeta.border}`}
                    >
                      {task.category}
                    </span>

                    {/* Priority indicator */}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${priMeta.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${priMeta.dot}`} />
                      {task.priority}
                    </span>

                    {/* Date */}
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(task.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteTask(task.id)}
                  className="shrink-0 p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                  aria-label="Delete task"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
