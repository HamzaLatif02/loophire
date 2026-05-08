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
      window.location.href = '/login'
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after']
      error.rateLimitMessage = retryAfter
        ? `Too many requests. Please wait ${retryAfter} seconds before trying again.`
        : 'Too many requests. Please slow down and try again shortly.'
    }
    return Promise.reject(error)
  },
)

export default api
