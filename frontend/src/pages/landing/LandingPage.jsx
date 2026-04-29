import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileUp,
  GraduationCap,
  Layers,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TopControls from '../../components/TopControls'
import { publicApi } from '../../services/endpoints'

const featureIcons = [FileUp, CalendarDays, Megaphone, ShieldCheck, BookOpen, TrendingUp, Users, Zap]
const stepIcons = [CheckCircle2, GraduationCap, Layers]

function useCountUp(target, duration = 1800) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView || !target) return
    let start = 0
    const totalSteps = Math.ceil(duration / 16)
    const step = target / totalSteps
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return { count, ref }
}

function StatItem({ value, label, color, maxValue }) {
  const { count, ref } = useCountUp(value)
  const barWidth = maxValue > 0 ? Math.max(8, Math.round((value / maxValue) * 100)) : 8

  return (
    <motion.div
      ref={ref}
      className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <p className={`text-4xl font-black ${color}`}>
        {count.toLocaleString()}{value >= 10 ? '+' : ''}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-300">{label}</p>
      <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color.replace('text-', 'bg-')}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${barWidth}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </motion.div>
  )
}

function MotionSection({ id, children, className = '' }) {
  return (
    <motion.section
      id={id}
      className={`px-4 py-20 md:px-8 ${className}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.section>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  const [platformStats, setPlatformStats] = useState(null)
  const features = t('landing.features.items', { returnObjects: true })
  const steps = t('landing.how.steps', { returnObjects: true })

  useEffect(() => {
    publicApi.stats().then(res => setPlatformStats(res.data)).catch(() => {})
  }, [])

  const maxStatValue = platformStats
    ? Math.max(platformStats.total_students, platformStats.total_professors, platformStats.total_assignments, platformStats.total_majors, 1)
    : 1

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Fixed nav */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <a href="#home" className="text-lg font-black tracking-wide text-gold-500">STUDENT HUB</a>
          <div className="hidden items-center gap-6 md:flex">
            {['home', 'about', 'features', 'contact'].map(key => (
              <a key={key} href={`#${key}`} className="text-sm font-semibold text-slate-200 transition-colors hover:text-gold-400">
                {t(`nav.${key}`)}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <TopControls compact />
            <Link to="/auth/login" className="hidden rounded-lg px-4 py-2 text-sm font-bold text-slate-100 transition-colors hover:bg-white/10 sm:inline-flex">
              {t('auth.signIn')}
            </Link>
            <Link to="/auth/register" className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-black text-navy-950 transition-colors hover:bg-gold-400">
              {t('auth.signUp')}
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section id="home" className="relative flex min-h-screen items-center px-4 pb-20 pt-28 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.2),transparent_32%),radial-gradient(circle_at_75%_30%,rgba(245,158,11,.14),transparent_28%),linear-gradient(135deg,#020617,#0f172a_55%,#111827)]" />
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute left-1/4 top-24 h-40 w-40 animate-float rounded-full border border-electric-500/40" />
          <div className="absolute bottom-24 right-1/5 h-56 w-56 animate-pulse-slow rounded-full border border-gold-500/30" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_.9fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-sm font-bold text-gold-300">
              <Sparkles size={15} />
              {t('landing.hero.eyebrow')}
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-tight text-white md:text-7xl">
              {t('landing.hero.title')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {t('landing.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth/register" className="btn-primary">
                {t('landing.hero.primary')}
                <ArrowRight size={18} />
              </Link>
              <a href="#about" className="btn-secondary border-slate-600 text-white hover:border-gold-500">
                {t('landing.hero.secondary')}
              </a>
            </div>
            {/* Mini live stats strip */}
            {platformStats && (
              <motion.div
                className="mt-10 flex flex-wrap gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {[
                  { v: platformStats.total_students, l: 'students' },
                  { v: platformStats.total_professors, l: 'professors' },
                  { v: platformStats.total_assignments, l: 'assignments' },
                  { v: platformStats.total_majors, l: 'majors' },
                ].map(({ v, l }) => (
                  <div key={l} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 border border-white/10">
                    <span className="text-xl font-black text-gold-400">{v}</span>
                    <span className="text-xs text-slate-400 capitalize">{l}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div className="relative" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-sm">
              <div className="rounded-lg bg-slate-950 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">{t('landing.mockup.label')}</p>
                    <p className="mt-1 text-2xl font-black text-white">{t('landing.mockup.title')}</p>
                  </div>
                  <div className="rounded-lg bg-gold-500 px-3 py-2 text-sm font-black text-navy-950">{t('landing.mockup.score')}</div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { label: 'Students Enrolled', value: platformStats?.total_students ?? '—', color: 'bg-electric-500' },
                    { label: 'Professors Active', value: platformStats?.total_professors ?? '—', color: 'bg-gold-500' },
                    { label: 'Assignments Total', value: platformStats?.total_assignments ?? '—', color: 'bg-emerald-500' },
                    { label: 'Academic Majors', value: platformStats?.total_majors ?? '—', color: 'bg-purple-500' },
                  ].map((card, i) => (
                    <div key={card.label} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                      <p className="text-xs text-slate-400">{card.label}</p>
                      <p className="mt-2 text-2xl font-black text-white">{card.value}</p>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-800">
                        <motion.div
                          className={`h-1.5 rounded-full ${card.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${55 + i * 10}%` }}
                          transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About */}
      <MotionSection id="about">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-gold-500">{t('landing.about.eyebrow')}</p>
            <h2 className="section-title">{t('landing.about.title')}</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--color-muted)]">{t('landing.about.body')}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {t('landing.about.audience', { returnObjects: true }).map(item => (
                <div key={item} className="rounded-xl border border-[var(--color-border)] p-4 text-center font-bold text-sm">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="space-y-4">
              {t('landing.about.pillars', { returnObjects: true }).map((item, index) => (
                <motion.div
                  key={item.title}
                  className="flex gap-4 rounded-xl bg-slate-500/5 p-4"
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold-500/15 text-gold-500">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-muted)]">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </MotionSection>

      {/* Features */}
      <MotionSection id="features" className="bg-slate-500/5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-gold-500">{t('landing.features.eyebrow')}</p>
            <h2 className="section-title">{t('landing.features.title')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = featureIcons[index]
              return (
                <motion.div
                  key={feature.title}
                  className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-shadow hover:shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="mb-4 w-fit rounded-lg bg-electric-500/10 p-2.5 text-electric-500 transition-colors group-hover:bg-electric-500 group-hover:text-white">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-black">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{feature.text}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </MotionSection>

      {/* How it works */}
      <MotionSection id="how">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-gold-500">{t('landing.how.eyebrow')}</p>
            <h2 className="section-title">{t('landing.how.title')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = stepIcons[index]
              return (
                <motion.div
                  key={step.title}
                  className="relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gold-500 font-black text-navy-950 text-lg">{index + 1}</div>
                  <Icon className="mx-auto mb-3 text-electric-500" size={26} />
                  <h3 className="font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{step.text}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </MotionSection>

      {/* Live Platform Stats */}
      <MotionSection id="stats" className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-gold-400">Live platform data</p>
            <h2 className="text-3xl font-black text-white md:text-4xl">Real numbers, right now</h2>
            <p className="mt-3 text-slate-400">Every figure below is pulled live from the Student Hub database.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <StatItem
              value={platformStats?.total_students ?? 0}
              label="Enrolled Students"
              color="text-electric-400"
              maxValue={maxStatValue}
            />
            <StatItem
              value={platformStats?.total_professors ?? 0}
              label="Active Professors"
              color="text-gold-400"
              maxValue={maxStatValue}
            />
            <StatItem
              value={platformStats?.total_assignments ?? 0}
              label="Assignments Created"
              color="text-emerald-400"
              maxValue={maxStatValue}
            />
            <StatItem
              value={platformStats?.total_majors ?? 0}
              label="Academic Majors"
              color="text-purple-400"
              maxValue={maxStatValue}
            />
          </div>
        </div>
      </MotionSection>

      {/* Footer */}
      <footer id="contact" className="border-t border-[var(--color-border)] px-4 py-12 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xl font-black text-gold-500">STUDENT HUB</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--color-muted)]">{t('landing.footer.body')}</p>
            <p className="mt-4 text-sm font-semibold">{t('landing.footer.email')}</p>
          </div>
          <div className="flex flex-wrap items-start gap-4 pt-1">
            {['home', 'about', 'features', 'contact'].map(key => (
              <a key={key} href={`#${key}`} className="text-sm font-semibold text-[var(--color-muted)] transition-colors hover:text-gold-500">{t(`nav.${key}`)}</a>
            ))}
            <TopControls compact />
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl text-xs text-[var(--color-muted)]">{t('landing.footer.copyright')}</p>
      </footer>
    </div>
  )
}
