import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com'

let initialized = false

export function initPostHog() {
  if (initialized || !POSTHOG_KEY) return

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,        // control manual de eventos
    capture_pageview: false,   // capturas manuales en rutas
    persistence: 'localStorage',
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing()  // no trackear en dev por defecto
    }
  })

  initialized = true
}

export function identifyUser(userId, properties = {}) {
  if (!initialized) return
  posthog.identify(userId, properties)
}

export function captureEvent(event, properties = {}) {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function capturePageview(path) {
  if (!initialized) return
  posthog.capture('$pageview', { $current_url: path })
}

export function resetUser() {
  if (!initialized) return
  posthog.reset()
}

export default posthog
