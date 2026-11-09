import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [message, setMessage] = useState('')
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  const show = useCallback((text) => {
    setMessage(text)
    setVisible(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setVisible(false), 2400)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className={`toast${visible ? ' visible' : ''}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
