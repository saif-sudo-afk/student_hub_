import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  FileSearch,
  LayoutDashboard,
  Megaphone,
  Plus,
  Settings,
  Trash2,
  Users,
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

function StructureSection() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('majors')
  const [form, setForm] = useState(emptyForm)
  const [semesterForm, setSemesterForm] = useState({ name: '', school_year: '', semester_number: '1', start_date: '', end_date: '', is_active: false })
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const courses = useLoad(() => pedagogiqueApi.courses({ page_size: 100 }), [])
  const semesters = useLoad(() => pedagogiqueApi.semesters({ page_size: 100 }), [])

  const submit = async event => {
    event.preventDefault()
    try {
      if (tab === 'majors') await pedagogiqueApi.createMajor(form)
      if (tab === 'courses') await pedagogiqueApi.createCourse({ ...form, majors: [] })
      if (tab === 'semesters') await pedagogiqueApi.createSemester({ ...semesterForm, semester_number: Number(semesterForm.semester_number) })
      setForm(emptyForm)
      setSemesterForm({ name: '', school_year: '', semester_number: '1', start_date: '', end_date: '', is_active: false })
      majors.reload()
      courses.reload()
      semesters.reload()
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  const rows = tab === 'majors' ? asList(majors.data) : tab === 'courses' ? asList(courses.data) : asList(semesters.data)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {['majors', 'courses', 'semesters'].map(key => (
          <button key={key} type="button" className={tab === key ? 'btn-primary px-4 py-2' : 'btn-secondary px-4 py-2'} onClick={() => setTab(key)}>
            {t(`admin.structure.${key}`)}
          </button>
        ))}
      </div>
      <form className="grid gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-3" onSubmit={submit}>
        {tab !== 'semesters' ? (
          <>
            <input className="input-field" placeholder={t('forms.name')} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required />
            <input className="input-field" placeholder={t('forms.code')} value={form.code} onChange={event => setForm({ ...form, code: event.target.value })} required />
            <input className="input-field" placeholder={t('forms.description')} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
          </>
        ) : (
          <>
            <input className="input-field" placeholder={t('forms.name')} value={semesterForm.name} onChange={event => setSemesterForm({ ...semesterForm, name: event.target.value })} required />
            <input className="input-field" placeholder={t('forms.schoolYear')} value={semesterForm.school_year} onChange={event => setSemesterForm({ ...semesterForm, school_year: event.target.value })} required />
            <select className="input-field" value={semesterForm.semester_number} onChange={event => setSemesterForm({ ...semesterForm, semester_number: event.target.value })}>
              <option value="1">{t('admin.structure.semesterOne')}</option>
              <option value="2">{t('admin.structure.semesterTwo')}</option>
            </select>
            <input className="input-field" type="date" value={semesterForm.start_date} onChange={event => setSemesterForm({ ...semesterForm, start_date: event.target.value })} required />
            <input className="input-field" type="date" value={semesterForm.end_date} onChange={event => setSemesterForm({ ...semesterForm, end_date: event.target.value })} required />
            <label className="flex items-center gap-3"><input type="checkbox" checked={semesterForm.is_active} onChange={event => setSemesterForm({ ...semesterForm, is_active: event.target.checked })} /> {t('admin.structure.active')}</label>
          </>
        )}
        <button type="submit" className="btn-primary md:col-span-3">{t('common.save')}</button>
      </form>
      <DataTable
        rows={rows}
        columns={[
          { key: 'name', labelKey: 'tables.name' },
          { key: 'code', labelKey: 'tables.code', render: row => row.code || row.school_year || '-' },
          { key: 'description', labelKey: 'tables.description', render: row => row.description || row.semester_number || '-' },
        ]}
      />
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

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <FullCalendar
          plugins={[dayGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listWeek' }}
          locale={i18n.language}
          height="auto"
          events={asList(events.data).map(item => ({ id: item.id, title: item.title, date: item.event_date, backgroundColor: palette[item.priority] }))}
        />
      </div>
      <form className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={submit}>
        <h2 className="text-xl font-black">{t('admin.calendar.create')}</h2>
        <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required />
        <textarea className="input-field" placeholder={t('forms.description')} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} />
        <input className="input-field" type="date" value={form.event_date} onChange={event => setForm({ ...form, event_date: event.target.value })} required />
        <select className="input-field" value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value })}>
          {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(priority => <option key={priority} value={priority}>{t(`priority.${priority}`)}</option>)}
        </select>
        <select className="input-field" value={form.major} onChange={event => setForm({ ...form, major: event.target.value })}>
          <option value="">{t('common.allMajors')}</option>
          {asList(majors.data).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
        </select>
        <button className="btn-primary w-full" type="submit">{t('common.save')}</button>
      </form>
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
