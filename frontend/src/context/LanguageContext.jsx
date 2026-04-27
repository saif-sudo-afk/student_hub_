import { createContext, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState(i18n.language?.startsWith('fr') ? 'fr' : 'en')

  const toggle = () => {
    const next = language === 'en' ? 'fr' : 'en'
    i18n.changeLanguage(next)
    setLanguage(next)
  }

  const change = (lang) => {
    i18n.changeLanguage(lang)
    setLanguage(lang)
  }

  return (
    <LanguageContext.Provider value={{ language, toggle, change }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
