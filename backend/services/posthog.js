const { PostHog } = require('posthog-node')

let client = null

function getPostHogClient() {
  if (client) return client
  const key = process.env.POSTHOG_KEY
  if (!key) return null

  client = new PostHog(key, {
    host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
    flushAt: 20,
    flushInterval: 10000
  })

  return client
}

/**
 * Captura un evento server-side
 * @param {string} distinctId - ID del usuario
 * @param {string} event - Nombre del evento
 * @param {object} properties - Propiedades adicionales
 */
function captureServerEvent(distinctId, event, properties = {}) {
  const ph = getPostHogClient()
  if (!ph || !distinctId) return

  ph.capture({ distinctId: String(distinctId), event, properties })
}

/**
 * Cierra el cliente (llamar al cerrar el proceso)
 */
async function shutdownPostHog() {
  if (client) {
    await client.shutdown()
    client = null
  }
}

module.exports = { captureServerEvent, shutdownPostHog, getPostHogClient }
