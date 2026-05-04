import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import AccessibleModal from '../../components/AccessibleModal'
import TopControls from '../../components/TopControls'
import { useAuth } from '../../context/AuthContext'
import { apiErrorMessage } from '../../services/api'
import api from '../../services/api'
import { authApi, pedagogiqueApi } from '../../services/endpoints'

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <Link to="/" className="text-lg font-black text-gold-500">STUDENT HUB</Link>
        <TopControls />
      </header>
      <main className="grid min-h-[calc(100vh-80px)] place-items-center px-4 py-10">
        <motion.div className="w-full max-w-xl rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-6">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-gold-500 text-navy-950">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-3xl font-black">{title}</h1>
            <p className="mt-2 text-[var(--color-muted)]">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  )
}

function PasswordInput({ value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input className="input-field pr-11" type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} required />
      <button type="button" onClick={() => setVisible(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

function GoogleButton() {
  const { t } = useTranslation()
  const startGoogle = () => {
    const base = (api.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '')
    window.location.href = `${base}/api/v1/auth/social/google/login/`
  }
  return (
    <button type="button" onClick={startGoogle} className="btn-secondary w-full">
      {t('auth.continueGoogle')}
    </button>
  )
}

function redirectFor(user) {
  if (user?.force_password_change) return '/auth/change-password'
  if (user?.role === 'ADMIN') return '/admin'
  if (user?.role === 'PROFESSOR') return '/professor'
  return '/student'
}

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('error') === 'oauth_failed') {
      toast.error(t('errors.loginFailed'))
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [t])

  const submit = async event => {
    event.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      toast.success(t('auth.loginSuccess'))
      navigate(redirectFor(user), { replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.loginFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t('forms.email')}>
          <input className="input-field" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
        </Field>
        <Field label={t('forms.password')}>
          <PasswordInput value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <Link to="/auth/password-reset" className="font-semibold text-electric-500">{t('auth.forgotPassword')}</Link>
          <Link to="/auth/register" className="font-semibold text-gold-500">{t('auth.createAccount')}</Link>
        </div>
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? t('common.loading') : t('auth.signIn')}</button>
        <GoogleButton />
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [majors, setMajors] = useState([])
  const [termsOpen, setTermsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    major_id: '',
    email: '',
    phone_number: '',
    year_of_study: '1',
    password: '',
    confirm_password: '',
    agree_terms: false,
  })

  useEffect(() => {
    pedagogiqueApi.majors({ page_size: 100 }).then(res => setMajors(res.data.results || res.data)).catch(() => setMajors([]))
  }, [])

  const submit = async event => {
    event.preventDefault()
    if (form.password !== form.confirm_password) {
      toast.error(t('errors.passwordMismatch'))
      return
    }
    if (!form.agree_terms) {
      toast.error(t('errors.termsRequired'))
      return
    }
    setLoading(true)
    try {
      await authApi.registerStudent({ ...form, year_of_study: Number(form.year_of_study) })
      toast.success(t('auth.registrationSuccess'))
      navigate('/auth/login')
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.registrationFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <Field label={t('forms.firstName')}>
          <input className="input-field" value={form.first_name} onChange={event => setForm({ ...form, first_name: event.target.value })} required />
        </Field>
        <Field label={t('forms.lastName')}>
          <input className="input-field" value={form.last_name} onChange={event => setForm({ ...form, last_name: event.target.value })} required />
        </Field>
        <Field label={t('forms.major')}>
          <select className="input-field" value={form.major_id} onChange={event => setForm({ ...form, major_id: event.target.value })} required>
            <option value="">{t('forms.selectMajor')}</option>
            {majors.map(major => <option key={major.id} value={major.id}>{major.name}</option>)}
          </select>
        </Field>
        <Field label={t('forms.year')}>
          <select className="input-field" value={form.year_of_study} onChange={event => setForm({ ...form, year_of_study: event.target.value })}>
            {[1, 2, 3, 4, 5].map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </Field>
        <Field label={t('forms.email')}>
          <input className="input-field" type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required />
        </Field>
        <Field label={t('forms.phone')}>
          <input className="input-field" value={form.phone_number} onChange={event => setForm({ ...form, phone_number: event.target.value })} />
        </Field>
        <Field label={t('forms.password')}>
          <PasswordInput value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} />
        </Field>
        <Field label={t('forms.confirmPassword')}>
          <PasswordInput value={form.confirm_password} onChange={event => setForm({ ...form, confirm_password: event.target.value })} />
        </Field>
        <label className="flex gap-3 text-sm md:col-span-2">
          <input type="checkbox" checked={form.agree_terms} onChange={event => setForm({ ...form, agree_terms: event.target.checked })} />
          <span>
            {t('auth.agreePrefix')}{' '}
            <button type="button" onClick={() => setTermsOpen(true)} className="font-semibold text-electric-500">{t('auth.termsLink')}</button>
          </span>
        </label>
        <button className="btn-primary md:col-span-2" type="submit" disabled={loading}>{loading ? t('common.loading') : t('auth.signUp')}</button>
        <div className="md:col-span-2"><GoogleButton /></div>
      </form>
      <AccessibleModal open={termsOpen} title={t('auth.termsTitle')} onClose={() => setTermsOpen(false)}>
        <div className="space-y-4 text-sm leading-7 text-[var(--color-muted)]">
          {t('auth.termsBody', { returnObjects: true }).map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </AccessibleModal>
    </AuthShell>
  )
}

export function VerifyEmailPage() {
  const { token } = useParams()
  const { t } = useTranslation()
  const [message, setMessage] = useState(t('auth.verifying'))

  useEffect(() => {
    authApi.verifyEmail(token)
      .then(() => setMessage(t('auth.verifySuccess')))
      .catch(error => setMessage(apiErrorMessage(error, t('auth.verifyFailed'))))
  }, [token, t])

  return (
    <AuthShell title={t('auth.verifyTitle')} subtitle={message}>
      <Link to="/auth/login" className="btn-primary w-full">{t('auth.signIn')}</Link>
    </AuthShell>
  )
}

export function PasswordResetPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setLoading(true)
    try {
      await authApi.passwordReset({ email })
      setSent(true)
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.loginFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={sent ? t('auth.resetSent') : t('auth.resetSubtitle')}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t('forms.email')}>
          <input className="input-field" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
        </Field>
        <button className="btn-primary w-full" type="submit" disabled={loading || sent}>
          {loading ? t('common.loading') : t('auth.sendReset')}
        </button>
      </form>
    </AuthShell>
  )
}

export function PasswordResetConfirmPage() {
  const { token } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)

  const submit = async event => {
    event.preventDefault()
    if (form.new_password !== form.confirm_password) {
      toast.error(t('errors.passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      await authApi.passwordResetConfirm({ token, ...form })
      toast.success(t('auth.passwordChanged'))
      navigate('/auth/login')
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.newPasswordTitle')} subtitle={t('auth.newPasswordSubtitle')}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t('forms.password')}>
          <PasswordInput value={form.new_password} onChange={event => setForm({ ...form, new_password: event.target.value })} />
        </Field>
        <Field label={t('forms.confirmPassword')}>
          <PasswordInput value={form.confirm_password} onChange={event => setForm({ ...form, confirm_password: event.target.value })} />
        </Field>
        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? t('common.loading') : t('auth.changePassword')}
        </button>
      </form>
    </AuthShell>
  )
}

export function ChangePasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { fetchMe } = useAuth()
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [loading, setLoading] = useState(false)

  const submit = async event => {
    event.preventDefault()
    if (form.new_password !== form.confirm_password) {
      toast.error(t('errors.passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      await authApi.passwordChange(form)
      const user = await fetchMe()
      toast.success(t('auth.passwordChanged'))
      navigate(redirectFor(user), { replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error, t('errors.saveFailed')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title={t('auth.changePasswordTitle')} subtitle={t('auth.forcePasswordSubtitle')}>
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t('forms.currentPassword')}>
          <PasswordInput value={form.old_password} onChange={event => setForm({ ...form, old_password: event.target.value })} />
        </Field>
        <Field label={t('forms.password')}>
          <PasswordInput value={form.new_password} onChange={event => setForm({ ...form, new_password: event.target.value })} />
        </Field>
        <Field label={t('forms.confirmPassword')}>
          <PasswordInput value={form.confirm_password} onChange={event => setForm({ ...form, confirm_password: event.target.value })} />
        </Field>
        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? t('common.loading') : t('auth.changePassword')}
        </button>
      </form>
    </AuthShell>
  )
}
