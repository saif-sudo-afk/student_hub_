import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { notificationsApi } from '../services/endpoints'
import { formatDateTime } from '../utils/format'

const TYPE_COLORS = {
  ASSIGNMENT_POSTED: 'bg-electric-500',
  SUBMISSION_APPROVED: 'bg-emerald-500',
  SUBMISSION_REJECTED: 'bg-red-500',
  ANNOUNCEMENT_PUBLISHED: 'bg-gold-500',
  GRADE_POSTED: 'bg-purple-500',
  DEADLINE_REMINDER: 'bg-orange-500',
}

export default function NotificationBell() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unread: 0, results: [] })
  const ref = useRef(null)

  const load = () => {
    notificationsApi.list({ page_size: 5 }).then(res => setData(res.data)).catch(() => {})
  }

  useEffect(() => {
    load()
    const id = window.setInterval(load, 60000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAll = async () => {
    await notificationsApi.readAll()
    load()
  }

  const dotColor = n => TYPE_COLORS[n.type] || 'bg-slate-500'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] transition-colors hover:bg-slate-500/10"
        aria-label={t('notifications.title')}
      >
        <Bell size={18} />
        <AnimatePresence>
          {data.unread > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-xs font-black text-navy-950"
            >
              {data.unread > 9 ? '9+' : data.unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-[340px] origin-top-right overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell size={15} className="text-gold-500" />
                <span className="font-bold text-sm">{t('notifications.latest')}</span>
                {data.unread > 0 && (
                  <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-xs font-black text-gold-600 dark:text-gold-400">
                    {data.unread} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={markAll}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-electric-500 transition-colors hover:bg-electric-500/10"
                >
                  <CheckCheck size={13} />
                  {t('notifications.markAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-[var(--color-muted)] transition-colors hover:bg-slate-500/10"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="max-h-[360px] overflow-y-auto">
              {data.results?.length ? (
                <div>
                  {data.results.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex gap-3 border-b border-[var(--color-border)] px-4 py-3.5 transition-colors last:border-0 hover:bg-slate-500/5 ${!item.is_read ? 'bg-electric-500/3' : ''}`}
                    >
                      <div className="mt-1.5 flex shrink-0 flex-col items-center gap-1">
                        <span className={`h-2 w-2 rounded-full ${item.is_read ? 'bg-[var(--color-border)]' : dotColor(item)}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${item.is_read ? 'text-[var(--color-muted)]' : 'text-[var(--color-text)]'}`}>
                          {item.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-muted)]">
                          {item.message}
                        </p>
                        <p className="mt-1.5 text-[10px] text-[var(--color-muted)]/60">
                          {formatDateTime(item.created_at, i18n.language)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell size={32} className="mb-3 text-[var(--color-muted)]/25" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-[var(--color-muted)]">{t('notifications.empty')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
