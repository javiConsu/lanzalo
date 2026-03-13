import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initPostHog, capturePageview } from '../lib/posthog'

// Inicializa PostHog una vez y captura pageviews en cada cambio de ruta
export function PostHogProvider({ children }) {
  const location = useLocation()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    capturePageview(location.pathname + location.search)
  }, [location])

  return children
}

export default PostHogProvider
