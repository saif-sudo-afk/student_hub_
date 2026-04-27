import { useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { notificationsApi } from '../services/endpoints'
import { formatDateTime } from '../utils/format'

export default function NotificationBell() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState({ unread: 0, results: [] })

  const load = () => {
    notificationsApi.list({ page_size: 5 }).then(res => setData(res.data)).catch(() => {})
  }

  useEffect(() => {
    load()
    const id = window.setInterval(load, 60000)
    return () => window.clearInterval(id)
  }, [])

  const markAll = async () => {
    await notificationsApi.readAll()
    load()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] hover:bg-slate-500/10"
        aria-label={t('notifications.title')}
      >
        <Bell size={18} />
        {data.unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold-500 px-1 text-xs font-bold text-navy-950">
            {data.unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-3 w-80 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">{t('notifications.latest')}</h3>
            <button type="button" onClick={markAll} className="text-xs font-semibold text-electric-500">
              <CheckCheck className="mr-1 inline" size={14} />
              {t('notifications.markAll')}
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {data.results?.length ? data.results.map(item => (
              <div key={item.id} className="rounded-lg bg-slate-500/5 p-3 text-sm">
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-[var(--color-muted)]">{item.message}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{formatDateTime(item.created_at, i18n.language)}</p>
              </div>
            )) : (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">{t('notifications.empty')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
