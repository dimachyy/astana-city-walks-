import { useEffect, useState } from 'react'

// useState, который помнит значение в localStorage.
// Старые значения без JSON (например, имя или тема из прежней версии) читаются как обычная строка.
export function useStored(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return initial
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* localStorage недоступен — работаем без сохранения */
    }
  }, [key, value])

  return [value, setValue]
}
