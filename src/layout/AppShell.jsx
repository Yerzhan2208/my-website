import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onOpen={() => setMobileOpen(true)} />
      <main className="flex-1 md:ml-[240px] min-h-screen transition-all duration-300">
        <Outlet context={{ onOpenSidebar: () => setMobileOpen(true) }} />
      </main>
    </div>
  )
}
