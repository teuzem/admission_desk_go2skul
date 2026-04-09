import { useTranslation } from 'react-i18next'
import './LanguageToggle.css'

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language?.startsWith('fr') ? 'fr' : 'en'

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'fr' : 'en'
    i18n.changeLanguage(newLang)
  }

  return (
    <button
      className="lang-toggle"
      onClick={toggleLanguage}
      title={currentLang === 'en' ? 'Switch to French' : 'Passer en anglais'}
      aria-label="Toggle language"
    >
      <span className={`lang-option ${currentLang === 'en' ? 'active' : ''}`}>🇬🇧 EN</span>
      <span className="lang-separator">|</span>
      <span className={`lang-option ${currentLang === 'fr' ? 'active' : ''}`}>🇫🇷 FR</span>
    </button>
  )
}
