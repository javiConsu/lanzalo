import { API_URL } from '../api.js'

const token = () => localStorage.getItem('token')

function requireToken() {
  const t = token()
  if (!t) {
    const err = new Error('No hay sesión activa. Por favor, inicia sesión.')
    err.code = 'UNAUTHENTICATED'
    throw err
  }
  return t
}

const api = {
  async get(path) {
    const t = requireToken()
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async post(path, body) {
    const t = requireToken()
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${t}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.error || `API error: ${res.status}`)
      err.response = data
      err.status = res.status
      err.code = data.code
      throw err
    }
    return data
  },
}

export default api
