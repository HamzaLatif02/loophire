import axios from 'axios'
import { getToken, removeToken } from './auth'

const base = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({ baseURL: base })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      localStorage.removeItem('loophire_is_demo')
      window.location.href = '/'
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      error.userMessage = retryAfter
        ? `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        : 'Too many requests. Please slow down and try again shortly.'
    }
    if (error.response?.status === 422) {
      const data = error.response.data
      if (data?.errors && Array.isArray(data.errors)) {
        error.userMessage = data.errors
          .map(e => (e.field ? `${e.field}: ${e.message}` : e.message))
          .join('\n')
      } else {
        error.userMessage = data?.detail || 'Please check your inputs and try again.'
      }
    }
    if (
      error.response?.status === 403 &&
      error.response?.data?.detail?.includes('demo mode')
    ) {
      error.userMessage = error.response.data.detail
    }
    return Promise.reject(error)
  },
)

export default api
