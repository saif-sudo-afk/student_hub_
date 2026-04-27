import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  BookOpen,
  FileText,
  FolderKanban,
  Home,
  Megaphone,
  Send,
  Users,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import AccessibleModal from '../../components/AccessibleModal'
import DataTable from '../../components/DataTable'
import FileDropzone from '../../components/FileDropzone'
import DashboardLayout from '../../layouts/DashboardLayout'
import { useAuth } from '../../context/AuthContext'
import { adminApi, announcementsApi, assignmentsApi, notificationsApi, pedagogiqueApi } from '../../services/endpoints'
import { apiErrorMessage } from '../../services/api'
import { buildMultipart } from '../../utils/files'
import { downloadBlob, formatDateTime } from '../../utils/format'

const professorNav = [
  { to: '/professor', end: true, labelKey: 'professor.nav.dashboard', icon: Home },
  { to: '/professor/courses', labelKey: 'professor.nav.courses', icon: BookOpen },
  { to: '/professor/assignments', labelKey: 'professor.nav.assignments', icon: FileText },
  { to: '/professor/groups', labelKey: 'professor.nav.groups', icon: FolderKanban },
  { to: '/professor/activity', labelKey: 'professor.nav.activity', icon: BarChart3 },
  { to: '/professor/announcements', labelKey: 'professor.nav.announcements', icon: Megaphone },
  { to: '/professor/notifications', labelKey: 'professor.nav.notifications', icon: Bell },
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

function DashboardHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const assignments = useLoad(() => assignmentsApi.list({ page_size: 100 }), [])
  const rows = asList(assignments.data)
  const chartRows = rows.map(item => ({ name: item.title?.slice(0, 16), submissions: item.submissions_count || 0 }))
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-[var(--color-muted)]">{t('professor.home.welcome')}</p>
        <h2 className="mt-1 text-3xl font-black">{user?.first_name} {user?.last_name}</h2>
      </section>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ['professor.stats.active', rows.length],
          ['professor.stats.pending', rows.filter(row => row.status === 'PENDING').length],
          ['professor.stats.approved', rows.filter(row => row.status === 'APPROVED').length],
          ['professor.stats.rejected', rows.filter(row => row.status === 'REJECTED').length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <p className="text-sm text-[var(--color-muted)]">{t(label)}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-4 text-xl font-black">{t('professor.home.submissionChart')}</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="submissions" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

function CoursesSection() {
  const { t } = useTranslation()
  const courses = useLoad(() => pedagogiqueApi.courses({ page_size: 100 }), [])
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">{t('professor.courses.title')}</h2>
      <DataTable
        rows={asList(courses.data)}
        columns={[
          { key: 'name', labelKey: 'tables.name' },
          { key: 'code', labelKey: 'tables.code' },
          { key: 'description', labelKey: 'tables.description' },
        ]}
      />
    </section>
  )
}

function AssignmentForm({ onCreated, groupWork = false }) {
  const { t } = useTranslation()
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const courses = useLoad(() => pedagogiqueApi.courses({ page_size: 100 }), [])
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [form, setForm] = useState({ title: '', description: '', deadline: '', type: groupWork ? 'PROJECT' : 'TD', course: '', majors: [] })

  const submit = async event => {
    event.preventDefault()
    setProgress(0)
    try {
      const payload = buildMultipart({ ...form, is_group_work: groupWork }, 'files', files)
      await assignmentsApi.create(payload, event => setProgress(Math.round((event.loaded * 100) / event.total)))
      toast.success(t('common.saved'))
      setFiles([])
      setForm({ title: '', description: '', deadline: '', type: groupWork ? 'PROJECT' : 'TD', course: '', majors: [] })
      onCreated?.()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <form className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={submit}>
      <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required />
      <textarea className="input-field min-h-28" placeholder={t('forms.description')} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required />
      <div className="grid gap-3 md:grid-cols-2">
        <select className="input-field" value={form.type} onChange={event => setForm({ ...form, type: event.target.value })}>
          {(groupWork ? ['PROJECT'] : ['TP', 'TD']).map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <input className="input-field" type="datetime-local" value={form.deadline} onChange={event => setForm({ ...form, deadline: event.target.value })} required />
        <select className="input-field" value={form.course} onChange={event => setForm({ ...form, course: event.target.value })}>
          <option value="">{t('forms.course')}</option>
          {asList(courses.data).map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
        <select className="input-field min-h-24" multiple value={form.majors} onChange={event => setForm({ ...form, majors: Array.from(event.target.selectedOptions).map(option => option.value) })} required>
          {asList(majors.data).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
        </select>
      </div>
      <FileDropzone files={files} setFiles={setFiles} progress={progress} />
      <button type="submit" className="btn-primary w-full">{groupWork ? t('professor.groups.create') : t('professor.assignments.create')}</button>
    </form>
  )
}

function AssignmentsSection() {
  const { t } = useTranslation()
  const assignments = useLoad(() => assignmentsApi.list({ page_size: 100 }), [])
  const [selected, setSelected] = useState(null)
  const [submissions, setSubmissions] = useState([])

  const openSubmissions = async assignment => {
    setSelected(assignment)
    const res = await assignmentsApi.submissions(assignment.id)
    setSubmissions(res.data)
  }

  const review = async (submission, action) => {
    const grade = action === 'approve' ? window.prompt(t('professor.assignments.gradePrompt')) : undefined
    const feedback = action === 'reject' ? window.prompt(t('professor.assignments.feedbackPrompt')) : window.prompt(t('professor.assignments.optionalFeedback'))
    try {
      await assignmentsApi.review(selected.id, { submission_id: submission.id, action, grade, feedback })
      openSubmissions(selected)
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <AssignmentForm onCreated={assignments.reload} />
      <DataTable
        rows={asList(assignments.data)}
        filters={[{ key: 'type', labelKey: 'filters.type', options: ['TP', 'TD', 'PROJECT'].map(type => ({ value: type, label: type })) }]}
        columns={[
          { key: 'title', labelKey: 'tables.title' },
          { key: 'type', labelKey: 'tables.type' },
          { key: 'deadline', labelKey: 'tables.deadline', render: row => formatDateTime(row.deadline) },
          { key: 'actions', labelKey: 'tables.actions', render: row => <button type="button" className="btn-secondary px-3 py-2" onClick={() => openSubmissions(row)}>{t('professor.assignments.viewSubmissions')}</button> },
        ]}
      />
      <AccessibleModal open={!!selected} title={selected?.title || ''} onClose={() => setSelected(null)} size="max-w-5xl">
        <DataTable
          rows={submissions}
          columns={[
            { key: 'student_name', labelKey: 'tables.student' },
            { key: 'submitted_at', labelKey: 'tables.submittedAt', render: row => formatDateTime(row.submitted_at) },
            { key: 'status', labelKey: 'tables.status', render: row => t(`status.${row.status}`) },
            { key: 'grade', labelKey: 'tables.grade', render: row => row.grade || '-' },
            { key: 'actions', labelKey: 'tables.actions', render: row => (
              <div className="flex gap-2">
                <button type="button" className="btn-primary px-3 py-2" onClick={() => review(row, 'approve')}>{t('common.approve')}</button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => review(row, 'reject')}>{t('common.reject')}</button>
              </div>
            ) },
          ]}
        />
      </AccessibleModal>
    </section>
  )
}

function GroupsSection() {
  const { t } = useTranslation()
  const groups = useLoad(() => assignmentsApi.groups({ page_size: 100 }), [])
  return (
    <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <AssignmentForm groupWork onCreated={groups.reload} />
      <DataTable
        rows={asList(groups.data)}
        columns={[
          { key: 'name', labelKey: 'tables.group' },
          { key: 'leader_name', labelKey: 'tables.leader' },
          { key: 'member_details', labelKey: 'tables.members', render: row => row.member_details?.map(member => member.name).join(', ') },
        ]}
      />
    </section>
  )
}

function ActivitySection() {
  const { t } = useTranslation()
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const students = useLoad(() => adminApi.studentProfiles({ page_size: 100 }), [])

  const exportGrades = async (major, format) => {
    const res = await assignmentsApi.exportGrades({ major, format })
    downloadBlob(res.data, `student-hub-grades.${format}`)
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {asList(majors.data).map(major => (
          <div key={major.id} className="flex gap-2 rounded-lg border border-[var(--color-border)] p-2">
            <span className="px-2 py-1 font-semibold">{major.code}</span>
            <button type="button" className="btn-secondary px-3 py-1" onClick={() => exportGrades(major.id, 'xlsx')}>XLSX</button>
            <button type="button" className="btn-secondary px-3 py-1" onClick={() => exportGrades(major.id, 'pdf')}>PDF</button>
          </div>
        ))}
      </div>
      <DataTable
        rows={asList(students.data)}
        columns={[
          { key: 'major_name', labelKey: 'tables.major' },
          { key: 'submission_rate', labelKey: 'tables.submissionRate', render: row => `${row.submission_rate}%` },
          { key: 'approval_rate', labelKey: 'tables.approvalRate', render: row => `${row.approval_rate}%` },
          { key: 'grade_average', labelKey: 'tables.gradeAverage' },
          { key: 'activity_score', labelKey: 'tables.activityScore', render: row => `${row.activity_score}%` },
        ]}
        emptyKey="professor.activity.empty"
      />
    </section>
  )
}

function AnnouncementsSection() {
  const { t } = useTranslation()
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const announcements = useLoad(() => announcementsApi.list({ page_size: 100 }), [])
  const [form, setForm] = useState({ title: '', description: '', major: '' })

  const submit = async event => {
    event.preventDefault()
    try {
      await announcementsApi.create({ ...form, major: form.major || null })
      setForm({ title: '', description: '', major: '' })
      announcements.reload()
      toast.success(t('professor.announcements.requestSent'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <form className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={submit}>
        <h2 className="text-xl font-black">{t('professor.announcements.request')}</h2>
        <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} required />
        <textarea className="input-field min-h-32" placeholder={t('forms.description')} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required />
        <select className="input-field" value={form.major} onChange={event => setForm({ ...form, major: event.target.value })}>
          <option value="">{t('common.allMajors')}</option>
          {asList(majors.data).map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
        </select>
        <button className="btn-primary w-full" type="submit">{t('common.submit')}</button>
      </form>
      <DataTable
        rows={asList(announcements.data)}
        columns={[
          { key: 'title', labelKey: 'tables.title' },
          { key: 'status', labelKey: 'tables.status', render: row => t(`status.${row.status}`) },
          { key: 'rejection_reason', labelKey: 'tables.feedback', render: row => row.rejection_reason || '-' },
        ]}
      />
    </section>
  )
}

function NotificationsSection() {
  const notifications = useLoad(() => notificationsApi.list({ page_size: 100 }), [])
  return (
    <DataTable
      rows={asList(notifications.data)}
      columns={[
        { key: 'title', labelKey: 'tables.title' },
        { key: 'message', labelKey: 'tables.message' },
        { key: 'created_at', labelKey: 'tables.date', render: row => formatDateTime(row.created_at) },
      ]}
    />
  )
}

export default function ProfessorDashboard() {
  const { t } = useTranslation()
  const location = useLocation()
  const section = location.pathname.split('/')[2] || 'dashboard'
  const content = {
    dashboard: <DashboardHome />,
    courses: <CoursesSection />,
    assignments: <AssignmentsSection />,
    groups: <GroupsSection />,
    activity: <ActivitySection />,
    announcements: <AnnouncementsSection />,
    notifications: <NotificationsSection />,
  }[section] || <DashboardHome />

  return (
    <DashboardLayout title={t(`professor.nav.${section}`)} navItems={professorNav}>
      {content}
    </DashboardLayout>
  )
}
