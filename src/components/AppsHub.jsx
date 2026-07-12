import { Pin, PinOff, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePinnedApps } from '../context/PinnedAppsContext'
import appRegistry from '../apps/registry'

export default function AppsHub() {
  const { togglePin, isPinned } = usePinnedApps()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-8 pt-12 pb-8">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight mb-2">Apps Hub</h1>
          <p className="text-sm text-zinc-500 max-w-lg">
            A collection of integrated productivity tools and utilities. Pin your favorites to the sidebar for quick access.
          </p>
        </div>
      </div>

      {/* App Grid */}
      <div className="max-w-6xl mx-auto px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {appRegistry.map(app => {
            const Icon = app.icon
            const pinned = isPinned(app.id)

            return (
              <div
                key={app.id}
                className="card p-5 group relative flex flex-col"
              >
                {/* Pin toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePin(app.id)
                  }}
                  className={`absolute top-4 right-4 p-1.5 rounded-md transition-all duration-200 ${
                    pinned
                      ? 'text-[var(--color-accent-light)] bg-[var(--color-accent)]/10'
                      : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                  }`}
                  title={pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                >
                  {pinned ? <PinOff size={16} /> : <Pin size={16} />}
                </button>

                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${app.color}15`, border: `1px solid ${app.color}25` }}
                >
                  <Icon size={22} style={{ color: app.color }} />
                </div>

                {/* Content */}
                <h3 className="text-base font-semibold text-zinc-100 mb-1.5">{app.name}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed mb-4 flex-1">{app.description}</p>

                {/* Open button */}
                <button
                  onClick={() => navigate(app.path)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors group/btn"
                >
                  <span>Open</span>
                  <ArrowRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
