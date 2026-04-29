import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
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
