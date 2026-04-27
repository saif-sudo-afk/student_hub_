import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import LandingPage from './pages/landing/LandingPage'
import {
  ChangePasswordPage,
  LoginPage,
  PasswordResetConfirmPage,
  PasswordResetPage,
  RegisterPage,
  VerifyEmailPage,
} from './pages/auth/AuthPages'
import AdminDashboard from './pages/admin/AdminDashboard'
import ProfessorDashboard from './pages/professor/ProfessorDashboard'
import StudentDashboard from './pages/student/StudentDashboard'

function roleHome(user) {
  if (!user) return '/auth/login'
  if (user.force_password_change) return '/auth/change-password'
  if (user.role === 'ADMIN') return '/admin'
  if (user.role === 'PROFESSOR') return '/professor'
  return '/student'
}

function ProtectedRoute({ roles, children }) {
  const { t } = useTranslation()
  const { user, loading, initialized } = useAuth()
  const currentLocation = useLocation()

  if (loading || !initialized) {
    return <div className="grid min-h-screen place-items-center font-bold">{t('common.loading')}</div>
  }

  if (!user) return <Navigate to="/auth/login" replace />
  if (user.force_password_change && currentLocation.pathname !== '/auth/change-password') {
    return <Navigate to="/auth/change-password" replace />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user)} replace />
  }
  return children
}

function GuestRoute({ children }) {
  const { user, loading, initialized } = useAuth()
  if (loading || !initialized) return children
  if (user) return <Navigate to={roleHome(user)} replace />
  return children
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    const handler = event => {
      if (event.detail?.type === 'error') toast.error(event.detail.message)
      else toast(event.detail?.message)
    }
    window.addEventListener('student-hub-toast', handler)
    return () => window.removeEventListener('student-hub-toast', handler)
  }, [])

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/auth/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/auth/verify-email/:token" element={<VerifyEmailPage />} />
        <Route path="/auth/password-reset" element={<PasswordResetPage />} />
        <Route path="/auth/password-reset/confirm/:token" element={<PasswordResetConfirmPage />} />
        <Route path="/auth/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/professor/*" element={<ProtectedRoute roles={['PROFESSOR']}><ProfessorDashboard /></ProtectedRoute>} />
        <Route path="/student/*" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}
