import { useState, useEffect, useCallback } from 'react'

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (e) {
      console.warn('Failed to save to localStorage:', e)
    }
  }, [key, storedValue])

  const setValue = useCallback((value) => {
    setStoredValue(prev => typeof value === 'function' ? value(prev) : value)
  }, [])

  return [storedValue, setValue]
}
