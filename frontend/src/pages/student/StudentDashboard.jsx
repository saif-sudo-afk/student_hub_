import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, CalendarDays, ChevronLeft, ChevronRight, FileText,
  Home, Megaphone, Send, User, Users,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import AccessibleModal from '../../components/AccessibleModal'
import DataTable from '../../components/DataTable'
import FileDropzone from '../../components/FileDropzone'
import ProgressRing from '../../components/ProgressRing'
import DashboardLayout from '../../layouts/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import api, { apiErrorMessage } from '../../services/api'
import { academicsApi, announcementsApi, assignmentsApi, notificationsApi } from '../../services/endpoints'
import { buildMultipart } from '../../utils/files'
import { deadlineTone, formatDateTime } from '../../utils/format'

const studentNav = [
  { to: '/student', end: true, labelKey: 'student.nav.home', icon: Home },
  { to: '/student/assignments', labelKey: 'student.nav.assignments', icon: FileText },
  { to: '/student/groups', labelKey: 'student.nav.groups', icon: Users },
  { to: '/student/announcements', labelKey: 'student.nav.announcements', icon: Megaphone },
  { to: '/student/calendar', labelKey: 'student.nav.calendar', icon: CalendarDays },
  { to: '/student/notifications', labelKey: 'student.nav.notifications', icon: Bell },
  { to: '/student/profile', labelKey: 'student.nav.profile', icon: User },
]

const PRIORITY_COLORS = {
  LOW:    { bg: 'bg-blue-500/15',   text: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500',   border: 'border-blue-500/30' },
  MEDIUM: { bg: 'bg-amber-500/15',  text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500',  border: 'border-amber-500/30' },
  HIGH:   { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', border: 'border-orange-500/30' },
  URGENT: { bg: 'bg-red-500/15',    text: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500',    border: 'border-red-500/30' },
}

function asList(data) {
  return Array.isArray(data) ? data : data?.results || []
}

function useLoad(loader, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const run = useCallback(() => {
    setLoading(true)
    loaderRef.current()
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => { setData(null); setLoading(false) })
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, deps)

  return { data, loading, reload: run }
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--color-border)] ${className}`} />
}

/* ─── Custom Academic Calendar ──────────────────────────────────────── */

function AcademicCalendar({ events, onEventClick }) {
  const [viewDate, setViewDate] = useState(new Date())
  const today = new Date()
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDOW = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()

  const monthLabel = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = i - firstDOW + 1
    if (d < 1) cells.push({ date: new Date(year, month - 1, daysInPrev + d), current: false })
    else if (d > daysInMonth) cells.push({ date: new Date(year, month + 1, d - daysInMonth), current: false })
    else cells.push({ date: new Date(year, month, d), current: true })
  }

  const eventsOnDate = date =>
    events.filter(e => new Date(e.event_date).toDateString() === date.toDateString())

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-black">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewDate(new Date())}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-gold-500 hover:bg-gold-500/10"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] transition-colors hover:border-gold-500 hover:bg-gold-500/10"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] transition-colors hover:border-gold-500 hover:bg-gold-500/10"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="mb-1 grid grid-cols-7">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 border-l border-t border-[var(--color-border)]">
        {cells.map((cell, i) => {
          const ev = eventsOnDate(cell.date)
          const isToday = cell.date.toDateString() === today.toDateString()
          return (
            <div
              key={i}
              className={`min-h-[76px] border-b border-r border-[var(--color-border)] p-1.5 transition-colors
                ${!cell.current ? 'bg-[var(--color-bg)]/70' : ''}
                ${isToday ? 'bg-gold-500/5' : ''}
              `}
            >
              <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                ${isToday ? 'bg-gold-500 text-navy-950' : cell.current ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]/40'}
              `}>
                {cell.date.getDate()}
              </span>
              <div className="space-y-0.5">
                {ev.slice(0, 2).map(event => {
                  const p = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.MEDIUM
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onEventClick?.(event)}
                      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold transition-opacity hover:opacity-70 ${p.bg} ${p.text}`}
                    >
                      {event.title}
                    </button>
                  )
                })}
                {ev.length > 2 && (
                  <p className="pl-1 text-[10px] text-[var(--color-muted)]">+{ev.length - 2}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UpcomingEvents({ events, onEventClick }) {
  const upcoming = events
    .filter(e => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 8)

  return (
    <div>
      <h3 className="mb-3 font-black text-base">Upcoming Events</h3>
      <div className="space-y-2">
        {upcoming.length ? upcoming.map((event, i) => {
          const p = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.MEDIUM
          return (
            <motion.button
              key={event.id}
              type="button"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onEventClick?.(event)}
              className="w-full rounded-lg border border-[var(--color-border)] p-3 text-left transition-all hover:border-gold-500/50 hover:bg-gold-500/5"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${p.dot}`} />
                <p className="truncate text-sm font-semibold">{event.title}</p>
              </div>
              <p className="mt-1 pl-4 text-xs text-[var(--color-muted)]">
                {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </motion.button>
          )
        }) : (
          <p className="py-6 text-center text-sm text-[var(--color-muted)]">No upcoming events</p>
        )}
      </div>
    </div>
  )
}

/* ─── Sections ───────────────────────────────────────────────────────── */

function HomeSection() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const assignments = useLoad(() => assignmentsApi.list({ page_size: 100 }), [])
  const announcements = useLoad(() => announcementsApi.list({ page_size: 3 }), [])

  const upcoming = asList(assignments.data)
    .filter(item => new Date(item.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 3)

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* Greeting */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-muted)]">{t('student.home.greeting')}</p>
          <h2 className="mt-1 text-3xl font-black">{user?.first_name} {user?.last_name}</h2>
          {user?.student_profile?.major_name && (
            <span className="mt-2 inline-flex rounded-full bg-electric-500/10 px-3 py-1 text-xs font-bold text-electric-500">
              {user.student_profile.major_name}
            </span>
          )}
        </section>

        {/* Upcoming assignments */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 font-black text-base">{t('student.home.upcoming')}</h3>
          {assignments.loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((item, i) => {
                const tone = deadlineTone(item.deadline)
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-4"
                  >
                    <div>
                      <p className="font-semibold text-sm">{item.title}</p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">{item.type} · {item.professor_name}</p>
                    </div>
                    <span className={`badge-${tone} shrink-0 ml-3`}>{formatDateTime(item.deadline)}</span>
                  </motion.div>
                )
              })}
              {!upcoming.length && (
                <p className="py-4 text-center text-sm text-[var(--color-muted)]">{t('student.home.noUpcoming')}</p>
              )}
            </div>
          )}
        </section>

        {/* Latest announcements */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 font-black text-base">{t('student.home.latestAnnouncements')}</h3>
          {announcements.loading ? (
            <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>
          ) : (
            <div className="space-y-3">
              {asList(announcements.data).map((item, i) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-lg border border-[var(--color-border)] p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-xs font-bold text-gold-600 dark:text-gold-400">
                      {item.author_role}
                    </span>
                  </div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-muted)]">{item.description}</p>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <ProgressRing value={user?.student_profile?.activity_score} label={t('student.home.activityScore')} />
        </section>
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-2 font-black text-base">{t('student.home.reminders')}</h3>
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">{t('student.home.reminderBody')}</p>
        </section>
      </aside>
    </div>
  )
}

function AssignmentsSection() {
  const { t } = useTranslation()
  const assignments = useLoad(() => assignmentsApi.list({ page_size: 100 }), [])
  const [selected, setSelected] = useState(null)
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)

  const submit = async event => {
    event.preventDefault()
    if (!selected) return
    try {
      const payload = buildMultipart({}, 'files', files)
      await assignmentsApi.submit(selected.id, payload, e => setProgress(Math.round((e.loaded * 100) / e.total)))
      toast.success(t('student.assignments.submitted'))
      setSelected(null)
      setFiles([])
      assignments.reload()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  if (assignments.loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52" />)}
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {asList(assignments.data).map((item, i) => {
          const tone = deadlineTone(item.deadline)
          return (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm transition-shadow hover:shadow-md"
              whileHover={{ y: -3 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-electric-500/10 px-2 py-0.5 text-xs font-black text-electric-500">{item.type}</span>
                  <h3 className="mt-2 font-black leading-snug">{item.title}</h3>
                </div>
                <span className={`badge-${tone} shrink-0`}>{formatDateTime(item.deadline)}</span>
              </div>
              <p className="mt-3 flex-1 line-clamp-3 text-sm leading-relaxed text-[var(--color-muted)]">{item.description}</p>
              <p className="mt-3 text-xs text-[var(--color-muted)]">{t('student.assignments.by', { professor: item.professor_name })}</p>
              <button type="button" className="btn-primary mt-4 w-full" onClick={() => setSelected(item)}>
                {t('student.assignments.submit')}
              </button>
            </motion.article>
          )
        })}
        {!asList(assignments.data).length && (
          <p className="col-span-3 py-12 text-center text-[var(--color-muted)]">No assignments found.</p>
        )}
      </div>
      <AccessibleModal open={!!selected} title={selected?.title || ''} onClose={() => setSelected(null)}>
        <form className="space-y-4" onSubmit={submit}>
          <FileDropzone files={files} setFiles={setFiles} progress={progress} />
          <button className="btn-primary w-full" type="submit">{t('common.submit')}</button>
        </form>
      </AccessibleModal>
    </section>
  )
}

function GroupsSection() {
  const { t } = useTranslation()
  const groups = useLoad(() => assignmentsApi.groups({ page_size: 100 }), [])
  const [selected, setSelected] = useState(null)
  const [link, setLink] = useState('')

  const submit = async event => {
    event.preventDefault()
    try {
      await assignmentsApi.submitGroupLink(selected.id, { link_url: link })
      toast.success(t('student.groups.submitted'))
      setSelected(null)
      setLink('')
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  if (groups.loading) {
    return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-56" />)}</div>
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {asList(groups.data).map((group, i) => (
        <motion.article
          key={group.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        >
          <h3 className="font-black">{group.name}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{t('student.groups.leader', { leader: group.leader_name })}</p>
          <div className="mt-3 space-y-2">
            {group.member_details?.map(member => (
              <div key={member.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm">
                <p className="font-semibold">{member.name}</p>
                <p className="text-xs text-[var(--color-muted)]">{member.email}</p>
              </div>
            ))}
          </div>
          <button type="button" className="btn-primary mt-4 w-full" onClick={() => setSelected(group)}>
            <Send size={16} />
            {t('student.groups.submitProject')}
          </button>
        </motion.article>
      ))}
      <AccessibleModal open={!!selected} title={selected?.name || ''} onClose={() => setSelected(null)}>
        <form className="space-y-4" onSubmit={submit}>
          <input className="input-field" type="url" value={link} onChange={e => setLink(e.target.value)} placeholder={t('forms.projectLink')} required />
          <button className="btn-primary w-full" type="submit">{t('common.submit')}</button>
        </form>
      </AccessibleModal>
    </section>
  )
}

function AnnouncementsSection() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState('ALL')
  const announcements = useLoad(() => announcementsApi.list({ page_size: 100 }), [])
  const rows = asList(announcements.data).filter(item => filter === 'ALL' || item.author_role === filter)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['ALL', 'ADMIN', 'PROFESSOR'].map(key => (
          <button
            key={key}
            type="button"
            className={filter === key ? 'btn-primary px-4 py-2' : 'btn-secondary px-4 py-2'}
            onClick={() => setFilter(key)}
          >
            {t(`student.announcements.filters.${key}`)}
          </button>
        ))}
      </div>
      {announcements.loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item, i) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <span className="rounded-full bg-gold-500/10 px-2 py-0.5 text-xs font-bold text-gold-600 dark:text-gold-400">
                {item.author_role}
              </span>
              <h3 className="mt-2 font-black">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.description}</p>
            </motion.article>
          ))}
          {!rows.length && <p className="col-span-2 py-10 text-center text-[var(--color-muted)]">No announcements.</p>}
        </div>
      )}
    </section>
  )
}

function CalendarSection() {
  const events = useLoad(() => academicsApi.events({ page_size: 100 }), [])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const allEvents = asList(events.data)

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_260px]">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        {events.loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-[420px]" />
          </div>
        ) : (
          <AcademicCalendar events={allEvents} onEventClick={setSelectedEvent} />
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        {events.loading ? (
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}</div>
        ) : (
          <UpcomingEvents events={allEvents} onEventClick={setSelectedEvent} />
        )}
      </div>

      {/* Priority legend */}
      <div className="xl:col-span-2 flex flex-wrap gap-3">
        {Object.entries(PRIORITY_COLORS).map(([key, c]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)]">
            <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
            {key.charAt(0) + key.slice(1).toLowerCase()} Priority
          </div>
        ))}
      </div>

      {/* Event detail modal */}
      <AccessibleModal open={!!selectedEvent} title={selectedEvent?.title || ''} onClose={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${PRIORITY_COLORS[selectedEvent.priority]?.dot || 'bg-slate-500'}`} />
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PRIORITY_COLORS[selectedEvent.priority]?.bg || ''} ${PRIORITY_COLORS[selectedEvent.priority]?.text || ''}`}>
                {selectedEvent.priority} priority
              </span>
            </div>
            <p className="font-semibold text-sm">
              {new Date(selectedEvent.event_date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
            {selectedEvent.description && (
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">{selectedEvent.description}</p>
            )}
            {selectedEvent.major_name && (
              <p className="text-xs text-[var(--color-muted)]">Major: {selectedEvent.major_name}</p>
            )}
          </div>
        )}
      </AccessibleModal>
    </section>
  )
}

function NotificationsSection() {
  const { t } = useTranslation()
  const notifications = useLoad(() => notificationsApi.list({ page_size: 100 }), [])
  const markRead = id => notificationsApi.read(id).then(notifications.reload)
  const markAll = () => notificationsApi.readAll().then(notifications.reload)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">{t('notifications.title')}</h2>
        <button className="btn-primary" type="button" onClick={markAll}>{t('notifications.markAll')}</button>
      </div>
      {notifications.loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <div className="space-y-2">
          {asList(notifications.data).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-colors
                ${item.is_read ? 'border-[var(--color-border)] bg-[var(--color-surface)]' : 'border-electric-500/30 bg-electric-500/5'}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-[var(--color-border)]' : 'bg-electric-500'}`} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">{item.message}</p>
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]/70">{formatDateTime(item.created_at)}</p>
                </div>
              </div>
              {!item.is_read && (
                <button type="button" className="shrink-0 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-electric-500 hover:text-electric-500" onClick={() => markRead(item.id)}>
                  {t('notifications.markRead')}
                </button>
              )}
            </motion.div>
          ))}
          {!asList(notifications.data).length && (
            <p className="py-10 text-center text-sm text-[var(--color-muted)]">{t('notifications.empty')}</p>
          )}
        </div>
      )}
    </section>
  )
}

function ProfileSection() {
  const { t } = useTranslation()
  const { user, fetchMe } = useAuth()
  const [form, setForm] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone_number: user?.phone_number || '' })
  const [picture, setPicture] = useState(null)

  useEffect(() => {
    setForm({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone_number: user?.phone_number || '' })
  }, [user])

  const save = async event => {
    event.preventDefault()
    const payload = new FormData()
    Object.entries(form).forEach(([k, v]) => payload.append(k, v))
    if (picture) payload.append('profile_picture', picture)
    try {
      await api.patch('/auth/me/', payload)
      await fetchMe()
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <form className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6" onSubmit={save}>
        <h2 className="font-black text-xl">Edit Profile</h2>
        {['first_name', 'last_name', 'phone_number'].map(key => (
          <label key={key} className="block">
            <span className="label">{t(`forms.${key}`)}</span>
            <input className="input-field" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
          </label>
        ))}
        <label className="block">
          <span className="label">{t('forms.profilePicture')}</span>
          <input className="input-field" type="file" accept="image/*" onChange={e => setPicture(e.target.files?.[0])} />
        </label>
        <button className="btn-primary w-full" type="submit">{t('common.save')}</button>
      </form>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-5 font-black text-xl">{t('student.profile.stats')}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ProgressRing value={user?.student_profile?.activity_score} label={t('tables.activityScore')} />
          <ProgressRing value={user?.student_profile?.submission_rate} label={t('tables.submissionRate')} />
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          {[
            [t('forms.email'), user?.email],
            [t('forms.major'), user?.student_profile?.major_name],
            [t('forms.year'), user?.student_profile?.year_of_study],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-lg bg-[var(--color-bg)] px-4 py-2">
              <dt className="text-[var(--color-muted)]">{label}</dt>
              <dd className="font-semibold">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ─── Main component ─────────────────────────────────────────────────── */

export default function StudentDashboard() {
  const { t } = useTranslation()
  const location = useLocation()
  const section = location.pathname.split('/')[2] || 'home'

  const content = useMemo(() => {
    switch (section) {
      case 'assignments': return <AssignmentsSection />
      case 'groups': return <GroupsSection />
      case 'announcements': return <AnnouncementsSection />
      case 'calendar': return <CalendarSection />
      case 'notifications': return <NotificationsSection />
      case 'profile': return <ProfileSection />
      default: return <HomeSection />
    }
  }, [section])

  return (
    <DashboardLayout title={t(`student.nav.${section === 'home' ? 'home' : section}`)} navItems={studentNav}>
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  )
}
