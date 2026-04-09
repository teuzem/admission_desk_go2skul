import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Loader2, Send, ArrowRight } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import Select from 'react-select'
import { COUNTRIES } from '../countryData'
import { supabase } from '../../../../lib/supabase'
import '../AdmissionWorkflow.css'

const CustomFlag = ({ country, countryName }: { country: string, countryName: string }) => {
  if (!country) return null;
  return (
    <img 
      src={`https://flagcdn.com/w20/${country.toLowerCase()}.png`} 
      width="24" 
      alt={countryName} 
      className="PhoneInputCountryIconImg" 
      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

interface Props {
  universities?: any[]
  universityLogo?: string | null
  universityName?: string
  programName?: string
  onComplete: (data: IntakeData) => void
  onSendLink: (data: IntakeData) => void
  onClose: () => void
}

export interface IntakeData {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
}

export default function SubmitApplicationPopup({
  universities, universityLogo, universityName, programName, onComplete, onSendLink, onClose
}: Props) {
  const [data, setData] = useState<IntakeData>({
    first_name: '', last_name: '', email: '', phone: '', country: ''
  })
  const [sending, setSending] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(universityLogo || null)
  const [uniName, setUniName] = useState(universityName || '')
  const overlayRef = useRef<HTMLDivElement>(null)

  // Resolve university logo URL from Supabase if a specific university was passed
  useEffect(() => {
    const resolveLogo = async () => {
      if (universityLogo) {
        if (universityLogo.startsWith('http')) {
          setLogoUrl(universityLogo)
        } else {
          try {
            const { data } = await supabase.storage
              .from('university-assets')
              .createSignedUrl(universityLogo, 3600)
            setLogoUrl(data?.signedUrl || null)
          } catch {
            setLogoUrl(null)
          }
        }
      } else {
        setLogoUrl(null)
      }
      setUniName(universityName || 'Admission Portal')
    }
    resolveLogo()
  }, [universityLogo, universityName])

  const s = useCallback((k: keyof IntakeData, v: string) => {
    setData(prev => ({ ...prev, [k]: v }))
  }, [])

  const isValid = data.first_name.trim() && data.last_name.trim() &&
    data.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    data.phone && data.country

  const handleSendLink = async () => {
    if (!isValid) return
    setSending(true)
    await onSendLink(data)
    setSending(false)
  }

  return (
    <div className="adm-popup-overlay" ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}>
      <div className="adm-popup-card" style={{ position: 'relative' }}>
        <button className="adm-popup-close" onClick={onClose}><X size={20} /></button>

        {/* University Logo — centered at top */}
        {logoUrl ? (
          <img src={logoUrl} alt={uniName} className="popup-logo" />
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: 'linear-gradient(135deg, #3A4391, #2d3470)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1.4rem', fontWeight: 800
            }}>
              {(uniName || 'U')[0]}
            </div>
          </div>
        )}

        <h2 className="popup-title">Prospective Applicant Portal</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* First Name */}
          <input
            className="adm-input"
            placeholder="First name"
            value={data.first_name}
            onChange={e => s('first_name', e.target.value)}
          />

          {/* Last Name */}
          <input
            className="adm-input"
            placeholder="Last name"
            value={data.last_name}
            onChange={e => s('last_name', e.target.value)}
          />

          {/* Email */}
          <input
            className="adm-input"
            type="email"
            placeholder="Email"
            value={data.email}
            onChange={e => s('email', e.target.value)}
          />

          {/* Phone */}
          <div className="adm-phone-input">
            <PhoneInput
              flagComponent={CustomFlag}
              international
              withCountryCallingCode
              defaultCountry="US"
              value={data.phone}
              onChange={(v) => s('phone', v || '')}
              className="adm-input"
              style={{ display: 'flex', gap: '0.5rem' }}
            />
          </div>

          {/* Country */}
          <Select
            options={COUNTRIES}
            value={COUNTRIES.find(c => c.value === data.country) || null}
            onChange={(opt) => s('country', opt?.value || '')}
            placeholder="Country"
            classNamePrefix="react-select"
            className="adm-select"
            isClearable
          />

          {/* Complete application here */}
          <button
            className="adm-btn-next"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={!isValid}
            onClick={() => isValid && onComplete(data)}
          >
            Complete application here <ArrowRight size={16} />
          </button>

          {/* Send link */}
          <button
            className="adm-btn-back"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={!isValid || sending}
            onClick={handleSendLink}
          >
            {sending ? <Loader2 size={16} className="spinning" /> : <Send size={16} />}
            Send link to applicant to complete
          </button>
        </div>
      </div>
    </div>
  )
}
