import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppShell() {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <main className="flex-1 ml-[240px] min-h-screen transition-all duration-300">
        <Outlet />
      </main>
    </div>
  )
}
