import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileUp,
  Github,
  GraduationCap,
  Layers,
  Linkedin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TopControls from '../../components/TopControls'

const featureIcons = [FileUp, CalendarDays, Megaphone, ShieldCheck, BookOpen, TrendingUp, Users, Zap]
const stepIcons = [CheckCircle2, GraduationCap, Layers]

function MotionSection({ id, children, className = '' }) {
  return (
    <motion.section
      id={id}
      className={`px-4 py-20 md:px-8 ${className}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.section>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  const features = t('landing.features.items', { returnObjects: true })
  const steps = t('landing.how.steps', { returnObjects: true })
  const stats = t('landing.stats.items', { returnObjects: true })

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--color-bg)]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
          <a href="#home" className="text-lg font-black tracking-wide text-gold-500">STUDENT HUB</a>
          <div className="hidden items-center gap-6 md:flex">
            {['home', 'about', 'features', 'contact'].map(key => (
              <a key={key} href={`#${key}`} className="text-sm font-semibold text-slate-200 hover:text-gold-400">
                {t(`nav.${key}`)}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <TopControls compact />
            <Link to="/auth/login" className="hidden rounded-lg px-4 py-2 text-sm font-bold text-slate-100 hover:bg-white/10 sm:inline-flex">
              {t('auth.signIn')}
            </Link>
            <Link to="/auth/register" className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-black text-navy-950 hover:bg-gold-400">
              {t('auth.signUp')}
            </Link>
          </div>
        </nav>
      </header>

      <section id="home" className="relative flex min-h-screen items-center px-4 pb-20 pt-28 md:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.25),transparent_30%),radial-gradient(circle_at_70%_30%,rgba(245,158,11,.18),transparent_26%),linear-gradient(135deg,#020617,#0f172a_55%,#111827)]" />
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute left-1/4 top-24 h-40 w-40 animate-float rounded-full border border-electric-500/40" />
          <div className="absolute bottom-24 right-1/5 h-56 w-56 animate-pulse-slow rounded-full border border-gold-500/30" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_.9fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="mb-4 inline-flex items-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-sm font-bold text-gold-300">
              <Sparkles size={16} />
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
          </motion.div>
          <motion.div className="relative" initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15 }}>
            <div className="rounded-lg border border-white/10 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <div className="rounded-lg bg-slate-950 p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{t('landing.mockup.label')}</p>
                    <p className="text-2xl font-black text-white">{t('landing.mockup.title')}</p>
                  </div>
                  <div className="rounded-lg bg-gold-500 px-3 py-2 text-sm font-black text-navy-950">{t('landing.mockup.score')}</div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {t('landing.mockup.cards', { returnObjects: true }).map((card, index) => (
                    <div key={card.title} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                      <p className="text-sm text-slate-400">{card.title}</p>
                      <p className="mt-2 text-2xl font-black text-white">{card.value}</p>
                      <div className="mt-4 h-2 rounded-full bg-slate-800">
                        <div className="h-2 rounded-full bg-electric-500" style={{ width: `${62 + index * 8}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <MotionSection id="about">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-black uppercase text-gold-500">{t('landing.about.eyebrow')}</p>
            <h2 className="section-title">{t('landing.about.title')}</h2>
            <p className="mt-5 text-lg leading-8 text-[var(--color-muted)]">{t('landing.about.body')}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {t('landing.about.audience', { returnObjects: true }).map(item => (
                <div key={item} className="rounded-lg border border-[var(--color-border)] p-4 font-bold">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <div className="grid gap-4">
              {t('landing.about.pillars', { returnObjects: true }).map((item, index) => (
                <motion.div
                  key={item.title}
                  className="flex gap-4 rounded-lg bg-slate-500/5 p-4"
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-electric-500 text-white">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="font-black">{item.title}</h3>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{item.text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </MotionSection>

      <MotionSection id="features" className="bg-slate-500/5">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-sm font-black uppercase text-gold-500">{t('landing.features.eyebrow')}</p>
            <h2 className="section-title">{t('landing.features.title')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => {
              const Icon = featureIcons[index]
              return (
                <motion.div
                  key={feature.title}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Icon className="mb-4 text-electric-500" size={28} />
                  <h3 className="text-lg font-black">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{feature.text}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </MotionSection>

      <MotionSection id="how">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-black uppercase text-gold-500">{t('landing.how.eyebrow')}</p>
            <h2 className="section-title">{t('landing.how.title')}</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = stepIcons[index]
              return (
                <div key={step.title} className="relative rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
                  <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-lg bg-gold-500 font-black text-navy-950">{index + 1}</div>
                  <Icon className="mx-auto mb-4 text-electric-500" size={28} />
                  <h3 className="font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{step.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </MotionSection>

      <MotionSection id="stats" className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {stats.map(stat => (
            <motion.div key={stat.label} className="rounded-lg border border-white/10 bg-white/5 p-6" whileInView={{ scale: [0.95, 1] }} viewport={{ once: true }}>
              <p className="text-4xl font-black text-gold-400">{stat.value}</p>
              <p className="mt-2 text-sm text-slate-300">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </MotionSection>

      <footer id="contact" className="border-t border-[var(--color-border)] px-4 py-12 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xl font-black text-gold-500">STUDENT HUB</p>
            <p className="mt-3 max-w-xl text-[var(--color-muted)]">{t('landing.footer.body')}</p>
            <p className="mt-4 font-semibold">{t('landing.footer.email')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {['home', 'about', 'features', 'contact'].map(key => (
              <a key={key} href={`#${key}`} className="text-sm font-semibold text-[var(--color-muted)] hover:text-gold-500">{t(`nav.${key}`)}</a>
            ))}
            <TopControls compact />
            <Github size={20} />
            <Linkedin size={20} />
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl text-sm text-[var(--color-muted)]">{t('landing.footer.copyright')}</p>
      </footer>
    </div>
  )
}
