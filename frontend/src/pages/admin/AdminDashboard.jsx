import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarRange,
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
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import AccessibleModal from '../../components/AccessibleModal'
import DataTable from '../../components/DataTable'
import DashboardLayout from '../../layouts/DashboardLayout'
import { adminApi, academicsApi, announcementsApi, pedagogiqueApi } from '../../services/endpoints'
import { apiErrorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

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
  const { t, i18n } = useTranslation()
  const [form, setForm] = useState({ title: '', description: '', event_date: '', priority: 'MEDIUM', major: '' })
  const events = useLoad(() => academicsApi.events({ page_size: 100 }), [])
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const palette = { LOW: '#3b82f6', MEDIUM: '#f59e0b', HIGH: '#f97316', URGENT: '#ef4444' }

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

  const priorityDot = { LOW: 'bg-electric-500', MEDIUM: 'bg-gold-500', HIGH: 'bg-orange-500', URGENT: 'bg-red-500' }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm"
      >
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' }}
          locale={i18n.language}
          height="auto"
          events={asList(events.data).map(item => ({ id: item.id, title: item.title, date: item.event_date, backgroundColor: palette[item.priority] }))}
        />
      </motion.div>

      <motion.form
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm h-fit"
        onSubmit={submit}
      >
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-border)]">
          <div className="rounded-lg p-2 bg-electric-500/10">
            <CalendarDays size={16} className="text-electric-500" />
          </div>
          <h2 className="font-black text-base">{t('admin.calendar.create')}</h2>
        </div>

        <div className="space-y-3">
          <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required />
          <textarea className="input-field resize-none" rows={2} placeholder={t('forms.description')} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
          <input className="input-field" type="date" value={form.event_date} onChange={event => setForm({ ...form, event_date: event.target.value })} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm({ ...form, priority: p })}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${form.priority === p ? 'border-[var(--color-text)] bg-[var(--color-text)]/5 text-[var(--color-text)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-text)]/30'}`}
            >
              <span className={`h-2 w-2 rounded-full ${priorityDot[p]}`} />
              {t(`priority.${p}`)}
            </button>
          ))}
        </div>

        <select className="input-field" value={form.major} onChange={event => setForm({ ...form, major: event.target.value })}>
          <option value="">{t('common.allMajors')}</option>
          {asList(majors.data).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
        </select>

        <button className="btn-primary w-full" type="submit">{t('common.save')}</button>
      </motion.form>
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

  const content = {
    overview: <Overview />,
    users: <UsersSection />,
    structure: <StructureSection />,
    calendar: <CalendarSection />,
    announcements: <AnnouncementsSection />,
    files: <FilesSection />,
    settings: <SettingsSection />,
  }[section] || <Overview />

  return (
    <DashboardLayout title={t(`admin.nav.${section === 'overview' ? 'overview' : section}`)} navItems={adminNav}>
      {content}
    </DashboardLayout>
  )
}
