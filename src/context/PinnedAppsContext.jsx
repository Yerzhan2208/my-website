import { createContext, useContext, useState, useEffect } from 'react'

const PinnedAppsContext = createContext(null)

const STORAGE_KEY = 'yp-pinned-apps'

export function PinnedAppsProvider({ children }) {
  const [pinnedApps, setPinnedApps] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedApps))
  }, [pinnedApps])

  const togglePin = (appId) => {
    setPinnedApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    )
  }

  const isPinned = (appId) => pinnedApps.includes(appId)

  return (
    <PinnedAppsContext.Provider value={{ pinnedApps, togglePin, isPinned }}>
      {children}
    </PinnedAppsContext.Provider>
  )
}

export function usePinnedApps() {
  const ctx = useContext(PinnedAppsContext)
  if (!ctx) throw new Error('usePinnedApps must be used within PinnedAppsProvider')
  return ctx
}
