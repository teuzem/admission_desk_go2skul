/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CreateApplicationPage — 12-Step Admission Workflow Orchestrator
 *
 * Manages the full lifecycle:  Intake popup → 11 form steps → Submit
 * Persists draft state to Supabase; uploads documents to hierarchical buckets
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { GraduationCap, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadAdmissionDocument } from '../../lib/storageHelpers'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

// Types & factories
import type {
  AdmissionFormData,
  EducationEntry,
  WorkExperienceEntry,
  DocumentEntry
} from './admissions/admissionTypes'
import {
  createEmptyFormData,
  createEmptyEducation,
  createEmptyWorkExperience,
  createEmptyDocument,
  MANDATORY_DOCUMENT_TYPES
} from './admissions/admissionTypes'

// Layout
import AdmissionSidebar from './admissions/components/AdmissionSidebar'
import AdmissionFooter from './admissions/components/AdmissionFooter'
import './admissions/AdmissionWorkflow.css'

// Steps
import SubmitApplicationPopup from './admissions/components/SubmitApplicationPopup'
import Step1PersonalBackground from './admissions/steps/Step1PersonalBackground'
import Step2Citizenship from './admissions/steps/Step2Citizenship'
import Step3Representative from './admissions/steps/Step3Representative'
import Step4ProgramInfo from './admissions/steps/Step4ProgramInfo'
import Step5EducationHistory from './admissions/steps/Step5EducationHistory'
import Step6WorkExperience from './admissions/steps/Step6WorkExperience'
import Step7Documents from './admissions/steps/Step7Documents'
import Step8EnglishProficiency from './admissions/steps/Step8EnglishProficiency'
import Step9FinancialProof from './admissions/steps/Step9FinancialProof'
import Step10TermsConditions from './admissions/steps/Step10TermsConditions'
import Step11ReviewSubmit from './admissions/steps/Step11ReviewSubmit'

const TOTAL_STEPS = 11

export default function CreateApplicationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const effectiveId = profile?.effective_agency_id || user?.id

  // ─── Application & Step State ─────────────────────────────────────────
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0) // 0 = popup, 1-11 = steps
  const [showIntakePopup, setShowIntakePopup] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  // ─── Form Data ────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<AdmissionFormData>(createEmptyFormData())
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([createEmptyEducation()])
  const [workEntries, setWorkEntries] = useState<WorkExperienceEntry[]>([createEmptyWorkExperience()])
  const [documentEntries, setDocumentEntries] = useState<DocumentEntry[]>(
    MANDATORY_DOCUMENT_TYPES.map(t => createEmptyDocument(t, true))
  )

  // ─── File State (not in DB rows — local File objects until upload) ────
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [testResultFile, setTestResultFile] = useState<File | null>(null)
  const [financialFiles, setFinancialFiles] = useState<File[]>([])

  // ─── Program Data ─────────────────────────────────────────────────────
  const [programs, setPrograms] = useState<any[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState<any>(null)
  const [selectedUniversity, setSelectedUniversity] = useState<any>(null)

  // Track which steps have been completed
  const [stepsCompleted, setStepsCompleted] = useState<boolean[]>(new Array(TOTAL_STEPS).fill(false))
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── URL Pre-fill ─────────────────────────────────────────────────────
  useEffect(() => {
    const uniParam = searchParams.get('university')
    const progParam = searchParams.get('program')
    if (uniParam) setFormData(prev => ({ ...prev, university_id: uniParam }))
    if (progParam) setFormData(prev => ({ ...prev, program_id: progParam }))
  }, [])

  // ─── Load partner universities ────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const fetchPartnerUnis = async () => {
      const { data } = await supabase
        .from('agent_partner_selections')
        .select('university_id, universities(id, name, country, logo_url)')
        .eq('agent_id', effectiveId)
      setUniversities((data || []).map((d: any) => d.universities).filter(Boolean))
    }
    fetchPartnerUnis()
  }, [user, effectiveId])

  // ─── Load programs when university changes ────────────────────────────
  useEffect(() => {
    if (!formData.university_id) return
    const fetchPrograms = async () => {
      const { data } = await supabase
        .from('programs')
        .select('id, name, level, duration, duration_months, tuition_fee, currency, start_dates, delivery_mode, campus_type')
        .eq('university_id', formData.university_id)
        .eq('is_active', true)
      setPrograms(data || [])
    }
    fetchPrograms()
    setSelectedUniversity(universities.find(u => u.id === formData.university_id) || null)
  }, [formData.university_id, universities])

  // ─── Update selected program when program changes ─────────────────────
  useEffect(() => {
    if (!formData.program_id || !programs.length) return
    setSelectedProgram(programs.find(p => p.id === formData.program_id) || null)
  }, [formData.program_id, programs])

  // ─── Change Handler ───────────────────────────────────────────────────
  const handleFormChange = useCallback((updates: Partial<AdmissionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    scheduleDraftSave()
  }, [])

  // ─── Progress Calculation ─────────────────────────────────────────────
  const progressPercent = Math.round((stepsCompleted.filter(Boolean).length / TOTAL_STEPS) * 100)

  // ─── Step Sidebar Data ────────────────────────────────────────────────
  const sidebarSteps = stepsCompleted.map((completed, i) => ({
    label: '', // labels come from STEP_LABELS inside AdmissionSidebar
    completed
  }))

  // ─── Draft Persistence (debounced) ────────────────────────────────────
  const scheduleDraftSave = useCallback(() => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      saveDraft()
    }, 2000)
  }, [applicationId])

  const saveDraft = async () => {
    if (!applicationId) return
    try {
      await supabase.from('applications').update({
        current_step: currentStep,
        progress_percent: progressPercent,
        representative_name: formData.representative_name,
        representative_email: formData.representative_email,
        representative_phone: formData.representative_phone,
        representative_address: formData.representative_address,
        representative_city: formData.representative_city,
        representative_state: formData.representative_state,
        representative_zip: formData.representative_zip,
        representative_country: formData.representative_country,
        english_proficiency_method: formData.english_proficiency_method,
        english_test_name: formData.english_test_name,
        english_trf_number: formData.english_trf_number,
        english_test_date: formData.english_test_date,
        english_overall_score: formData.english_overall_score,
        funding_source: formData.funding_source,
        scholarship_release_auth: formData.scholarship_release_auth,
        applicant_signature: formData.applicant_signature,
        signature_date: formData.signature_date,
        terms_accepted: formData.terms_accepted,
        no_work_experience: formData.no_work_experience,
        no_work_experience_explanation: formData.no_work_experience_explanation,
        how_heard_about_program: formData.how_heard_about_program || null,
        applied_before: formData.applied_before,
        previous_application_year: formData.previous_application_year || null,
        university_id: formData.university_id || null,
        program_id: formData.program_id || null,
        updated_at: new Date().toISOString()
      }).eq('id', applicationId)

      // Save the student record too
      if (studentId) {
        await supabase.from('students').update({
          first_name: formData.first_name || formData.intake_first_name,
          last_name: formData.last_name || formData.intake_last_name,
          email: formData.email || formData.intake_email,
          phone: formData.primary_phone || formData.intake_phone,
          prefix: formData.prefix || null,
          middle_name: formData.middle_name || null,
          no_last_name_on_doc: formData.no_last_name_on_doc,
          legal_name_confirmed: formData.legal_name_confirmed,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          marital_status: formData.marital_status || null,
          country_of_birth: formData.country_of_birth || null,
          state_of_birth: formData.state_of_birth || null,
          city_of_birth: formData.city_of_birth || null,
          pronouns: formData.pronouns || null,
          preferred_name: formData.preferred_name || null,
          how_did_you_hear: formData.how_did_you_hear || null,
          races: formData.races.length > 0 ? formData.races : null,
          is_hispanic_latino: formData.is_hispanic_latino,
          home_country: formData.home_country || null,
          home_state: formData.home_state || null,
          home_city: formData.home_city || null,
          home_address_1: formData.home_address_1 || null,
          home_address_2: formData.home_address_2 || null,
          home_zip_code: formData.home_zip_code || null,
          mailing_same_as_permanent: formData.mailing_same_as_permanent,
          mailing_country: formData.mailing_country || null,
          mailing_state: formData.mailing_state || null,
          mailing_city: formData.mailing_city || null,
          mailing_address_1: formData.mailing_address_1 || null,
          mailing_address_2: formData.mailing_address_2 || null,
          mailing_zip_code: formData.mailing_zip_code || null,
          emergency_full_name: formData.emergency_full_name || null,
          emergency_relationship: formData.emergency_relationship || null,
          emergency_email: formData.emergency_email || null,
          emergency_phone: formData.emergency_phone || null,
          emergency_country: formData.emergency_country || null,
          emergency_state: formData.emergency_state || null,
          emergency_city: formData.emergency_city || null,
          emergency_address_1: formData.emergency_address_1 || null,
          emergency_address_2: formData.emergency_address_2 || null,
          emergency_zip: formData.emergency_zip || null,
          emergency_speaks_english: formData.emergency_speaks_english,
          primary_citizenship: formData.primary_citizenship || null,
          secondary_citizenship: formData.secondary_citizenship || null,
          passport_number: formData.passport_number || null,
          passport_expiry_date: formData.passport_expiry_date || null,
          country_applying_from: formData.country_applying_from || null,
          nationality: formData.primary_citizenship || formData.intake_country || null,
          country_of_residence: formData.home_country || null,
          primary_phone: formData.primary_phone || null,
          secondary_phone: formData.secondary_phone || null,
        }).eq('id', studentId)
      }
    } catch (err) {
      console.error('Draft save error:', err)
    }
  }

  // ─── Intake Submission (Step 0 → Step 1) ──────────────────────────────
  const handleIntakeSubmit = async (intakeData: {
    first_name: string; last_name: string; email: string; phone: string; country: string
  }) => {
    if (!user || !effectiveId) {
      toast.error('You must be logged in')
      return
    }

    try {
      setLoading(true)

      // 1. Create student
      const { data: student, error: studentErr } = await supabase.from('students').insert({
        agent_id: effectiveId,
        first_name: intakeData.first_name,
        last_name: intakeData.last_name,
        email: intakeData.email,
        phone: intakeData.phone,
        nationality: intakeData.country
      }).select('id').single()

      if (studentErr) throw studentErr

      // 2. Create application
      const { data: app, error: appErr } = await supabase.from('applications').insert({
        agent_id: effectiveId,
        student_id: student.id,
        status: 'draft',
        current_step: 1,
        progress_percent: 0,
        university_id: formData.university_id || null,
        program_id: formData.program_id || null,
      }).select('id').single()

      if (appErr) throw appErr

      // 3. Pre-fill form data from intake
      setFormData(prev => ({
        ...prev,
        intake_first_name: intakeData.first_name,
        intake_last_name: intakeData.last_name,
        intake_email: intakeData.email,
        intake_phone: intakeData.phone,
        intake_country: intakeData.country,
        first_name: intakeData.first_name,
        last_name: intakeData.last_name,
        email: intakeData.email,
        primary_phone: intakeData.phone,
        // Auto-fill representative from agent profile
        representative_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        representative_email: profile?.email || '',
        representative_phone: profile?.phone || '',
        representative_country: profile?.office_country || profile?.country || '',
        representative_city: profile?.office_city || profile?.city || '',
        representative_address: profile?.office_address || '',
      }))

      setStudentId(student.id)
      setApplicationId(app.id)
      setShowIntakePopup(false)
      setCurrentStep(1)

      toast.success('Application started — fill in the student details')
    } catch (err: any) {
      toast.error(err.message || 'Failed to start application')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step Navigation ──────────────────────────────────────────────────
  const markStepCompleted = (step: number) => {
    setStepsCompleted(prev => {
      const next = [...prev]
      next[step - 1] = true
      return next
    })
  }

  const goNext = () => {
    markStepCompleted(currentStep)
    setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS))
    scheduleDraftSave()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ─── Final Submission ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!applicationId || !studentId) return

    try {
      setSubmitting(true)
      const studentName = `${formData.first_name}_${formData.last_name}`.replace(/\s+/g, '_')
      const appId = applicationId

      // ╔══════════════════════════════════════════════════════════════════╗
      // ║  STEP 0: FINAL COMPREHENSIVE DATA SAVE                        ║
      // ║  Must happen BEFORE file uploads to ensure no data loss        ║
      // ╚══════════════════════════════════════════════════════════════════╝

      // ── Save ALL student fields (the definitive save) ──
      const { error: studentError } = await supabase.from('students').update({
        first_name: formData.first_name || formData.intake_first_name,
        last_name: formData.last_name || formData.intake_last_name,
        email: formData.email || formData.intake_email,
        phone: formData.primary_phone || formData.intake_phone,
        prefix: formData.prefix || null,
        middle_name: formData.middle_name || null,
        no_last_name_on_doc: formData.no_last_name_on_doc,
        legal_name_confirmed: formData.legal_name_confirmed,
        date_of_birth: formData.date_of_birth || null,
        gender: formData.gender || null,
        marital_status: formData.marital_status || null,
        country_of_birth: formData.country_of_birth || null,
        state_of_birth: formData.state_of_birth || null,
        city_of_birth: formData.city_of_birth || null,
        pronouns: formData.pronouns || null,
        preferred_name: formData.preferred_name || null,
        how_did_you_hear: formData.how_did_you_hear || null,
        races: formData.races.length > 0 ? formData.races : null,
        is_hispanic_latino: formData.is_hispanic_latino,
        primary_phone: formData.primary_phone || null,
        secondary_phone: formData.secondary_phone || null,
        nationality: formData.primary_citizenship || formData.intake_country || null,
        primary_citizenship: formData.primary_citizenship || null,
        secondary_citizenship: formData.secondary_citizenship || null,
        passport_number: formData.passport_number || null,
        passport_expiry_date: formData.passport_expiry_date || null,
        country_applying_from: formData.country_applying_from || null,
        country_of_residence: formData.home_country || null,
        home_country: formData.home_country || null,
        home_state: formData.home_state || null,
        home_city: formData.home_city || null,
        home_address_1: formData.home_address_1 || null,
        home_address_2: formData.home_address_2 || null,
        home_zip_code: formData.home_zip_code || null,
        mailing_same_as_permanent: formData.mailing_same_as_permanent,
        mailing_country: formData.mailing_country || null,
        mailing_state: formData.mailing_state || null,
        mailing_city: formData.mailing_city || null,
        mailing_address_1: formData.mailing_address_1 || null,
        mailing_address_2: formData.mailing_address_2 || null,
        mailing_zip_code: formData.mailing_zip_code || null,
        emergency_full_name: formData.emergency_full_name || null,
        emergency_relationship: formData.emergency_relationship || null,
        emergency_email: formData.emergency_email || null,
        emergency_phone: formData.emergency_phone || null,
        emergency_country: formData.emergency_country || null,
        emergency_state: formData.emergency_state || null,
        emergency_city: formData.emergency_city || null,
        emergency_address_1: formData.emergency_address_1 || null,
        emergency_address_2: formData.emergency_address_2 || null,
        emergency_zip: formData.emergency_zip || null,
        emergency_speaks_english: formData.emergency_speaks_english,
      }).eq('id', studentId)

      if (studentError) {
        console.error('Student save error:', studentError)
        toast.error('Failed to save student data. Please try again.')
        setSubmitting(false)
        return
      }

      // ── Save ALL application fields (the definitive save) ──
      const { error: appSaveError } = await supabase.from('applications').update({
        university_id: formData.university_id || null,
        program_id: formData.program_id || null,
        representative_name: formData.representative_name || null,
        representative_email: formData.representative_email || null,
        representative_phone: formData.representative_phone || null,
        representative_address: formData.representative_address || null,
        representative_city: formData.representative_city || null,
        representative_state: formData.representative_state || null,
        representative_zip: formData.representative_zip || null,
        representative_country: formData.representative_country || null,
        english_proficiency_method: formData.english_proficiency_method || null,
        english_test_name: formData.english_test_name || null,
        english_trf_number: formData.english_trf_number || null,
        english_test_date: formData.english_test_date || null,
        english_overall_score: formData.english_overall_score || null,
        funding_source: formData.funding_source || null,
        scholarship_release_auth: formData.scholarship_release_auth || null,
        applicant_signature: formData.applicant_signature || null,
        signature_date: formData.signature_date || null,
        terms_accepted: formData.terms_accepted,
        no_work_experience: formData.no_work_experience,
        no_work_experience_explanation: formData.no_work_experience_explanation || null,
        how_heard_about_program: formData.how_heard_about_program || null,
        applied_before: formData.applied_before,
        previous_application_year: formData.previous_application_year || null,
        updated_at: new Date().toISOString()
      }).eq('id', appId)

      if (appSaveError) {
        console.error('Application save error:', appSaveError)
        toast.error('Failed to save application data. Please try again.')
        setSubmitting(false)
        return
      }

      // ╔══════════════════════════════════════════════════════════════════╗
      // ║  STEP 1: UPLOAD FILES & INSERT CHILD ROWS                     ║
      // ╚══════════════════════════════════════════════════════════════════╝

      // ── Passport
      if (passportFile) {
        const url = await uploadAdmissionDocument(studentId, studentName, appId, 'citizenship', passportFile)
        await supabase.from('applications').update({ passport_url: url }).eq('id', appId)
      }

      // ── English Test Results
      if (testResultFile) {
        const url = await uploadAdmissionDocument(studentId, studentName, appId, 'english-proficiency', testResultFile)
        await supabase.from('applications').update({ english_test_url: url }).eq('id', appId)
      }

      // ── Financial Proofs — save ALL files (not just the first)
      for (let i = 0; i < financialFiles.length; i++) {
        const url = await uploadAdmissionDocument(studentId, studentName, appId, 'financial', financialFiles[i], `proof-${i + 1}`)
        if (i === 0) {
          await supabase.from('applications').update({ financial_proof_url: url }).eq('id', appId)
        }
        // Also save each financial proof as an application_document for full traceability
        await supabase.from('application_documents').insert({
          application_id: appId,
          document_type: `Financial Proof ${i + 1}`,
          file_url: url,
          file_name: financialFiles[i].name,
          file_size: financialFiles[i].size,
          notes: 'Uploaded as financial proof document',
          is_mandatory: false,
          sort_order: 1000 + i  // high sort order to appear after main docs
        })
      }

      // ── Education documents (transcript + certificate)
      for (let i = 0; i < educationEntries.length; i++) {
        const entry = educationEntries[i]
        if (!entry.level_of_study || !entry.school_name || !entry.country) continue // skip empty entries

        let transcriptUrl: string | null = entry.transcript_url || null
        let certificateUrl: string | null = entry.certificate_url || null

        if (entry.transcript_file) {
          transcriptUrl = await uploadAdmissionDocument(studentId, studentName, appId, 'education', entry.transcript_file, `entry-${i + 1}/transcript`)
        }
        if (entry.certificate_file) {
          certificateUrl = await uploadAdmissionDocument(studentId, studentName, appId, 'education', entry.certificate_file, `entry-${i + 1}/certificate`)
        }

        // Normalize status string safely
        const rawStatus = (entry.status || 'in_progress').toLowerCase().replace(/\s+/g, '_')
        const validStatuses = ['graduated', 'in_progress', 'withdrawn', 'deferred']
        const normalizedStatus = validStatuses.includes(rawStatus) ? rawStatus : 'in_progress'

        const { error: eduError } = await supabase.from('education_entries').insert({
          application_id: appId,
          level_of_study: entry.level_of_study,
          school_type: entry.school_type || null,
          country: entry.country,
          school_name: entry.school_name,
          ceeb_code: entry.ceeb_code || null,
          status: normalizedStatus as 'graduated' | 'in_progress' | 'withdrawn' | 'deferred',
          graduation_date: entry.graduation_date || null,
          degree_obtained: entry.degree_obtained || null,
          gpa_score: entry.gpa_score || null,
          start_date: entry.start_date || null,
          end_date: entry.end_date || null,
          transcript_url: transcriptUrl,
          certificate_url: certificateUrl,
          sort_order: i
        })

        if (eduError) console.error(`Education entry ${i + 1} insert error:`, eduError)
      }

      // ── Work Experience documents
      if (!formData.no_work_experience) {
        for (let i = 0; i < workEntries.length; i++) {
          const entry = workEntries[i]
          if (!entry.employer_name || !entry.job_title) continue // skip empty entries

          let recLetterUrl: string | null = entry.recommendation_letter_url || null
          let attestationUrl: string | null = entry.work_attestation_url || null
          let additionalUrl: string | null = entry.additional_doc_url || null

          if (entry.recommendation_letter_file) {
            recLetterUrl = await uploadAdmissionDocument(studentId, studentName, appId, 'work-experience', entry.recommendation_letter_file, `entry-${i + 1}/recommendation`)
          }
          if (entry.work_attestation_file) {
            attestationUrl = await uploadAdmissionDocument(studentId, studentName, appId, 'work-experience', entry.work_attestation_file, `entry-${i + 1}/attestation`)
          }
          if (entry.additional_doc_file) {
            additionalUrl = await uploadAdmissionDocument(studentId, studentName, appId, 'work-experience', entry.additional_doc_file, `entry-${i + 1}/additional`)
          }

          // Normalize employment type safely
          const rawType = (entry.employment_type || 'full_time').toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_')
          const validTypes = ['full_time', 'part_time', 'contract', 'internship', 'freelance', 'volunteer']
          const normalizedType = validTypes.includes(rawType) ? rawType : 'full_time'

          const { error: workError } = await supabase.from('work_experience_entries').insert({
            application_id: appId,
            employer_name: entry.employer_name,
            job_title: entry.job_title,
            employment_type: normalizedType as 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | 'volunteer',
            industry: entry.industry,
            country: entry.country,
            city_state: entry.city_state,
            start_date: entry.start_date,
            end_date: entry.end_date || null,
            currently_working: entry.currently_working,
            responsibilities: entry.responsibilities,
            reason_for_leaving: entry.reason_for_leaving || null,
            recommendation_letter_url: recLetterUrl,
            work_attestation_url: attestationUrl,
            additional_doc_url: additionalUrl,
            sort_order: i
          })

          if (workError) console.error(`Work entry ${i + 1} insert error:`, workError)
        }
      }

      // ── Personal documents (Step 7)
      for (let i = 0; i < documentEntries.length; i++) {
        const doc = documentEntries[i]
        if (!doc.document_type || (!doc.file && !doc.file_url)) continue

        let fileUrl = doc.file_url || ''
        if (doc.file) {
          fileUrl = await uploadAdmissionDocument(studentId, studentName, appId, 'personal-documents', doc.file, doc.document_type.toLowerCase().replace(/[\s/]+/g, '-'))
        }

        const { error: docError } = await supabase.from('application_documents').insert({
          application_id: appId,
          document_type: doc.document_type,
          file_url: fileUrl,
          file_name: doc.file?.name || doc.file_name || '',
          file_size: doc.file?.size || null,
          document_number: doc.document_number || null,
          issue_date: doc.issue_date || null,
          expiry_date: doc.expiry_date || null,
          notes: doc.notes || null,
          is_mandatory: doc.is_mandatory,
          sort_order: i
        })

        if (docError) console.error(`Document ${i + 1} insert error:`, docError)
      }

      // ╔══════════════════════════════════════════════════════════════════╗
      // ║  STEP 2: FINALIZE — Generate ref, snapshot, mark submitted    ║
      // ╚══════════════════════════════════════════════════════════════════╝

      const submissionRef = `AVU-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      // Build snapshot for archive (complete record at time of submission)
      const snapshot = {
        formData,
        educationEntries: educationEntries.map(({ transcript_file, certificate_file, ...rest }) => rest),
        workEntries: workEntries.map(({ recommendation_letter_file, work_attestation_file, additional_doc_file, ...rest }) => rest),
        documentEntries: documentEntries.map(({ file, ...rest }) => rest),
        program: selectedProgram,
        university: selectedUniversity
      }

      // Final status update
      const { error: finalizeError } = await supabase.from('applications').update({
        status: 'submitted',
        submission_reference: submissionRef,
        submitted_at: new Date().toISOString(),
        submission_snapshot: snapshot,
        current_step: TOTAL_STEPS,
        progress_percent: 100,
        updated_at: new Date().toISOString()
      }).eq('id', appId)

      if (finalizeError) {
        console.error('Finalize error:', finalizeError)
        toast.error('Application data saved but finalization failed. Please try again.')
        setSubmitting(false)
        return
      }

      // Log activity
      if (effectiveId) {
        (supabase as any).from('agent_global_activities').insert({
          agent_id: effectiveId,
          activity_type: 'application_submitted',
          description: `Submitted new application for ${studentName.replace('_', ' ')} (${submissionRef})`
        }).then()
      }

      toast.success(`Application submitted! Reference: ${submissionRef}`, { duration: 6000 })
      navigate('/dashboard/applications')
    } catch (err: any) {
      console.error('Submission error:', err)
      toast.error(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  // Show intake popup (Step 0)
  if (showIntakePopup) {
    return (
      <SubmitApplicationPopup
        universities={universities}
        universityLogo={selectedUniversity?.logo_url}
        universityName={selectedUniversity?.name}
        onComplete={(intakeData) => handleIntakeSubmit(intakeData)}
        onSendLink={async (intakeData) => {
          toast.success(`Application link sent to ${intakeData.email}`)
        }}
        onClose={() => navigate('/dashboard/applications')}
      />
    )
  }

  // Determine the program header label
  const headerLabel = selectedProgram?.name
    ? `${selectedProgram.name}${selectedUniversity?.name ? ` — ${selectedUniversity.name}` : ''}`
    : 'New Application'

  return (
    <div className="admission-layout">
      {/* ─── Sidebar ─── */}
      <AdmissionSidebar
        steps={sidebarSteps}
        currentStep={currentStep}
        progressPercent={progressPercent}
        universityLogo={selectedUniversity?.logo_url}
        universityName={selectedUniversity?.name || 'AVILA UNIVERSITY ARIZONA'}
        onStepClick={goToStep}
      />

      {/* ─── Main Content ─── */}
      <div className="admission-content">
        {/* Header */}
        <div className="admission-content-header">
          <div className="program-icon">
            <GraduationCap size={20} style={{ color: '#3A4391' }} />
          </div>
          <span className="program-name">{headerLabel}</span>
        </div>

        {/* Body */}
        <div className="admission-content-body">
          {currentStep === 1 && (
            <Step1PersonalBackground
              data={formData}
              onChange={handleFormChange}
              onNext={goNext}
            />
          )}

          {currentStep === 2 && (
            <Step2Citizenship
              data={formData}
              onChange={handleFormChange}
              passportFile={passportFile}
              onPassportFile={setPassportFile}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 3 && (
            <Step3Representative
              data={formData}
              onChange={handleFormChange}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 4 && (
            <Step4ProgramInfo
              data={formData}
              onChange={handleFormChange}
              programs={programs}
              selectedProgram={selectedProgram}
              selectedUniversity={selectedUniversity}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 5 && (
            <Step5EducationHistory
              entries={educationEntries}
              onEntriesChange={(entries) => { setEducationEntries(entries); scheduleDraftSave() }}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 6 && (
            <Step6WorkExperience
              data={formData}
              onChange={handleFormChange}
              entries={workEntries}
              onEntriesChange={(entries) => { setWorkEntries(entries); scheduleDraftSave() }}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 7 && (
            <Step7Documents
              entries={documentEntries}
              onEntriesChange={(entries) => { setDocumentEntries(entries); scheduleDraftSave() }}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 8 && (
            <Step8EnglishProficiency
              data={formData}
              onChange={handleFormChange}
              testResultFile={testResultFile}
              onTestResultFile={setTestResultFile}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 9 && (
            <Step9FinancialProof
              data={formData}
              onChange={handleFormChange}
              financialFiles={financialFiles}
              onFinancialFiles={setFinancialFiles}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 10 && (
            <Step10TermsConditions
              data={formData}
              onChange={handleFormChange}
              selectedUniversity={selectedUniversity}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {currentStep === 11 && (
            <Step11ReviewSubmit
              data={formData}
              educationEntries={educationEntries}
              workEntries={workEntries}
              documentEntries={documentEntries}
              selectedProgram={selectedProgram}
              selectedUniversity={selectedUniversity}
              onEditStep={goToStep}
              onSubmit={handleSubmit}
              submitting={submitting}
              onBack={goBack}
            />
          )}
        </div>

        {/* Footer */}
        <AdmissionFooter />
      </div>
    </div>
  )
}
