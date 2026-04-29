import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3, Bell, BookOpen, FileText,
  FolderKanban, Home, Megaphone, Send, Users,
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
  const [loading, setLoading] = useState(true)
  const reload = () => {
    setLoading(true)
    return loader()
      .then(res => { setData(res.data); setLoading(false) })
      .catch(() => { setData(null); setLoading(false) })
  }
  useEffect(reload, deps)
  return { data, loading, reload }
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--color-border)] ${className}`} />
}

function StatCard({ label, value, icon: Icon, accent = 'text-electric-500', bg = 'bg-electric-500/10' }) {
  return (
    <motion.div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
    >
      <div className={`mb-3 w-fit rounded-lg p-2 ${bg}`}>
        <Icon size={18} className={accent} />
      </div>
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value ?? 0}</p>
    </motion.div>
  )
}

/* ─── Sections ───────────────────────────────────────────────────────── */

function DashboardHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const assignments = useLoad(() => assignmentsApi.list({ page_size: 100 }), [])
  const rows = asList(assignments.data)
  const chartRows = rows.map(item => ({
    name: item.title?.slice(0, 14) + (item.title?.length > 14 ? '…' : ''),
    submissions: item.submissions_count || 0,
  }))

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="text-sm text-[var(--color-muted)]">{t('professor.home.welcome')}</p>
        <h2 className="mt-1 text-3xl font-black">{user?.first_name} {user?.last_name}</h2>
      </section>

      {assignments.loading ? (
        <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label={t('professor.stats.active')} value={rows.length} icon={FileText} accent="text-electric-500" bg="bg-electric-500/10" />
          <StatCard label={t('professor.stats.pending')} value={rows.filter(r => r.status === 'PENDING').length} icon={Bell} accent="text-amber-500" bg="bg-amber-500/10" />
          <StatCard label={t('professor.stats.approved')} value={rows.filter(r => r.status === 'APPROVED').length} icon={Users} accent="text-emerald-500" bg="bg-emerald-500/10" />
          <StatCard label={t('professor.stats.rejected')} value={rows.filter(r => r.status === 'REJECTED').length} icon={Megaphone} accent="text-red-500" bg="bg-red-500/10" />
        </div>
      )}

      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-4 font-black text-base">{t('professor.home.submissionChart')}</h2>
        {assignments.loading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}

function CoursesSection() {
  const { t } = useTranslation()
  const courses = useLoad(() => pedagogiqueApi.courses({ page_size: 100 }), [])
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-black">{t('professor.courses.title')}</h2>
      {courses.loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <DataTable
          rows={asList(courses.data)}
          columns={[
            { key: 'name', labelKey: 'tables.name' },
            { key: 'code', labelKey: 'tables.code' },
            { key: 'description', labelKey: 'tables.description' },
          ]}
        />
      )}
    </section>
  )
}

function AssignmentForm({ onCreated, groupWork = false }) {
  const { t } = useTranslation()
  const majors = useLoad(() => pedagogiqueApi.majors({ page_size: 100 }), [])
  const courses = useLoad(() => pedagogiqueApi.courses({ page_size: 100 }), [])
  const [files, setFiles] = useState([])
  const [progress, setProgress] = useState(0)
  const [form, setForm] = useState({
    title: '', description: '', deadline: '',
    type: groupWork ? 'PROJECT' : 'TD', course: '', majors: [],
  })

  const submit = async event => {
    event.preventDefault()
    setProgress(0)
    try {
      const payload = buildMultipart({ ...form, is_group_work: groupWork }, 'files', files)
      await assignmentsApi.create(payload, e => setProgress(Math.round((e.loaded * 100) / e.total)))
      toast.success(t('common.saved'))
      setFiles([])
      setForm({ title: '', description: '', deadline: '', type: groupWork ? 'PROJECT' : 'TD', course: '', majors: [] })
      onCreated?.()
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <form className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={submit}>
      <h3 className="font-black text-sm border-b border-[var(--color-border)] pb-3 mb-4">
        {groupWork ? t('professor.groups.create') : t('professor.assignments.create')}
      </h3>
      <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
      <textarea className="input-field min-h-24" placeholder={t('forms.description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
      <div className="grid gap-3 md:grid-cols-2">
        <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          {(groupWork ? ['PROJECT'] : ['TP', 'TD']).map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <input className="input-field" type="datetime-local" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required />
        <select className="input-field" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })}>
          <option value="">{t('forms.course')}</option>
          {asList(courses.data).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input-field min-h-[6rem]" multiple value={form.majors} onChange={e => setForm({ ...form, majors: Array.from(e.target.selectedOptions).map(o => o.value) })} required>
          {asList(majors.data).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
      <FileDropzone files={files} setFiles={setFiles} progress={progress} />
      <button type="submit" className="btn-primary w-full">
        {groupWork ? t('professor.groups.create') : t('professor.assignments.create')}
      </button>
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
    setSubmissions(asList(res.data))
  }

  const review = async (submission, action) => {
    const grade = action === 'approve' ? window.prompt(t('professor.assignments.gradePrompt')) : undefined
    const feedback = action === 'reject'
      ? window.prompt(t('professor.assignments.feedbackPrompt'))
      : window.prompt(t('professor.assignments.optionalFeedback'))
    try {
      await assignmentsApi.review(selected.id, { submission_id: submission.id, action, grade, feedback })
      openSubmissions(selected)
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <AssignmentForm onCreated={assignments.reload} />
      {assignments.loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <DataTable
          rows={asList(assignments.data)}
          filters={[{ key: 'type', labelKey: 'filters.type', options: ['TP', 'TD', 'PROJECT'].map(t => ({ value: t, label: t })) }]}
          columns={[
            { key: 'title', labelKey: 'tables.title' },
            { key: 'type', labelKey: 'tables.type' },
            { key: 'deadline', labelKey: 'tables.deadline', render: row => formatDateTime(row.deadline) },
            { key: 'actions', labelKey: 'tables.actions', render: row => (
              <button type="button" className="btn-secondary px-3 py-2" onClick={() => openSubmissions(row)}>
                {t('professor.assignments.viewSubmissions')}
              </button>
            )},
          ]}
        />
      )}
      <AccessibleModal open={!!selected} title={selected?.title || ''} onClose={() => setSelected(null)} size="max-w-5xl">
        <DataTable
          rows={submissions}
          columns={[
            { key: 'student_name', labelKey: 'tables.student' },
            { key: 'submitted_at', labelKey: 'tables.submittedAt', render: row => formatDateTime(row.submitted_at) },
            { key: 'status', labelKey: 'tables.status', render: row => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                row.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                row.status === 'REJECTED' ? 'bg-red-500/10 text-red-600' :
                'bg-amber-500/10 text-amber-600'
              }`}>{t(`status.${row.status}`)}</span>
            )},
            { key: 'grade', labelKey: 'tables.grade', render: row => row.grade || '—' },
            { key: 'actions', labelKey: 'tables.actions', render: row => (
              <div className="flex gap-2">
                <button type="button" className="btn-primary px-3 py-2" onClick={() => review(row, 'approve')}>{t('common.approve')}</button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => review(row, 'reject')}>{t('common.reject')}</button>
              </div>
            )},
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
    <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <AssignmentForm groupWork onCreated={groups.reload} />
      {groups.loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <DataTable
          rows={asList(groups.data)}
          columns={[
            { key: 'name', labelKey: 'tables.group' },
            { key: 'leader_name', labelKey: 'tables.leader' },
            { key: 'member_details', labelKey: 'tables.members', render: row => row.member_details?.map(m => m.name).join(', ') },
          ]}
        />
      )}
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
      {majors.loading ? (
        <div className="flex gap-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-32" />)}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {asList(majors.data).map(major => (
            <div key={major.id} className="flex gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
              <span className="px-2 py-1 text-sm font-bold">{major.code}</span>
              <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => exportGrades(major.id, 'xlsx')}>XLSX</button>
              <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => exportGrades(major.id, 'pdf')}>PDF</button>
            </div>
          ))}
        </div>
      )}
      {students.loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
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
      )}
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
      <form className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={submit}>
        <h2 className="font-black text-base border-b border-[var(--color-border)] pb-3 mb-4">{t('professor.announcements.request')}</h2>
        <input className="input-field" placeholder={t('forms.title')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        <textarea className="input-field min-h-28" placeholder={t('forms.description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
        <select className="input-field" value={form.major} onChange={e => setForm({ ...form, major: e.target.value })}>
          <option value="">{t('common.allMajors')}</option>
          {asList(majors.data).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <button className="btn-primary w-full" type="submit">{t('common.submit')}</button>
      </form>
      {announcements.loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <DataTable
          rows={asList(announcements.data)}
          columns={[
            { key: 'title', labelKey: 'tables.title' },
            { key: 'status', labelKey: 'tables.status', render: row => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                row.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                row.status === 'REJECTED' ? 'bg-red-500/10 text-red-600' :
                'bg-amber-500/10 text-amber-600'
              }`}>{t(`status.${row.status}`)}</span>
            )},
            { key: 'rejection_reason', labelKey: 'tables.feedback', render: row => row.rejection_reason || '—' },
          ]}
        />
      )}
    </section>
  )
}

function NotificationsSection() {
  const { t } = useTranslation()
  const notifications = useLoad(() => notificationsApi.list({ page_size: 100 }), [])

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-black">{t('notifications.title')}</h2>
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
              className={`rounded-xl border p-4 ${item.is_read ? 'border-[var(--color-border)] bg-[var(--color-surface)]' : 'border-electric-500/30 bg-electric-500/5'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.is_read ? 'bg-[var(--color-border)]' : 'bg-electric-500'}`} />
                <div>
                  <p className="font-semibold text-sm">{item.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--color-muted)]">{item.message}</p>
                  <p className="mt-1.5 text-xs text-[var(--color-muted)]/70">{formatDateTime(item.created_at)}</p>
                </div>
              </div>
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

/* ─── Main ───────────────────────────────────────────────────────────── */

export default function ProfessorDashboard() {
  const { t } = useTranslation()
  const location = useLocation()
  const section = location.pathname.split('/')[2] || 'dashboard'

  const sectionMap = {
    dashboard: <DashboardHome />,
    courses: <CoursesSection />,
    assignments: <AssignmentsSection />,
    groups: <GroupsSection />,
    activity: <ActivitySection />,
    announcements: <AnnouncementsSection />,
    notifications: <NotificationsSection />,
  }

  const content = sectionMap[section] || <DashboardHome />

  return (
    <DashboardLayout title={t(`professor.nav.${section}`)} navItems={professorNav}>
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
