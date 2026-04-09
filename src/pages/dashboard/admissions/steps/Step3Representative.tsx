import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import Select from 'react-select'
import { COUNTRIES } from '../countryData'
import type { AdmissionFormData } from '../admissionTypes'

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
  data: AdmissionFormData
  onChange: (updates: Partial<AdmissionFormData>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step3Representative({ data, onChange, onNext, onBack }: Props) {
  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })

  const isValid = data.representative_name && data.representative_email

  return (
    <div>
      <h1 className="admission-step-title">Representative Details</h1>
      <p className="admission-step-subtitle">Agency counsellor information for this application.</p>

      <div className="adm-form-grid">
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Agency Counsellor Name <span className="required">*</span></label>
          <input className="adm-input" value={data.representative_name} onChange={e => set('representative_name', e.target.value)} placeholder="Full name" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Email <span className="required">*</span></label>
          <input className="adm-input" type="email" value={data.representative_email} onChange={e => set('representative_email', e.target.value)} placeholder="Email" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Phone Number</label>
          <div className="adm-phone-input">
            <PhoneInput flagComponent={CustomFlag} international withCountryCallingCode defaultCountry="US" value={data.representative_phone} onChange={v => set('representative_phone', v || '')} className="adm-input" style={{ display: 'flex', gap: '0.5rem' }} />
          </div>
        </div>
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Address</label>
          <input className="adm-input" value={data.representative_address} onChange={e => set('representative_address', e.target.value)} placeholder="Street address" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">City</label>
          <input className="adm-input" value={data.representative_city} onChange={e => set('representative_city', e.target.value)} placeholder="City" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">State</label>
          <input className="adm-input" value={data.representative_state} onChange={e => set('representative_state', e.target.value)} placeholder="State" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Zip Code</label>
          <input className="adm-input" value={data.representative_zip} onChange={e => set('representative_zip', e.target.value)} placeholder="Zip code" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Country</label>
          <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.representative_country)} onChange={o => set('representative_country', o?.value || '')} placeholder="Country" classNamePrefix="react-select" className="adm-select" isClearable />
        </div>
      </div>

      <div className="adm-nav-buttons">
        <button className="adm-btn-back" onClick={onBack}>← Back</button>
        <button className="adm-btn-next" disabled={!isValid} onClick={onNext}>Next →</button>
      </div>
    </div>
  )
}
