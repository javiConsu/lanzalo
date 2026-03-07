// URL base del backend
export const API_URL = import.meta.env.VITE_API_URL || 'https://lanzalo-production.up.railway.app'

export function apiUrl(path) {
  return `${API_URL}${path}`
}
// DEBUG: V1.0.1
