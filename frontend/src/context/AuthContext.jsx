import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const navigate = useNavigate()

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me/')
      setUser(data)
      return data
    } catch {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const access = hashParams.get('access')
      const refresh = hashParams.get('refresh')
      if (access && refresh) {
        localStorage.setItem('access_token', access)
        localStorage.setItem('refresh_token', refresh)
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }

    const token = localStorage.getItem('access_token')
    if (token) {
      fetchMe().finally(() => {
        setLoading(false)
        setInitialized(true)
      })
    } else {
      setLoading(false)
      setInitialized(true)
    }
  }, [fetchMe])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login/', { email, password })
    localStorage.setItem('access_token', data.access)
    localStorage.setItem('refresh_token', data.refresh)
    setUser(data.user)
    return data.user
  }

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/', { refresh: localStorage.getItem('refresh_token') })
    } catch {
      // ignore
    }
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setUser(null)
  }, [])

  // When api.js clears tokens after refresh failure, clear user state and go to login.
  useEffect(() => {
    const handler = () => {
      setUser(null)
      navigate('/auth/login', { replace: true })
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [navigate, logout])

  const updateUser = (updated) => {
    setUser(prev => ({ ...prev, ...updated }))
  }

  const value = {
    user,
    loading,
    initialized,
    login,
    logout,
    fetchMe,
    updateUser,
    isAdmin: user?.role === 'ADMIN',
    isProfessor: user?.role === 'PROFESSOR',
    isStudent: user?.role === 'STUDENT',
    needsPasswordChange: user?.force_password_change,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
