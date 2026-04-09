import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Edit3, User, Shield, Briefcase, GraduationCap,
  BookOpen, FileText, Globe, DollarSign, ClipboardCheck, Send, Loader2,
  CheckCircle2
} from 'lucide-react'
import type { AdmissionFormData, EducationEntry, WorkExperienceEntry, DocumentEntry } from '../admissionTypes'
import { getCountryName } from '../countryData'

interface Props {
  data: AdmissionFormData
  educationEntries: EducationEntry[]
  workEntries: WorkExperienceEntry[]
  documentEntries: DocumentEntry[]
  selectedProgram: any
  selectedUniversity: any
  onEditStep: (step: number) => void
  onSubmit: () => void
  submitting: boolean
  onBack: () => void
}

function ReviewSection({ icon, title, stepNum, children, onEdit }: {
  icon: React.ReactNode; title: string; stepNum: number; children: React.ReactNode; onEdit: (n: number) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="adm-review-section">
      <div className="adm-review-header" onClick={() => setOpen(!open)}>
        <h3>{icon} {title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="edit-btn" onClick={e => { e.stopPropagation(); onEdit(stepNum) }}>
            <Edit3 size={12} style={{ marginRight: 4 }} /> Edit
          </button>
          {open ? <ChevronUp size={16} style={{ color: '#94a3b8' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />}
        </div>
      </div>
      {open && <div className="adm-review-body">{children}</div>}
    </div>
  )
}

function ReviewItem({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="adm-review-item">
      <div className="adm-review-item-label">{label}</div>
      <div className="adm-review-item-value">{value || '—'}</div>
    </div>
  )
}

export default function Step11ReviewSubmit({
  data, educationEntries, workEntries, documentEntries,
  selectedProgram, selectedUniversity, onEditStep, onSubmit, submitting, onBack
}: Props) {
  return (
    <div>
      <h1 className="admission-step-title">Review &amp; Submit</h1>
      <p className="admission-step-subtitle">Review all your information before submitting. Click "Edit" on any section to make changes.</p>

      {/* ═══ 1. Personal Background ═══ */}
      <ReviewSection icon={<User size={16} style={{ color: '#3A4391' }} />} title="Personal Background Information" stepNum={1} onEdit={onEditStep}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', margin: '0.75rem 0 0.5rem' }}>Personal Information</h4>
        <div className="adm-review-grid">
          <ReviewItem label="Prefix" value={data.prefix || 'N/A'} />
          <ReviewItem label="First Name" value={data.first_name} />
          <ReviewItem label="Middle Name" value={data.middle_name} />
          <ReviewItem label="Last Name" value={data.last_name || (data.no_last_name_on_doc ? '(No last name on document)' : '')} />
          <ReviewItem label="Email" value={data.email} />
          <ReviewItem label="Primary Phone" value={data.primary_phone} />
          <ReviewItem label="Secondary Phone" value={data.secondary_phone} />
          <ReviewItem label="Date of Birth" value={data.date_of_birth} />
          <ReviewItem label="Gender" value={data.gender} />
          <ReviewItem label="Marital Status" value={data.marital_status} />
          <ReviewItem label="Pronouns" value={data.pronouns} />
          <ReviewItem label="Preferred Name" value={data.preferred_name} />
          <ReviewItem label="How did you hear about us?" value={data.how_did_you_hear} />
          <ReviewItem label="Country of Birth" value={getCountryName(data.country_of_birth)} />
          <ReviewItem label="State of Birth" value={data.state_of_birth} />
          <ReviewItem label="City of Birth" value={data.city_of_birth} />
        </div>

        {data.races.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <ReviewItem label="Race(s)" value={data.races.join(', ')} />
          </div>
        )}

        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', margin: '1rem 0 0.5rem' }}>Home Address</h4>
        <div className="adm-review-grid">
          <ReviewItem label="Country" value={getCountryName(data.home_country)} />
          <ReviewItem label="State" value={data.home_state} />
          <ReviewItem label="City" value={data.home_city} />
          <ReviewItem label="Address" value={data.home_address_1} />
          <ReviewItem label="Zip" value={data.home_zip_code} />
        </div>

        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', margin: '1rem 0 0.5rem' }}>Emergency Contact</h4>
        <div className="adm-review-grid">
          <ReviewItem label="Full Name" value={data.emergency_full_name} />
          <ReviewItem label="Relationship" value={data.emergency_relationship} />
          <ReviewItem label="Email" value={data.emergency_email} />
          <ReviewItem label="Phone" value={data.emergency_phone} />
          <ReviewItem label="Country" value={getCountryName(data.emergency_country)} />
          <ReviewItem label="Speaks English" value={data.emergency_speaks_english ? 'Yes' : 'No'} />
        </div>
      </ReviewSection>

      {/* ═══ 2. Citizenship ═══ */}
      <ReviewSection icon={<Shield size={16} style={{ color: '#3A4391' }} />} title="Citizenship Information" stepNum={2} onEdit={onEditStep}>
        <div className="adm-review-grid">
          <ReviewItem label="Primary Citizenship" value={getCountryName(data.primary_citizenship)} />
          <ReviewItem label="Secondary Citizenship" value={getCountryName(data.secondary_citizenship)} />
          <ReviewItem label="Passport/ID Number" value={data.passport_number} />
          <ReviewItem label="Passport Expiry" value={data.passport_expiry_date} />
          <ReviewItem label="Country Applying From" value={getCountryName(data.country_applying_from)} />
        </div>
      </ReviewSection>

      {/* ═══ 3. Representative ═══ */}
      <ReviewSection icon={<Briefcase size={16} style={{ color: '#3A4391' }} />} title="Representative Details" stepNum={3} onEdit={onEditStep}>
        <div className="adm-review-grid">
          <ReviewItem label="Counsellor Name" value={data.representative_name} />
          <ReviewItem label="Email" value={data.representative_email} />
          <ReviewItem label="Phone" value={data.representative_phone} />
          <ReviewItem label="Address" value={data.representative_address} />
          <ReviewItem label="City" value={data.representative_city} />
          <ReviewItem label="Country" value={getCountryName(data.representative_country)} />
        </div>
      </ReviewSection>

      {/* ═══ 4. Program Information ═══ */}
      <ReviewSection icon={<GraduationCap size={16} style={{ color: '#3A4391' }} />} title="Program Information" stepNum={4} onEdit={onEditStep}>
        <div className="adm-review-grid">
          <ReviewItem label="University" value={selectedUniversity?.name} />
          <ReviewItem label="Program" value={selectedProgram?.name} />
          <ReviewItem label="Level" value={selectedProgram?.level} />
          <ReviewItem label="Duration" value={selectedProgram?.duration || `${selectedProgram?.duration_months} months`} />
          <ReviewItem label="Tuition" value={selectedProgram ? `${selectedProgram.currency} ${selectedProgram.tuition_fee?.toLocaleString()}/yr` : ''} />
          <ReviewItem label="Campus" value={selectedUniversity?.country} />
          <ReviewItem label="Applied Before" value={data.applied_before ? 'Yes' : 'No'} />
          {data.applied_before && <ReviewItem label="Previous Year" value={data.previous_application_year} />}
        </div>
      </ReviewSection>

      {/* ═══ 5. Education History ═══ */}
      <ReviewSection icon={<BookOpen size={16} style={{ color: '#3A4391' }} />} title="Education History" stepNum={5} onEdit={onEditStep}>
        {educationEntries.map((entry, idx) => (
          <div key={idx} style={{ marginBottom: idx < educationEntries.length - 1 ? '1rem' : 0, paddingBottom: idx < educationEntries.length - 1 ? '1rem' : 0, borderBottom: idx < educationEntries.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3A4391', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
              Education #{idx + 1}
            </div>
            <div className="adm-review-grid">
              <ReviewItem label="Level" value={entry.level_of_study} />
              <ReviewItem label="School Type" value={entry.school_type} />
              <ReviewItem label="School" value={entry.school_name} />
              <ReviewItem label="Country" value={getCountryName(entry.country)} />
              <ReviewItem label="Status" value={entry.status} />
              <ReviewItem label="Graduation Date" value={entry.graduation_date} />
              {entry.degree_obtained && <ReviewItem label="Degree" value={entry.degree_obtained} />}
              {entry.gpa_score && <ReviewItem label="GPA" value={entry.gpa_score} />}
            </div>
            {(entry.transcript_file || entry.certificate_file) && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {entry.transcript_file && (
                  <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Transcript
                  </span>
                )}
                {entry.certificate_file && (
                  <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Certificate
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </ReviewSection>

      {/* ═══ 6. Work Experience ═══ */}
      <ReviewSection icon={<Briefcase size={16} style={{ color: '#3A4391' }} />} title="Work Experience" stepNum={6} onEdit={onEditStep}>
        {data.no_work_experience ? (
          <div style={{ padding: '0.75rem', background: '#fffbeb', borderRadius: 8, fontSize: '0.88rem', color: '#92400e' }}>
            <strong>No formal work experience.</strong> {data.no_work_experience_explanation && <> — {data.no_work_experience_explanation}</>}
          </div>
        ) : (
          workEntries.map((entry, idx) => (
            <div key={idx} style={{ marginBottom: idx < workEntries.length - 1 ? '1rem' : 0, paddingBottom: idx < workEntries.length - 1 ? '1rem' : 0, borderBottom: idx < workEntries.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#3A4391', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                Work #{idx + 1} — {entry.employer_name}
              </div>
              <div className="adm-review-grid">
                <ReviewItem label="Job Title" value={entry.job_title} />
                <ReviewItem label="Type" value={entry.employment_type} />
                <ReviewItem label="Industry" value={entry.industry} />
                <ReviewItem label="Location" value={`${entry.city_state}, ${getCountryName(entry.country)}`} />
                <ReviewItem label="Start Date" value={entry.start_date} />
                <ReviewItem label="End Date" value={entry.currently_working ? 'Currently Working' : entry.end_date} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {entry.recommendation_letter_file && (
                  <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Recommendation Letter
                  </span>
                )}
                {entry.work_attestation_file && (
                  <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Work Attestation
                  </span>
                )}
                {entry.additional_doc_file && (
                  <span style={{ fontSize: '0.75rem', background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.5rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Additional Doc
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </ReviewSection>

      {/* ═══ 7. Documents ═══ */}
      <ReviewSection icon={<FileText size={16} style={{ color: '#3A4391' }} />} title="Personal Documents" stepNum={7} onEdit={onEditStep}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
          {documentEntries.filter(d => d.document_type).map((doc, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.75rem',
              borderRadius: 8, background: (doc.file || doc.file_url) ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${(doc.file || doc.file_url) ? '#bbf7d0' : '#fecaca'}`
            }}>
              {(doc.file || doc.file_url) ?
                <CheckCircle2 size={14} style={{ color: '#10b981', flexShrink: 0 }} /> :
                <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>✕</span>
              }
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: (doc.file || doc.file_url) ? '#166534' : '#991b1b' }}>
                {doc.document_type}
              </span>
              {doc.is_mandatory && <span style={{ fontSize: '0.6rem', background: '#3A4391', color: 'white', padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>REQ</span>}
            </div>
          ))}
        </div>
      </ReviewSection>

      {/* ═══ 8. English Proficiency ═══ */}
      <ReviewSection icon={<Globe size={16} style={{ color: '#3A4391' }} />} title="English Proficiency" stepNum={8} onEdit={onEditStep}>
        <div className="adm-review-grid">
          <ReviewItem label="Method" value={data.english_proficiency_method} />
          {data.english_test_name && <ReviewItem label="Test" value={data.english_test_name} />}
          {data.english_trf_number && <ReviewItem label="TRF Number" value={data.english_trf_number} />}
          {data.english_test_date && <ReviewItem label="Test Date" value={data.english_test_date} />}
          {data.english_overall_score && <ReviewItem label="Score" value={data.english_overall_score} />}
        </div>
      </ReviewSection>

      {/* ═══ 9. Financial ═══ */}
      <ReviewSection icon={<DollarSign size={16} style={{ color: '#3A4391' }} />} title="Financial Proof of Funds" stepNum={9} onEdit={onEditStep}>
        <div className="adm-review-grid">
          <ReviewItem label="Funding Source" value={data.funding_source} />
        </div>
      </ReviewSection>

      {/* ═══ 10. Terms ═══ */}
      <ReviewSection icon={<ClipboardCheck size={16} style={{ color: '#3A4391' }} />} title="Terms & Conditions" stepNum={10} onEdit={onEditStep}>
        <div className="adm-review-grid">
          <ReviewItem label="Scholarship Release" value={data.scholarship_release_auth === 'authorize' ? 'Authorized' : 'Not Authorized'} />
          <ReviewItem label="Terms Accepted" value={data.terms_accepted ? 'Yes' : 'No'} />
          <ReviewItem label="Signature" value={data.applicant_signature} />
          <ReviewItem label="Signature Date" value={data.signature_date} />
        </div>
      </ReviewSection>

      {/* Navigation */}
      <div className="adm-nav-buttons">
        <button className="adm-btn-back" onClick={onBack}>← Back</button>
        <button className="adm-btn-submit" onClick={onSubmit} disabled={submitting}>
          {submitting ? (
            <><Loader2 size={18} className="spinning" /> Submitting...</>
          ) : (
            <><Send size={18} /> Submit Application</>
          )}
        </button>
      </div>
    </div>
  )
}
