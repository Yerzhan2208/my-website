import { NavLink, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Pin, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePinnedApps } from '../context/PinnedAppsContext'
import appRegistry from '../apps/registry'
import { useState } from 'react'

export default function Sidebar() {
  const { pinnedApps } = usePinnedApps()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const pinnedAppData = appRegistry.filter(app => pinnedApps.includes(app.id))

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
    ${isActive
      ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent-light)] border border-[var(--color-accent)]/20'
      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
    }`

  return (
    <aside
      className={`fixed top-0 left-0 h-screen flex flex-col border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur-sm z-40 transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-zinc-800/80 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-dark)] flex items-center justify-center text-white font-bold text-sm shrink-0">
          YP
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-sm font-semibold text-zinc-100 leading-tight">Yerzhan P.</p>
            <p className="text-[11px] text-zinc-500 leading-tight">Portfolio & Apps</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Main nav */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
              Navigation
            </p>
          )}
          <NavLink to="/" className={linkClass} title="Home">
            <Home size={18} className="shrink-0" />
            {!collapsed && <span>Home</span>}
          </NavLink>
          <NavLink to="/apps" className={linkClass} title="Apps Hub">
            <LayoutGrid size={18} className="shrink-0" />
            {!collapsed && <span>Apps Hub</span>}
          </NavLink>
        </div>

        {/* Pinned Apps */}
        {pinnedAppData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-zinc-800/60">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                <Pin size={10} />
                Pinned Apps
              </p>
            )}
            <div className="space-y-1 stagger-children">
              {pinnedAppData.map(app => {
                const Icon = app.icon
                return (
                  <NavLink
                    key={app.id}
                    to={app.path}
                    className={linkClass}
                    title={app.name}
                  >
                    <Icon size={18} style={{ color: app.color }} className="shrink-0" />
                    {!collapsed && <span>{app.name}</span>}
                  </NavLink>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-zinc-800/80 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
