import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { SignupProvider } from '../../contexts/SignupContext'
import { CheckCircle2 } from 'lucide-react'
import LanguageToggle from '../../components/ui/LanguageToggle'
import Step1SelectInstitutions from './Step1SelectInstitutions'
import Step2AgentInformation from './Step2AgentInformation'
import Step3BusinessLicence from './Step3BusinessLicence'
import Step4TermsAndConditions from './Step4TermsAndConditions'
import { Link } from 'react-router-dom'
import './SignupWizard.css'

const STEPS = [
  { key: 'step1', label: 'signup_wizard.progress.step1', path: '/register/step1' },
  { key: 'step2', label: 'signup_wizard.progress.step2', path: '/register/step2' },
  { key: 'step3', label: 'signup_wizard.progress.step3', path: '/register/step3' },
  { key: 'step4', label: 'signup_wizard.progress.step4', path: '/register/step4' },
]

function getStepNumber(pathname: string) {
  if (pathname.includes('step2')) return 2
  if (pathname.includes('step3')) return 3
  if (pathname.includes('step4')) return 4
  return 1
}

export default function SignupWizard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const currentStep = getStepNumber(location.pathname)

  return (
    <SignupProvider>
      <div className="wizard-layout">
        {/* Header */}
        <div className="wizard-header">
          <Link to="/" className="wizard-logo">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="10" fill="#3A4391"/>
              <path d="M14 24L22 16L30 24L22 32L14 24Z" fill="#00CCA0"/>
            </svg>
            <span>Admission<span>Desk</span></span>
          </Link>
          <LanguageToggle />
        </div>

        {/* Progress Bar */}
        <div className="wizard-progress-container">
          <div className="wizard-progress">
            {STEPS.map((step, idx) => {
              const stepNum = idx + 1
              const isCompleted = stepNum < currentStep
              const isActive = stepNum === currentStep
              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div className={`wizard-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="wizard-step-dot" />
                    <div className="wizard-step-label">{t(step.label)}</div>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`wizard-step-line ${isCompleted ? 'completed' : ''}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="wizard-body">
          <Routes>
            <Route index element={<Navigate to="step1" replace />} />
            <Route path="step1" element={<Step1SelectInstitutions />} />
            <Route path="step2" element={<Step2AgentInformation />} />
            <Route path="step3" element={<Step3BusinessLicence />} />
            <Route path="step4" element={<Step4TermsAndConditions />} />
          </Routes>
        </div>
      </div>
    </SignupProvider>
  )
}

