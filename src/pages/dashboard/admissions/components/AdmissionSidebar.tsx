import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

interface SidebarProps {
  steps: { label: string; completed: boolean }[]
  currentStep: number
  progressPercent: number
  universityLogo?: string | null
  universityName?: string
  onStepClick: (step: number) => void
}

const STEP_LABELS = [
  'Personal Background Information',
  'Citizenship Information',
  'Representative Details',
  'Program Information',
  'Education History',
  'Work Experience',
  'Documents',
  'English Proficiency',
  'Financial Proof of Funds',
  'Terms & Conditions',
  'Review & Submit'
]

export default function AdmissionSidebar({
  steps, currentStep, progressPercent, universityLogo, universityName, onStepClick
}: SidebarProps) {
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string | null>(null)

  // Resolve logo URL (handle both public URLs and storage paths)
  useEffect(() => {
    const resolveLogo = async () => {
      if (!universityLogo) {
        // Try fetching from universities table
        try {
          const { data } = await supabase
            .from('universities')
            .select('logo_url')
            .limit(1)
            .single()
          if (data?.logo_url) {
            if (data.logo_url.startsWith('http')) {
              setResolvedLogoUrl(data.logo_url)
            } else {
              const { data: signed } = await supabase.storage
                .from('university-assets')
                .createSignedUrl(data.logo_url, 3600)
              setResolvedLogoUrl(signed?.signedUrl || null)
            }
          }
        } catch { /* no-op */ }
        return
      }
      if (universityLogo.startsWith('http')) {
        setResolvedLogoUrl(universityLogo)
      } else {
        try {
          const { data } = await supabase.storage
            .from('university-assets')
            .createSignedUrl(universityLogo, 3600)
          setResolvedLogoUrl(data?.signedUrl || universityLogo)
        } catch {
          setResolvedLogoUrl(universityLogo)
        }
      }
    }
    resolveLogo()
  }, [universityLogo])

  return (
    <aside className="admission-sidebar">
      {/* Logo */}
      <div className="admission-sidebar-logo">
        {resolvedLogoUrl ? (
          <img src={resolvedLogoUrl} alt={universityName || 'University'} />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: 700
          }}>
            {(universityName || 'U')[0]}
          </div>
        )}
        <span>{universityName || 'Online Application Portal'}</span>
      </div>

      {/* Progress Bar */}
      <div className="admission-progress-section">
        <div className="admission-progress-text">{progressPercent}% completed</div>
        <div className="admission-progress-bar">
          <div className="admission-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Step List */}
      <div className="admission-step-list">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1
          const isCompleted = steps[i]?.completed || false
          const isActive = currentStep === stepNum
          const canClick = isCompleted || stepNum <= currentStep

          return (
            <div
              key={stepNum}
              className={`admission-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${canClick ? 'clickable' : ''}`}
              onClick={() => canClick && onStepClick(stepNum)}
            >
              <div className={`admission-step-dot ${isCompleted ? 'completed' : isActive ? 'active' : 'inactive'}`}>
                {isCompleted ? <CheckCircle2 size={13} /> : stepNum}
              </div>
              <span className="admission-step-label">{label}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
