import { API_URL } from '../api.js'

const token = () => localStorage.getItem('token')

const api = {
  async get(path) {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return res.json()
  },

  async post(path, body) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.error || `API error: ${res.status}`)
      err.response = data
      err.code = data.code
      throw err
    }
    return data
  },
}

export default api
