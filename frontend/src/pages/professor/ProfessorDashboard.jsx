import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3, Bell, BookOpen, ExternalLink, FileText,
  FolderKanban, Home, Megaphone, Users,
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
  const pendingSubmissions = rows.reduce((total, item) => total + (item.pending_submissions_count || 0), 0)
  const approvedSubmissions = rows.reduce((total, item) => total + (item.approved_submissions_count || 0), 0)
  const rejectedSubmissions = rows.reduce((total, item) => total + (item.rejected_submissions_count || 0), 0)

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
          <StatCard label={t('professor.stats.pending')} value={pendingSubmissions} icon={Bell} accent="text-amber-500" bg="bg-amber-500/10" />
          <StatCard label={t('professor.stats.approved')} value={approvedSubmissions} icon={Users} accent="text-emerald-500" bg="bg-emerald-500/10" />
          <StatCard label={t('professor.stats.rejected')} value={rejectedSubmissions} icon={Megaphone} accent="text-red-500" bg="bg-red-500/10" />
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

function ReviewModal({ state, onClose, onDone }) {
  const { t } = useTranslation()
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const isApprove = state?.action === 'approve'

  useEffect(() => {
    if (!state) { setGrade(''); setFeedback('') }
  }, [state])

  const submit = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await assignmentsApi.review(state.assignmentId, {
        submission_id: state.submission.id,
        action: state.action,
        grade: isApprove ? Number(grade) : undefined,
        feedback: feedback || undefined,
      })
      toast.success(t('common.saved'))
      onDone()
      onClose()
    } catch (err) {
      toast.error(apiErrorMessage(err, t('errors.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccessibleModal
      open={!!state}
      title={isApprove ? t('common.approve') : t('common.reject')}
      onClose={onClose}
      size="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4 pt-1">
        {isApprove && (
          <div>
            <label className="mb-1 block text-sm font-semibold">{t('professor.assignments.gradePrompt')}</label>
            <input
              className="input-field"
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              required
              autoFocus
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-semibold">
            {isApprove ? t('professor.assignments.optionalFeedback') : t('professor.assignments.feedbackPrompt')}
          </label>
          <textarea
            className="input-field min-h-[6rem]"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            required={!isApprove}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary px-4 py-2" onClick={onClose}>{t('common.close')}</button>
          <button
            type="submit"
            className={isApprove ? 'btn-primary px-4 py-2' : 'rounded-lg bg-red-500 px-4 py-2 font-bold text-white transition-colors hover:bg-red-400'}
            disabled={saving}
          >
            {isApprove ? t('common.approve') : t('common.reject')}
          </button>
        </div>
      </form>
    </AccessibleModal>
  )
}

function AssignmentsSection() {
  const { t } = useTranslation()
  const assignments = useLoad(() => assignmentsApi.list({ page_size: 100 }), [])
  const [selected, setSelected] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [reviewState, setReviewState] = useState(null)

  const openSubmissions = async assignment => {
    setSelected(assignment)
    const res = await assignmentsApi.submissions(assignment.id)
    setSubmissions(asList(res.data))
  }

  const refreshSubmissions = () => selected && openSubmissions(selected)

  return (
    <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <AssignmentForm onCreated={assignments.reload} />
      {assignments.loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <DataTable
          rows={asList(assignments.data)}
          filters={[{ key: 'type', labelKey: 'filters.type', options: ['TP', 'TD', 'PROJECT'].map(v => ({ value: v, label: v })) }]}
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
            { key: 'files', labelKey: 'tables.files', render: row => (
              <div className="flex flex-wrap gap-1">
                {(row.files || []).map(f => f.url ? (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-electric-500/10 px-2 py-1 text-xs font-semibold text-electric-600 transition-colors hover:bg-electric-500/20 dark:text-electric-400"
                  >
                    <ExternalLink size={10} />
                    {f.original_filename || f.file_type}
                  </a>
                ) : null)}
                {!(row.files || []).some(f => f.url) && '—'}
              </div>
            )},
            { key: 'actions', labelKey: 'tables.actions', render: row => (
              <div className="flex gap-2">
                <button type="button" className="btn-primary px-3 py-2" onClick={() => setReviewState({ submission: row, action: 'approve', assignmentId: selected.id })}>{t('common.approve')}</button>
                <button type="button" className="btn-secondary px-3 py-2" onClick={() => setReviewState({ submission: row, action: 'reject', assignmentId: selected.id })}>{t('common.reject')}</button>
              </div>
            )},
          ]}
        />
      </AccessibleModal>
      <ReviewModal state={reviewState} onClose={() => setReviewState(null)} onDone={refreshSubmissions} />
    </section>
  )
}

function GroupCreateForm({ onCreated }) {
  const { t } = useTranslation()
  const assignments = useLoad(() => assignmentsApi.list({ page_size: 100 }), [])
  const students = useLoad(() => adminApi.studentProfiles({ page_size: 100 }), [])
  const [form, setForm] = useState({ assignment: '', name: '', leader: '', members: [] })

  const projectAssignments = asList(assignments.data).filter(item => item.is_group_work)
  const studentRows = asList(students.data)

  const submit = async event => {
    event.preventDefault()
    const members = Array.from(new Set([form.leader, ...form.members].filter(Boolean)))
    try {
      await assignmentsApi.createGroup({
        assignment: form.assignment,
        name: form.name,
        leader: form.leader || null,
        members,
      })
      setForm({ assignment: '', name: '', leader: '', members: [] })
      onCreated?.()
      toast.success(t('common.saved'))
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    }
  }

  return (
    <form className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5" onSubmit={submit}>
      <h3 className="font-black text-sm border-b border-[var(--color-border)] pb-3 mb-4">
        {t('professor.groups.create')}
      </h3>
      <input
        className="input-field"
        placeholder={t('tables.group')}
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        required
      />
      <select
        className="input-field"
        value={form.assignment}
        onChange={e => setForm({ ...form, assignment: e.target.value })}
        required
      >
        <option value="">{t('professor.nav.assignments')}</option>
        {projectAssignments.map(assignment => (
          <option key={assignment.id} value={assignment.id}>{assignment.title}</option>
        ))}
      </select>
      <select
        className="input-field"
        value={form.leader}
        onChange={e => setForm({ ...form, leader: e.target.value })}
        required
      >
        <option value="">{t('tables.leader')}</option>
        {studentRows.map(student => (
          <option key={student.id} value={student.id}>
            {student.student_name || student.student_email || student.id}
          </option>
        ))}
      </select>
      <select
        className="input-field min-h-[7rem]"
        multiple
        value={form.members}
        onChange={e => setForm({
          ...form,
          members: Array.from(e.target.selectedOptions).map(option => option.value),
        })}
      >
        {studentRows.map(student => (
          <option key={student.id} value={student.id}>
            {student.student_name || student.student_email || student.id}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={assignments.loading || students.loading || !projectAssignments.length || !studentRows.length}
      >
        {t('common.save')}
      </button>
    </form>
  )
}

function GroupsSection() {
  const groups = useLoad(() => assignmentsApi.groups({ page_size: 100 }), [])
  const [groupFormKey, setGroupFormKey] = useState(0)
  return (
    <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <div className="space-y-5">
        <AssignmentForm
          groupWork
          onCreated={() => {
            groups.reload()
            setGroupFormKey(key => key + 1)
          }}
        />
        <GroupCreateForm key={groupFormKey} onCreated={groups.reload} />
      </div>
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

  const content = useMemo(() => {
    switch (section) {
      case 'courses': return <CoursesSection />
      case 'assignments': return <AssignmentsSection />
      case 'groups': return <GroupsSection />
      case 'activity': return <ActivitySection />
      case 'announcements': return <AnnouncementsSection />
      case 'notifications': return <NotificationsSection />
      default: return <DashboardHome />
    }
  }, [section])

  return (
    <DashboardLayout title={t(`professor.nav.${section}`)} navItems={professorNav}>
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
