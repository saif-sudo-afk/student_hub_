import { Languages, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

export default function TopControls({ compact = false }) {
  const { t } = useTranslation()
  const { language, toggle: toggleLanguage } = useLanguage()
  const { isDark, toggle: toggleTheme } = useTheme()

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleLanguage}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 text-sm font-semibold hover:bg-slate-500/10"
        aria-label={t('common.language')}
      >
        <Languages size={17} />
        {!compact && <span>{language === 'en' ? 'FR' : 'EN'}</span>}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] hover:bg-slate-500/10"
        aria-label={t('common.theme')}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  )
}
