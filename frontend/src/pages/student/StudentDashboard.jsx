import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, CalendarDays, FileText, Home, Megaphone, Send, User, Users } from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
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

function asList(data) {
  return Array.isArray(data) ? data : data?.results || []
}

function useLoad(loader, deps = []) {
  const [data, setData] = useState(null)
  const reload = () => loader().then(res => setData(res.data)).catch(() => setData(null))
  useEffect(reload, deps)
  return { data, reload }
}

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
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-[var(--color-muted)]">{t('student.home.greeting')}</p>
          <h2 className="mt-1 text-3xl font-black">{user?.first_name}</h2>
        </section>
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 text-xl font-black">{t('student.home.upcoming')}</h3>
          <div className="grid gap-3">
            {upcoming.map(item => (
              <div key={item.id} className="rounded-lg bg-slate-500/5 p-4">
                <p className="font-bold">{item.title}</p>
                <p className="text-sm text-[var(--color-muted)]">{formatDateTime(item.deadline)}</p>
              </div>
            ))}
            {!upcoming.length && <p className="text-[var(--color-muted)]">{t('student.home.noUpcoming')}</p>}
          </div>
        </section>
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-4 text-xl font-black">{t('student.home.latestAnnouncements')}</h3>
          <div className="grid gap-3">
            {asList(announcements.data).map(item => (
              <article key={item.id} className="rounded-lg bg-slate-500/5 p-4">
                <p className="font-bold">{item.title}</p>
                <p className="line-clamp-2 text-sm text-[var(--color-muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <aside className="space-y-5">
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <ProgressRing value={user?.student_profile?.activity_score} label={t('student.home.activityScore')} />
        </section>
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="mb-3 text-xl font-black">{t('student.home.reminders')}</h3>
          <p className="text-sm text-[var(--color-muted)]">{t('student.home.reminderBody')}</p>
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
      await assignmentsApi.submit(selected.id, payload, event => setProgress(Math.round((event.loaded * 100) / event.total)))
      toast.success(t('student.assignments.submitted'))
      setSelected(null)
      setFiles([])
      assignments.reload()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {asList(assignments.data).map(item => {
          const tone = deadlineTone(item.deadline)
          return (
            <motion.article key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" whileHover={{ y: -3 }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-electric-500">{item.type}</p>
                  <h3 className="mt-1 text-xl font-black">{item.title}</h3>
                </div>
                <span className={`badge-${tone}`}>{formatDateTime(item.deadline)}</span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-[var(--color-muted)]">{item.description}</p>
              <p className="mt-4 text-sm text-[var(--color-muted)]">{t('student.assignments.by', { professor: item.professor_name })}</p>
              <button type="button" className="btn-primary mt-5 w-full" onClick={() => setSelected(item)}>{t('student.assignments.submit')}</button>
            </motion.article>
          )
        })}
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

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {asList(groups.data).map(group => (
        <article key={group.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h3 className="text-xl font-black">{group.name}</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">{t('student.groups.leader', { leader: group.leader_name })}</p>
          <div className="mt-4 space-y-2">
            {group.member_details?.map(member => (
              <div key={member.id} className="rounded-lg bg-slate-500/5 p-3 text-sm">
                <p className="font-semibold">{member.name}</p>
                <p className="text-[var(--color-muted)]">{member.email} · {member.phone}</p>
              </div>
            ))}
          </div>
          <button type="button" className="btn-primary mt-5 w-full" onClick={() => setSelected(group)}>
            <Send size={18} />
            {t('student.groups.submitProject')}
          </button>
        </article>
      ))}
      <AccessibleModal open={!!selected} title={selected?.name || ''} onClose={() => setSelected(null)}>
        <form className="space-y-4" onSubmit={submit}>
          <input className="input-field" type="url" value={link} onChange={event => setLink(event.target.value)} placeholder={t('forms.projectLink')} required />
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
        {['ALL', 'ADMIN', 'PROFESSOR'].map(key => <button key={key} type="button" className={filter === key ? 'btn-primary px-4 py-2' : 'btn-secondary px-4 py-2'} onClick={() => setFilter(key)}>{t(`student.announcements.filters.${key}`)}</button>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(item => (
          <article key={item.id} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-sm font-bold text-gold-500">{item.author_role}</p>
            <h3 className="mt-1 text-xl font-black">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function CalendarSection() {
  const { i18n } = useTranslation()
  const events = useLoad(() => academicsApi.events({ page_size: 100 }), [])
  const palette = { LOW: '#3b82f6', MEDIUM: '#f59e0b', HIGH: '#f97316', URGENT: '#ef4444' }
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView="dayGridMonth"
        locale={i18n.language}
        height="auto"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' }}
        events={asList(events.data).map(item => ({ id: item.id, title: item.title, date: item.event_date, backgroundColor: palette[item.priority] }))}
      />
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
      <button className="btn-primary" type="button" onClick={markAll}>{t('notifications.markAll')}</button>
      <DataTable
        rows={asList(notifications.data)}
        columns={[
          { key: 'title', labelKey: 'tables.title' },
          { key: 'message', labelKey: 'tables.message' },
          { key: 'created_at', labelKey: 'tables.date', render: row => formatDateTime(row.created_at) },
          { key: 'actions', labelKey: 'tables.actions', render: row => <button type="button" className="btn-secondary px-3 py-2" onClick={() => markRead(row.id)}>{t('notifications.markRead')}</button> },
        ]}
      />
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
    Object.entries(form).forEach(([key, value]) => payload.append(key, value))
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
    <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <form className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={save}>
        {['first_name', 'last_name', 'phone_number'].map(key => (
          <label key={key} className="block">
            <span className="label">{t(`forms.${key}`)}</span>
            <input className="input-field" value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
        <label className="block">
          <span className="label">{t('forms.profilePicture')}</span>
          <input className="input-field" type="file" accept="image/*" onChange={event => setPicture(event.target.files?.[0])} />
        </label>
        <button className="btn-primary w-full" type="submit">{t('common.save')}</button>
      </form>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="text-2xl font-black">{t('student.profile.stats')}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <ProgressRing value={user?.student_profile?.activity_score} label={t('tables.activityScore')} />
          <ProgressRing value={user?.student_profile?.submission_rate} label={t('tables.submissionRate')} />
        </div>
        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between"><dt>{t('forms.email')}</dt><dd>{user?.email}</dd></div>
          <div className="flex justify-between"><dt>{t('forms.major')}</dt><dd>{user?.student_profile?.major_name}</dd></div>
          <div className="flex justify-between"><dt>{t('forms.year')}</dt><dd>{user?.student_profile?.year_of_study}</dd></div>
        </dl>
      </div>
    </section>
  )
}

export default function StudentDashboard() {
  const { t } = useTranslation()
  const location = useLocation()
  const section = location.pathname.split('/')[2] || 'home'
  const content = {
    home: <HomeSection />,
    assignments: <AssignmentsSection />,
    groups: <GroupsSection />,
    announcements: <AnnouncementsSection />,
    calendar: <CalendarSection />,
    notifications: <NotificationsSection />,
    profile: <ProfileSection />,
  }[section] || <HomeSection />

  return (
    <DashboardLayout title={t(`student.nav.${section}`)} navItems={studentNav}>
      {content}
    </DashboardLayout>
  )
}
