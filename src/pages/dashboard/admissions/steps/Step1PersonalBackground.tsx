import { CheckCircle2 } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import Select from 'react-select'
import { COUNTRIES } from '../countryData'
import type { AdmissionFormData } from '../admissionTypes'
import { PREFIXES, RELATIONSHIPS, HOW_DID_YOU_HEAR, RACES } from '../admissionTypes'

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
}

export default function Step1PersonalBackground({ data, onChange, onNext }: Props) {
  const set = (k: keyof AdmissionFormData, v: any) => onChange({ [k]: v })

  const fullName = `${data.first_name} ${data.last_name}`.trim()

  const isValid = data.prefix && data.first_name && data.email &&
    (data.no_last_name_on_doc || data.last_name) &&
    data.date_of_birth && data.gender &&
    data.home_country && data.home_city && data.home_address_1 &&
    data.emergency_full_name && data.emergency_relationship && data.emergency_phone

  return (
    <div>
      <h1 className="admission-step-title">Personal Background Information</h1>
      <p className="admission-step-subtitle">Tell us about yourself and your contact information.</p>

      {/* ═══ Personal Information ═══ */}
      <h3 className="adm-section-title">Personal Information</h3>
      <div className="adm-form-grid">
        {/* Prefix */}
        <div className="adm-form-group">
          <label className="adm-label">Prefix <span className="required">*</span></label>
          <select className="adm-input" value={data.prefix} onChange={e => set('prefix', e.target.value)}>
            <option value="">Select</option>
            {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* First Name */}
        <div className="adm-form-group">
          <label className="adm-label">First Name <span className="required">*</span></label>
          <div className="adm-input-wrapper">
            <input className={`adm-input ${data.first_name ? 'valid' : ''}`} value={data.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
            {data.first_name && <CheckCircle2 size={16} className="valid-check" />}
          </div>
        </div>

        {/* Middle Name */}
        <div className="adm-form-group">
          <label className="adm-label">Middle Name</label>
          <div className="adm-input-wrapper">
            <input className={`adm-input ${data.middle_name ? 'valid' : ''}`} value={data.middle_name} onChange={e => set('middle_name', e.target.value)} placeholder="Middle name" />
            {data.middle_name && <CheckCircle2 size={16} className="valid-check" />}
          </div>
        </div>

        {/* Last Name */}
        <div className="adm-form-group">
          <label className="adm-label">Last Name {!data.no_last_name_on_doc && <span className="required">*</span>}</label>
          <div className="adm-input-wrapper">
            <input className={`adm-input ${data.last_name ? 'valid' : ''}`} value={data.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" disabled={data.no_last_name_on_doc} />
            {data.last_name && <CheckCircle2 size={16} className="valid-check" />}
          </div>
        </div>

        {/* No last name checkbox */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-checkbox-label">
            <input type="checkbox" checked={data.no_last_name_on_doc} onChange={e => set('no_last_name_on_doc', e.target.checked)} />
            My legal document does not include a last name
          </label>
        </div>

        {/* Legal name confirmation box */}
        {(data.first_name || data.last_name) && (
          <div className="adm-form-full">
            <div className="adm-legal-confirm-box">
              <CheckCircle2 size={20} className="icon" />
              <p>
                You confirmed that <strong>{fullName || 'your name'}</strong> matches your legal name as it appears on your official documentation.
                <br /><span style={{ fontSize: '0.8rem' }}>If your name is NOT correct press "Edit Information" button, correct and resubmit.</span>
              </p>
            </div>
          </div>
        )}

        {/* Email */}
        <div className="adm-form-group">
          <label className="adm-label">Email <span className="required">*</span></label>
          <input className="adm-input" type="email" value={data.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
        </div>

        {/* Primary Phone */}
        <div className="adm-form-group">
          <label className="adm-label">Primary Phone Number <span className="required">*</span></label>
          <div className="adm-phone-input">
            <PhoneInput flagComponent={CustomFlag} international withCountryCallingCode defaultCountry="US" value={data.primary_phone} onChange={v => set('primary_phone', v || '')} className="adm-input" style={{ display: 'flex', gap: '0.5rem' }} />
          </div>
        </div>

        {/* Secondary Phone */}
        <div className="adm-form-group">
          <label className="adm-label">Secondary Phone Number</label>
          <div className="adm-phone-input">
            <PhoneInput flagComponent={CustomFlag} international withCountryCallingCode defaultCountry="US" value={data.secondary_phone} onChange={v => set('secondary_phone', v || '')} className="adm-input" style={{ display: 'flex', gap: '0.5rem' }} />
          </div>
        </div>

        {/* Date of Birth */}
        <div className="adm-form-group">
          <label className="adm-label">Date of Birth <span className="required">*</span></label>
          <input className="adm-input" type="date" value={data.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
        </div>

        {/* Gender */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Gender <span className="required">*</span></label>
          <div className="adm-radio-group">
            {['Male', 'Female', 'Other'].map(g => (
              <label key={g} className="adm-radio-label">
                <input type="radio" name="gender" value={g} checked={data.gender === g} onChange={() => set('gender', g)} />
                {g}
              </label>
            ))}
          </div>
        </div>

        {/* Marital Status */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Marital Status</label>
          <div className="adm-radio-group">
            {['Single', 'Married', 'Divorced', 'Widowed'].map(s => (
              <label key={s} className="adm-radio-label">
                <input type="radio" name="marital_status" value={s} checked={data.marital_status === s} onChange={() => set('marital_status', s)} />
                {s}
              </label>
            ))}
          </div>
        </div>

        {/* Birth location */}
        <div className="adm-form-group">
          <label className="adm-label">Country of Birth</label>
          <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.country_of_birth)} onChange={o => set('country_of_birth', o?.value || '')} placeholder="Select country" classNamePrefix="react-select" className="adm-select" isClearable />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">State of Birth</label>
          <input className="adm-input" value={data.state_of_birth} onChange={e => set('state_of_birth', e.target.value)} placeholder="State / Province" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">City of Birth</label>
          <input className="adm-input" value={data.city_of_birth} onChange={e => set('city_of_birth', e.target.value)} placeholder="City" />
        </div>

        {/* Pronouns */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">What are your pronouns?</label>
          <div className="adm-radio-group">
            {['She/Her', 'He/Him', 'They/Them', 'Other'].map(p => (
              <label key={p} className="adm-radio-label">
                <input type="radio" name="pronouns" value={p} checked={data.pronouns === p} onChange={() => set('pronouns', p)} />
                {p}
              </label>
            ))}
          </div>
        </div>

        {/* Preferred Name */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Do you have a preferred name you would like us to call you?</label>
          <input className="adm-input" value={data.preferred_name} onChange={e => set('preferred_name', e.target.value)} placeholder="Preferred name (optional)" />
        </div>

        {/* How did you hear */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">How did you hear about us?</label>
          <select className="adm-input" value={data.how_did_you_hear} onChange={e => set('how_did_you_hear', e.target.value)}>
            <option value="">Select...</option>
            {HOW_DID_YOU_HEAR.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        {/* Races */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Select one or more of the following races</label>
          <div className="adm-checkbox-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {RACES.map(r => (
              <label key={r} className="adm-checkbox-label">
                <input type="checkbox" checked={data.races.includes(r)} onChange={e => {
                  const newRaces = e.target.checked ? [...data.races, r] : data.races.filter(x => x !== r)
                  set('races', newRaces)
                }} />
                {r}
              </label>
            ))}
          </div>
        </div>

        {/* Hispanic */}
        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Are you of Hispanic, Latino, or Spanish origin?</label>
          <div className="adm-radio-group">
            <label className="adm-radio-label">
              <input type="radio" name="hispanic" checked={data.is_hispanic_latino === true} onChange={() => set('is_hispanic_latino', true)} /> Yes
            </label>
            <label className="adm-radio-label">
              <input type="radio" name="hispanic" checked={data.is_hispanic_latino === false} onChange={() => set('is_hispanic_latino', false)} /> No
            </label>
          </div>
        </div>
      </div>

      {/* ═══ Home Country Address ═══ */}
      <h3 className="adm-section-title">Home Country Address (Permanent Address)</h3>
      <div className="adm-form-grid">
        <div className="adm-form-group">
          <label className="adm-label">Country <span className="required">*</span></label>
          <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.home_country)} onChange={o => set('home_country', o?.value || '')} placeholder="Select country" classNamePrefix="react-select" className="adm-select" isClearable />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">State</label>
          <input className="adm-input" value={data.home_state} onChange={e => set('home_state', e.target.value)} placeholder="State / Province" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">City <span className="required">*</span></label>
          <input className="adm-input" value={data.home_city} onChange={e => set('home_city', e.target.value)} placeholder="City" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Address Line 1 <span className="required">*</span></label>
          <input className="adm-input" value={data.home_address_1} onChange={e => set('home_address_1', e.target.value)} placeholder="Street address" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Address Line 2</label>
          <input className="adm-input" value={data.home_address_2} onChange={e => set('home_address_2', e.target.value)} placeholder="Apt, suite, etc." />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Zip Code</label>
          <input className="adm-input" value={data.home_zip_code} onChange={e => set('home_zip_code', e.target.value)} placeholder="Zip / Postal code" />
        </div>

        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Is Mailing Address same as Permanent Address?</label>
          <div className="adm-radio-group">
            <label className="adm-radio-label">
              <input type="radio" name="mailing_same" checked={data.mailing_same_as_permanent} onChange={() => set('mailing_same_as_permanent', true)} /> Yes
            </label>
            <label className="adm-radio-label">
              <input type="radio" name="mailing_same" checked={!data.mailing_same_as_permanent} onChange={() => set('mailing_same_as_permanent', false)} /> No
            </label>
          </div>
        </div>

        {!data.mailing_same_as_permanent && (
          <>
            <div className="adm-form-group">
              <label className="adm-label">Mailing Country</label>
              <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.mailing_country)} onChange={o => set('mailing_country', o?.value || '')} placeholder="Country" classNamePrefix="react-select" className="adm-select" isClearable />
            </div>
            <div className="adm-form-group"><label className="adm-label">Mailing State</label><input className="adm-input" value={data.mailing_state} onChange={e => set('mailing_state', e.target.value)} /></div>
            <div className="adm-form-group"><label className="adm-label">Mailing City</label><input className="adm-input" value={data.mailing_city} onChange={e => set('mailing_city', e.target.value)} /></div>
            <div className="adm-form-group"><label className="adm-label">Mailing Address 1</label><input className="adm-input" value={data.mailing_address_1} onChange={e => set('mailing_address_1', e.target.value)} /></div>
            <div className="adm-form-group"><label className="adm-label">Mailing Address 2</label><input className="adm-input" value={data.mailing_address_2} onChange={e => set('mailing_address_2', e.target.value)} /></div>
            <div className="adm-form-group"><label className="adm-label">Mailing Zip Code</label><input className="adm-input" value={data.mailing_zip_code} onChange={e => set('mailing_zip_code', e.target.value)} /></div>
          </>
        )}
      </div>

      {/* ═══ Emergency Contact ═══ */}
      <h3 className="adm-section-title">Emergency Contact and Family Information</h3>
      <div className="adm-form-grid">
        <div className="adm-form-group">
          <label className="adm-label">Full Name <span className="required">*</span></label>
          <input className="adm-input" value={data.emergency_full_name} onChange={e => set('emergency_full_name', e.target.value)} placeholder="Full name" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Relationship <span className="required">*</span></label>
          <select className="adm-input" value={data.emergency_relationship} onChange={e => set('emergency_relationship', e.target.value)}>
            <option value="">Select...</option>
            {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Email</label>
          <input className="adm-input" type="email" value={data.emergency_email} onChange={e => set('emergency_email', e.target.value)} placeholder="Email" />
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Phone Number <span className="required">*</span></label>
          <div className="adm-phone-input">
            <PhoneInput flagComponent={CustomFlag} international withCountryCallingCode defaultCountry="US" value={data.emergency_phone} onChange={v => set('emergency_phone', v || '')} className="adm-input" style={{ display: 'flex', gap: '0.5rem' }} />
          </div>
        </div>
        <div className="adm-form-group">
          <label className="adm-label">Country</label>
          <Select options={COUNTRIES} value={COUNTRIES.find(c => c.value === data.emergency_country)} onChange={o => set('emergency_country', o?.value || '')} placeholder="Country" classNamePrefix="react-select" className="adm-select" isClearable />
        </div>
        <div className="adm-form-group"><label className="adm-label">State</label><input className="adm-input" value={data.emergency_state} onChange={e => set('emergency_state', e.target.value)} placeholder="State" /></div>
        <div className="adm-form-group"><label className="adm-label">City</label><input className="adm-input" value={data.emergency_city} onChange={e => set('emergency_city', e.target.value)} placeholder="City" /></div>
        <div className="adm-form-group"><label className="adm-label">Address Line 1</label><input className="adm-input" value={data.emergency_address_1} onChange={e => set('emergency_address_1', e.target.value)} placeholder="Address" /></div>
        <div className="adm-form-group"><label className="adm-label">Address Line 2</label><input className="adm-input" value={data.emergency_address_2} onChange={e => set('emergency_address_2', e.target.value)} /></div>
        <div className="adm-form-group"><label className="adm-label">Zip Code</label><input className="adm-input" value={data.emergency_zip} onChange={e => set('emergency_zip', e.target.value)} placeholder="Zip code" /></div>

        <div className="adm-form-group adm-form-full">
          <label className="adm-label">Can they communicate fluently in English?</label>
          <div className="adm-radio-group">
            <label className="adm-radio-label"><input type="radio" name="english" checked={data.emergency_speaks_english} onChange={() => set('emergency_speaks_english', true)} /> Yes</label>
            <label className="adm-radio-label"><input type="radio" name="english" checked={!data.emergency_speaks_english} onChange={() => set('emergency_speaks_english', false)} /> No</label>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="adm-nav-buttons">
        <div />
        <button className="adm-btn-next" disabled={!isValid} onClick={onNext}>
          Next <span>→</span>
        </button>
      </div>
    </div>
  )
}
