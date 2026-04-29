import axios from 'axios'

function isLocalhostUrl(url) {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function isLocalPage() {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

function apiBaseURL() {
  const configured = import.meta.env.VITE_API_URL?.trim()
  const localPage = isLocalPage()

  if (localPage) return configured || 'http://localhost:8000/api/v1'
  if (!configured || isLocalhostUrl(configured) || configured.startsWith('/_/backend/')) {
    return '/api/v1'
  }
  return configured
}

const api = axios.create({
  baseURL: apiBaseURL(),
  withCredentials: true,
})

let refreshPromise = null

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error)
    }

    original._retry = true
    refreshPromise ||= api
      .post('/auth/token/refresh/', {
        refresh: localStorage.getItem('refresh_token'),
      })
      .finally(() => {
        refreshPromise = null
      })

    const { data } = await refreshPromise
    if (data?.access) {
      localStorage.setItem('access_token', data.access)
      original.headers.Authorization = `Bearer ${data.access}`
    }
    return api(original)
  },
)

export function apiErrorMessage(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const firstKey = Object.keys(data)[0]
  const firstValue = data[firstKey]
  if (Array.isArray(firstValue)) return firstValue[0]
  if (typeof firstValue === 'string') return firstValue
  return fallback
}

export default api
