import {
  CheckSquare,
  CalendarDays,
  Timer,
  Brain,
  Activity,
  DollarSign,
  FileText,
  BookOpen,
  Languages,
  Layers,
} from 'lucide-react'

import TodoApp from '../apps/TodoApp'
import CalendarApp from '../apps/CalendarApp'
import PomodoroApp from '../apps/PomodoroApp'
import MathGameApp from '../apps/MathGameApp'
import HabitTrackerApp from '../apps/HabitTrackerApp'
import ExpensesApp from '../apps/ExpensesApp'
import NotesApp from '../apps/NotesApp'
import MangaReaderApp from '../apps/MangaReaderApp'
import TranslatorApp from '../apps/TranslatorApp'
import PdfOperatorApp from '../apps/PdfOperatorApp'

const appRegistry = [
  {
    id: 'todo',
    name: 'To-Do List',
    description: 'Task management with categories, priorities, and smart sorting.',
    icon: CheckSquare,
    color: '#34d399',
    component: TodoApp,
    path: '/apps/todo',
  },
  {
    id: 'calendar',
    name: 'Calendar',
    description: 'Monthly grid view with custom event tracking and occasion management.',
    icon: CalendarDays,
    color: '#60a5fa',
    component: CalendarApp,
    path: '/apps/calendar',
  },
  {
    id: 'pomodoro',
    name: 'Pomodoro Timer',
    description: 'Focus timer with 25/5/15 intervals, pause controls, and audio cues.',
    icon: Timer,
    color: '#f87171',
    component: PomodoroApp,
    path: '/apps/pomodoro',
  },
  {
    id: 'math-game',
    name: 'Math Trainer',
    description: 'Zetamac-style mental math speed training with score tracking.',
    icon: Brain,
    color: '#a78bfa',
    component: MathGameApp,
    path: '/apps/math-game',
  },
  {
    id: 'habits',
    name: 'Habit Tracker',
    description: 'Daily check-off grid with streak metrics across weekly spans.',
    icon: Activity,
    color: '#fbbf24',
    component: HabitTrackerApp,
    path: '/apps/habits',
  },
  {
    id: 'expenses',
    name: 'Expenses',
    description: 'Bookkeeping ledger with balance summaries and category tracking.',
    icon: DollarSign,
    color: '#2dd4bf',
    component: ExpensesApp,
    path: '/apps/expenses',
  },
  {
    id: 'notes',
    name: 'Notes',
    description: 'Markdown editor with live preview and auto-saving.',
    icon: FileText,
    color: '#fb923c',
    component: NotesApp,
    path: '/apps/notes',
  },
  {
    id: 'manga',
    name: 'Manga Reader',
    description: 'Webtoon-style vertical reading hub with title browsing.',
    icon: BookOpen,
    color: '#f472b6',
    component: MangaReaderApp,
    path: '/apps/manga',
  },
  {
    id: 'translator',
    name: 'Translator',
    description: 'Dual-panel translation interface with language selection.',
    icon: Languages,
    color: '#818cf8',
    component: TranslatorApp,
    path: '/apps/translator',
  },
  {
    id: 'pdf-operator',
    name: 'PDF Operator',
    description: 'Merge, split, compress, and convert PDFs — all client-side.',
    icon: Layers,
    color: '#f43f5e',
    component: PdfOperatorApp,
    path: '/apps/pdf-operator',
  },
]
export default appRegistry
