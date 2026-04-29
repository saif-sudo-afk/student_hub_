import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import TopControls from '../components/TopControls'
import NotificationBell from '../components/NotificationBell'

export default function DashboardLayout({ title, navItems, children }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const signOut = async () => {
    await logout()
    navigate('/auth/login')
  }

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-8 flex items-center justify-between">
        <NavLink to="/" className="text-lg font-black tracking-wide text-gold-500">STUDENT HUB</NavLink>
        <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(false)} aria-label={t('common.close')}>
          <X size={20} />
        </button>
      </div>
      <nav className="space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
      <button type="button" onClick={signOut} className="sidebar-link mt-auto">
        <LogOut size={18} />
        <span>{t('auth.signOut')}</span>
      </button>
    </aside>
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">{sidebar}</div>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-slate-950/70" onClick={() => setOpen(false)} />
            <motion.div className="absolute inset-y-0 left-0" initial={{ x: -288 }} animate={{ x: 0 }} exit={{ x: -288 }}>
              {sidebar}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-[var(--color-border)] p-2 lg:hidden" aria-label={t('common.menu')}>
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--color-muted)]">{user?.email}</p>
                <h1 className="truncate text-xl font-black md:text-2xl">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <TopControls compact />
              <div className="hidden h-10 w-10 place-items-center rounded-lg bg-gold-500 font-black text-navy-950 md:grid">
                {(user?.first_name?.[0] || 'S').toUpperCase()}
              </div>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
