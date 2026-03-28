import { useState, useEffect, createContext, useContext, useCallback } from 'react'

const ToastContext = createContext(null)

const TOAST_CONFIG = {
  success: {
    icon: '✓',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20',
  },
  error: {
    icon: '✕',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-300',
    iconBg: 'bg-red-500/20',
  },
  warning: {
    icon: '⚠',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
  },
  info: {
    icon: 'ℹ',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    iconBg: 'bg-blue-500/20',
  },
}

function Toast({ id, type = 'info', message, duration = 4000, onDismiss }) {
  const config = TOAST_CONFIG[type] || TOAST_CONFIG.info
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (duration <= 0) return
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(id), 200)
    }, duration)
    return () => clearTimeout(timer)
  }, [duration, id, onDismiss])

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(id), 200)
  }

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
        transition-all duration-200 min-w-[280px] max-w-[400px]
        ${config.bg} ${config.border}
        ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className={`w-6 h-6 rounded-lg ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        <span className={`text-xs font-bold ${config.text}`}>{config.icon}</span>
      </div>
      <p className={`text-sm ${config.text} flex-1 leading-snug`}>{message}</p>
      <button
        onClick={handleDismiss}
        className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { ...toast, id }])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback({
    success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => addToast({ type: 'error', message, ...options }),
    warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => addToast({ type: 'info', message, ...options }),
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-20 right-5 z-[60] flex flex-col gap-2">
          {toasts.map(t => (
            <Toast
              key={t.id}
              id={t.id}
              type={t.type}
              message={t.message}
              duration={t.duration}
              onDismiss={removeToast}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context.toast
}

export default Toast
