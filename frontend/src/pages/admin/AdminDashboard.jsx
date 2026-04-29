import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Plus,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import AccessibleModal from '../../components/AccessibleModal'
import DataTable from '../../components/DataTable'
import DashboardLayout from '../../layouts/DashboardLayout'
import { adminApi, academicsApi, announcementsApi, pedagogiqueApi } from '../../services/endpoints'
import { apiErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

const PRIORITY_COLORS = {
  LOW:    { bg: 'bg-blue-500/15',   text: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500' },
  MEDIUM: { bg: 'bg-amber-500/15',  text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  HIGH:   { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  URGENT: { bg: 'bg-red-500/15',    text: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500' },
}

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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-black">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setViewDate(new Date())} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold transition-colors hover:border-gold-500 hover:bg-gold-500/10">Today</button>
          <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] transition-colors hover:border-gold-500 hover:bg-gold-500/10"><ChevronLeft size={14} /></button>
          <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-border)] transition-colors hover:border-gold-500 hover:bg-gold-500/10"><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="mb-1 grid grid-cols-7">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 border-l border-t border-[var(--color-border)]">
        {cells.map((cell, i) => {
          const ev = eventsOnDate(cell.date)
          const isToday = cell.date.toDateString() === today.toDateString()
          return (
            <div key={i} className={`min-h-[70px] border-b border-r border-[var(--color-border)] p-1.5 ${!cell.current ? 'bg-[var(--color-bg)]/70' : ''} ${isToday ? 'bg-gold-500/5' : ''}`}>
              <span className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-gold-500 text-navy-950' : cell.current ? 'text-[var(--color-text)]' : 'text-[var(--color-muted)]/40'}`}>
                {cell.date.getDate()}
              </span>
              <div className="space-y-0.5">
                {ev.slice(0, 2).map(event => {
                  const p = PRIORITY_COLORS[event.priority] || PRIORITY_COLORS.MEDIUM
                  return (
                    <button key={event.id} type="button" onClick={() => onEventClick?.(event)} className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold transition-opacity hover:opacity-70 ${p.bg} ${p.text}`}>
                      {event.title}
                    </button>
                  )
                })}
                {ev.length > 2 && <p className="pl-1 text-[10px] text-[var(--color-muted)]">+{ev.length - 2}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const adminNav = [
  { to: '/admin', end: true, labelKey: 'admin.nav.overview', icon: LayoutDashboard },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: Users },
  { to: '/admin/structure', labelKey: 'admin.nav.structure', icon: BookOpen },
  { to: '/admin/calendar', labelKey: 'admin.nav.calendar', icon: CalendarDays },
  { to: '/admin/announcements', labelKey: 'admin.nav.announcements', icon: Megaphone },
  { to: '/admin/files', labelKey: 'admin.nav.files', icon: FileSearch },
  { to: '/admin/settings', labelKey: 'admin.nav.settings', icon: Settings },
]

const emptyForm = { name: '', code: '', description: '' }

function asList(data) {
  return Array.isArray(data) ? data : data?.results || []
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <motion.div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" whileHover={{ y: -3 }}>
      <Icon className="mb-4 text-electric-500" size={24} />
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value ?? 0}</p>
    </motion.div>
  )
}

function useLoad(loader, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reload = () => {
    setLoading(true)
    loader()
      .then(res => {
        setData(res.data)
        setError('')
      })
      .catch(err => setError(apiErrorMessage(err, '')))
      .finally(() => setLoading(false))
  }
  useEffect(reload, deps)
  return { data, error, loading, reload }
}

function Overview() {
  const { t } = useTranslation()
  const stats = useLoad(adminApi.stats, [])
  const students = useLoad(() => adminApi.studentProfiles({ page_size: 100 }), [])

  const chartRows = useMemo(() => asList(students.data).map(profile => ({
    name: profile.major_name || t('common.none'),
    activity: profile.activity_score,
    submissions: profile.submission_rate,
  })), [students.data, t])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label={t('admin.stats.students')} value={stats.data?.total_students} icon={Users} />
        <StatCard label={t('admin.stats.professors')} value={stats.data?.total_professors} icon={BookOpen} />
        <StatCard label={t('admin.stats.assignments')} value={stats.data?.active_assignments} icon={FileSearch} />
        <StatCard label={t('admin.stats.pending')} value={stats.data?.pending_announcements} icon={Megaphone} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-xl font-black">{t('admin.overview.activity')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="activity" fill="#3b82f6" />
                <Bar dataKey="submissions" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-xl font-black">{t('admin.overview.recent')}</h2>
          <DataTable
            rows={asList(students.data)}
            pageSize={5}
            columns={[
              { key: 'major_name', labelKey: 'tables.major' },
              { key: 'submission_rate', labelKey: 'tables.submissionRate', render: row => `${row.submission_rate}%` },
              { key: 'activity_score', labelKey: 'tables.activityScore', render: row => `${row.activity_score}%` },
            ]}
          />
        </section>
      </div>
    </div>
  )
}

function UsersSection() {
  const { t } = useTranslation()
  const [profOpen, setProfOpen] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', major_ids: [], send_welcome_email: true })
  const users = useLoad(() => adminApi.users({ page_size: 100 }), [])
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])

  const createProfessor = async event => {
    event.preventDefault()
    try {
      await adminApi.createProfessor(form)
      toast.success(t('admin.users.professorCreated'))
      setProfOpen(false)
      users.reload()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  const toggleActive = async user => {
    try {
      await adminApi.updateUser(user.id, { is_active: !user.is_active })
      users.reload()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">{t('admin.users.title')}</h2>
          <p className="text-[var(--color-muted)]">{t('admin.users.subtitle')}</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setProfOpen(true)}>
          <Plus size={18} />
          {t('admin.users.createProfessor')}
        </button>
      </div>
      <DataTable
        rows={asList(users.data)}
        filters={[
          { key: 'role', labelKey: 'filters.role', options: ['ADMIN', 'PROFESSOR', 'STUDENT'].map(role => ({ value: role, label: t(`roles.${role}`) })) },
        ]}
        columns={[
          { key: 'first_name', labelKey: 'tables.name', render: row => `${row.first_name} ${row.last_name}` },
          { key: 'email', labelKey: 'tables.email' },
          { key: 'role', labelKey: 'tables.role', render: row => t(`roles.${row.role}`) },
          { key: 'major', labelKey: 'tables.major', render: row => row.student_profile?.major_name || '-' },
          { key: 'actions', labelKey: 'tables.actions', render: row => (
            <div className="flex gap-2">
              <button type="button" className="btn-secondary px-3 py-2" onClick={() => toggleActive(row)}>
                {row.is_active ? t('admin.users.deactivate') : t('admin.users.activate')}
              </button>
              <button type="button" className="rounded-lg p-2 text-red-500 hover:bg-red-500/10" onClick={() => adminApi.deleteUser(row.id).then(users.reload)}>
                <Trash2 size={16} />
              </button>
            </div>
          ) },
        ]}
      />
      <AccessibleModal open={profOpen} title={t('admin.users.createProfessor')} onClose={() => setProfOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={createProfessor}>
          {['first_name', 'last_name', 'email'].map(field => (
            <label key={field} className="block">
              <span className="label">{t(`forms.${field}`)}</span>
              <input className="input-field" type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={event => setForm({ ...form, [field]: event.target.value })} required />
            </label>
          ))}
          <label className="block md:col-span-2">
            <span className="label">{t('forms.majors')}</span>
            <select className="input-field min-h-32" multiple value={form.major_ids} onChange={event => setForm({ ...form, major_ids: Array.from(event.target.selectedOptions).map(option => option.value) })}>
              {asList(majors.data).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
            </select>
          </label>
          <label className="flex gap-3 md:col-span-2">
            <input type="checkbox" checked={form.send_welcome_email} onChange={event => setForm({ ...form, send_welcome_email: event.target.checked })} />
            <span>{t('admin.users.sendWelcome')}</span>
          </label>
          <button type="submit" className="btn-primary md:col-span-2">{t('common.save')}</button>
        </form>
      </AccessibleModal>
    </section>
  )
}

const STRUCTURE_TABS = ['majors', 'courses', 'semesters']
const STRUCTURE_ICON = { majors: GraduationCap, courses: BookOpen, semesters: CalendarRange }
const STRUCTURE_COLOR = { majors: 'text-electric-500', courses: 'text-gold-500', semesters: 'text-emerald-500' }
const STRUCTURE_BG = { majors: 'bg-electric-500/10', courses: 'bg-gold-500/10', semesters: 'bg-emerald-500/10' }
const emptySemesterForm = { name: '', school_year: '', semester_number: '1', start_date: '', end_date: '', is_active: false }

function StructureSection() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('majors')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [semesterForm, setSemesterForm] = useState(emptySemesterForm)
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const courses = useLoad(() => pedagogiqueApi.courses({ page_size: 100 }), [])
  const semesters = useLoad(() => pedagogiqueApi.semesters({ page_size: 100 }), [])

  const dataByTab = { majors: majors, courses: courses, semesters: semesters }
  const rows = asList(dataByTab[tab].data)

  const submit = async event => {
    event.preventDefault()
    try {
      if (tab === 'majors') await pedagogiqueApi.createMajor(form)
      if (tab === 'courses') await pedagogiqueApi.createCourse({ ...form, majors: [] })
      if (tab === 'semesters') await pedagogiqueApi.createSemester({ ...semesterForm, semester_number: Number(semesterForm.semester_number) })
      setForm(emptyForm)
      setSemesterForm(emptySemesterForm)
      setShowForm(false)
      dataByTab[tab].reload()
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  const deleteItem = async id => {
    try {
      if (tab === 'majors') await pedagogiqueApi.deleteMajor(id)
      if (tab === 'courses') await pedagogiqueApi.deleteCourse(id)
      if (tab === 'semesters') await pedagogiqueApi.deleteSemester(id)
      dataByTab[tab].reload()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  const TabIcon = STRUCTURE_ICON[tab]

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">{t('admin.nav.structure')}</h2>
          <p className="text-sm text-[var(--color-muted)]">Manage majors, courses, and semesters.</p>
        </div>
        <motion.button
          type="button"
          className="btn-primary"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New'}
        </motion.button>
      </div>

      {/* Animated tab switcher */}
      <div className="flex rounded-xl bg-[var(--color-border)]/40 p-1 gap-1">
        {STRUCTURE_TABS.map(key => {
          const Icon = STRUCTURE_ICON[key]
          const count = asList(dataByTab[key].data).length
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200"
            >
              {active && (
                <motion.div
                  layoutId="struct-tab-pill"
                  className="absolute inset-0 rounded-lg bg-[var(--color-surface)] shadow-sm"
                  transition={{ type: 'spring', bounce: 0.22, duration: 0.38 }}
                />
              )}
              <span className={`relative flex items-center gap-2 ${active ? STRUCTURE_COLOR[key] : 'text-[var(--color-muted)]'}`}>
                <Icon size={15} />
                {t(`admin.structure.${key}`)}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? `${STRUCTURE_BG[key]} ${STRUCTURE_COLOR[key]}` : 'bg-[var(--color-border)] text-[var(--color-muted)]'}`}>
                  {count}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Collapsible create form */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div
            key="create-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.26, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <form
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 grid gap-4 md:grid-cols-3 shadow-sm"
              onSubmit={submit}
            >
              <div className="md:col-span-3 flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
                <div className={`rounded-lg p-2 ${STRUCTURE_BG[tab]}`}>
                  <TabIcon size={16} className={STRUCTURE_COLOR[tab]} />
                </div>
                <span className="font-bold text-sm">{t(`admin.structure.${tab}`)}</span>
              </div>

              {tab !== 'semesters' ? (
                <>
                  <input className="input-field" placeholder={t('forms.name')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  <input className="input-field" placeholder={t('forms.code')} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
                  <input className="input-field" placeholder={t('forms.description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </>
              ) : (
                <>
                  <input className="input-field" placeholder={t('forms.name')} value={semesterForm.name} onChange={e => setSemesterForm({ ...semesterForm, name: e.target.value })} required />
                  <input className="input-field" placeholder={t('forms.schoolYear')} value={semesterForm.school_year} onChange={e => setSemesterForm({ ...semesterForm, school_year: e.target.value })} required />
                  <select className="input-field" value={semesterForm.semester_number} onChange={e => setSemesterForm({ ...semesterForm, semester_number: e.target.value })}>
                    <option value="1">{t('admin.structure.semesterOne')}</option>
                    <option value="2">{t('admin.structure.semesterTwo')}</option>
                  </select>
                  <input className="input-field" type="date" value={semesterForm.start_date} onChange={e => setSemesterForm({ ...semesterForm, start_date: e.target.value })} required />
                  <input className="input-field" type="date" value={semesterForm.end_date} onChange={e => setSemesterForm({ ...semesterForm, end_date: e.target.value })} required />
                  <label className="flex items-center gap-3 px-1">
                    <input type="checkbox" checked={semesterForm.is_active} onChange={e => setSemesterForm({ ...semesterForm, is_active: e.target.checked })} />
                    <span className="text-sm font-medium">{t('admin.structure.active')}</span>
                  </label>
                </>
              )}
              <button type="submit" className="btn-primary md:col-span-3">{t('common.save')}</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards grid with tab transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 p-14 text-center">
              <TabIcon size={38} className={`mx-auto mb-3 opacity-30 ${STRUCTURE_COLOR[tab]}`} />
              <p className="text-[var(--color-muted)] font-medium">{t('common.noData')}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((row, i) => (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.045, duration: 0.24 }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-lg p-2.5 ${STRUCTURE_BG[tab]}`}>
                      <TabIcon size={18} className={STRUCTURE_COLOR[tab]} />
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteItem(row.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base leading-tight">{row.name}</h3>
                      {(row.code || row.school_year) && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STRUCTURE_BG[tab]} ${STRUCTURE_COLOR[tab]}`}>
                          {row.code || row.school_year}
                        </span>
                      )}
                      {tab === 'semesters' && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${row.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-[var(--color-muted)]'}`}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    {row.description && (
                      <p className="text-sm text-[var(--color-muted)] line-clamp-2">{row.description}</p>
                    )}
                    {tab === 'semesters' && row.start_date && (
                      <p className="text-xs text-[var(--color-muted)] font-medium">
                        {formatDate(row.start_date)} → {formatDate(row.end_date)}
                      </p>
                    )}
                    {tab === 'semesters' && row.semester_number && (
                      <p className="text-xs text-[var(--color-muted)]">
                        {row.semester_number === 1 ? t('admin.structure.semesterOne') : t('admin.structure.semesterTwo')}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function CalendarSection() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ title: '', description: '', event_date: '', priority: 'MEDIUM', major: '' })
  const events = useLoad(() => academicsApi.events({ page_size: 100 }), [])
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const [selectedEvent, setSelectedEvent] = useState(null)

  const submit = async event => {
    event.preventDefault()
    try {
      await academicsApi.createEvent({ ...form, major: form.major || null })
      setForm({ title: '', description: '', event_date: '', priority: 'MEDIUM', major: '' })
      events.reload()
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  const deleteEvent = async id => {
    try {
      await academicsApi.deleteEvent(id)
      setSelectedEvent(null)
      events.reload()
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
      {/* Calendar */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm">
        <AcademicCalendar events={asList(events.data)} onEventClick={setSelectedEvent} />
      </div>

      {/* Create form */}
      <div className="space-y-5">
        <form
          className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
          onSubmit={submit}
        >
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] pb-3">
            <div className="rounded-lg bg-electric-500/10 p-2">
              <CalendarDays size={15} className="text-electric-500" />
            </div>
            <h2 className="font-black text-sm">{t('admin.calendar.create')}</h2>
          </div>
          <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <textarea className="input-field resize-none" rows={2} placeholder={t('forms.description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <input className="input-field" type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => {
              const pc = PRIORITY_COLORS[p]
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${form.priority === p ? `${pc.bg} ${pc.text} border-transparent` : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-border)]'}`}
                >
                  <span className={`h-2 w-2 rounded-full ${pc.dot}`} />
                  {t(`priority.${p}`)}
                </button>
              )
            })}
          </div>
          <select className="input-field" value={form.major} onChange={e => setForm({ ...form, major: e.target.value })}>
            <option value="">{t('common.allMajors')}</option>
            {asList(majors.data).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
          </select>
          <button className="btn-primary w-full" type="submit">{t('common.save')}</button>
        </form>

        {/* Priority legend */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Priority legend</p>
          <div className="space-y-2">
            {Object.entries(PRIORITY_COLORS).map(([key, c]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                <span className={`font-semibold ${c.text}`}>{key.charAt(0) + key.slice(1).toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Event detail modal */}
      <AccessibleModal open={!!selectedEvent} title={selectedEvent?.title || ''} onClose={() => setSelectedEvent(null)}>
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${PRIORITY_COLORS[selectedEvent.priority]?.bg || ''} ${PRIORITY_COLORS[selectedEvent.priority]?.text || ''}`}>
                {selectedEvent.priority} priority
              </span>
            </div>
            <p className="font-semibold text-sm">
              {new Date(selectedEvent.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {selectedEvent.description && (
              <p className="text-sm leading-relaxed text-[var(--color-muted)]">{selectedEvent.description}</p>
            )}
            {selectedEvent.major_name && (
              <p className="text-xs text-[var(--color-muted)]">Major: {selectedEvent.major_name}</p>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                onClick={() => deleteEvent(selectedEvent.id)}
              >
                <Trash2 size={14} />
                Delete event
              </button>
            </div>
          </div>
        )}
      </AccessibleModal>
    </section>
  )
}

function AnnouncementsSection() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ title: '', description: '', major: '' })
  const announcements = useLoad(() => announcementsApi.list({ page_size: 100 }), [])
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])

  const create = async event => {
    event.preventDefault()
    try {
      await announcementsApi.create({ ...form, major: form.major || null })
      setForm({ title: '', description: '', major: '' })
      announcements.reload()
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  const approve = id => announcementsApi.approve(id).then(announcements.reload).catch(error => toast.error(apiErrorMessage(error, t('errors.saveFailed'))))
  const reject = id => {
    const reason = window.prompt(t('admin.announcements.reasonPrompt'))
    if (reason) announcementsApi.reject(id, reason).then(announcements.reload).catch(error => toast.error(apiErrorMessage(error, t('errors.saveFailed'))))
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <form className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={create}>
        <h2 className="text-xl font-black">{t('admin.announcements.create')}</h2>
        <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required />
        <textarea className="input-field min-h-32" placeholder={t('forms.description')} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required />
        <select className="input-field" value={form.major} onChange={event => setForm({ ...form, major: event.target.value })}>
          <option value="">{t('common.allMajors')}</option>
          {asList(majors.data).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
        </select>
        <button className="btn-primary w-full" type="submit">{t('common.publish')}</button>
      </form>
      <DataTable
        rows={asList(announcements.data)}
        filters={[{ key: 'status', labelKey: 'filters.status', options: ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'].map(status => ({ value: status, label: t(`status.${status}`) })) }]}
        columns={[
          { key: 'title', labelKey: 'tables.title' },
          { key: 'status', labelKey: 'tables.status', render: row => t(`status.${row.status}`) },
          { key: 'author_role', labelKey: 'tables.role', render: row => row.author_role || '-' },
          { key: 'actions', labelKey: 'tables.actions', render: row => row.status === 'PENDING' ? (
            <div className="flex gap-2">
              <button type="button" className="btn-primary px-3 py-2" onClick={() => approve(row.id)}>{t('common.approve')}</button>
              <button type="button" className="btn-secondary px-3 py-2" onClick={() => reject(row.id)}>{t('common.reject')}</button>
            </div>
          ) : '-' },
        ]}
      />
    </section>
  )
}

function FilesSection() {
  const { t } = useTranslation()
  const activity = useLoad(adminApi.professorActivity, [])
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">{t('admin.files.title')}</h2>
      <DataTable
        rows={activity.data || []}
        columns={[
          { key: 'professor', labelKey: 'tables.professor', render: row => `${row.professor?.first_name || ''} ${row.professor?.last_name || ''}` },
          { key: 'active_assignments', labelKey: 'tables.activeAssignments' },
          { key: 'total_files_uploaded', labelKey: 'tables.files' },
          { key: 'total_submissions_received', labelKey: 'tables.submissions' },
        ]}
      />
    </section>
  )
}

function SettingsSection() {
  const { t } = useTranslation()
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <h2 className="text-2xl font-black">{t('admin.settings.title')}</h2>
      <p className="mt-2 text-[var(--color-muted)]">{t('admin.settings.body')}</p>
    </section>
  )
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const location = useLocation()
  const section = location.pathname.split('/')[2] || 'overview'

  const sectionMap = {
    overview: <Overview />,
    users: <UsersSection />,
    structure: <StructureSection />,
    calendar: <CalendarSection />,
    announcements: <AnnouncementsSection />,
    files: <FilesSection />,
    settings: <SettingsSection />,
  }

  const content = sectionMap[section] || <Overview />

  return (
    <DashboardLayout title={t(`admin.nav.${section === 'overview' ? 'overview' : section}`)} navItems={adminNav}>
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  )
}
