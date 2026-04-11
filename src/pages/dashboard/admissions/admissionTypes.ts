// Shared types for the Admission Workflow

export interface AdmissionFormData {
  // Step 0: Intake
  intake_first_name: string
  intake_last_name: string
  intake_email: string
  intake_phone: string
  intake_country: string

  // Step 1: Personal Background
  prefix: string
  first_name: string
  middle_name: string
  last_name: string
  no_last_name_on_doc: boolean
  legal_name_confirmed: boolean
  email: string
  primary_phone: string
  secondary_phone: string
  date_of_birth: string
  gender: string
  marital_status: string
  country_of_birth: string
  state_of_birth: string
  city_of_birth: string
  pronouns: string
  preferred_name: string
  how_did_you_hear: string
  races: string[]
  is_hispanic_latino: boolean

  // Home address
  home_country: string
  home_state: string
  home_city: string
  home_address_1: string
  home_address_2: string
  home_zip_code: string
  mailing_same_as_permanent: boolean
  mailing_country: string
  mailing_state: string
  mailing_city: string
  mailing_address_1: string
  mailing_address_2: string
  mailing_zip_code: string

  // Emergency contact
  emergency_full_name: string
  emergency_relationship: string
  emergency_email: string
  emergency_phone: string
  emergency_country: string
  emergency_state: string
  emergency_city: string
  emergency_address_1: string
  emergency_address_2: string
  emergency_zip: string
  emergency_speaks_english: boolean

  // Step 2: Citizenship
  primary_citizenship: string
  secondary_citizenship: string
  passport_number: string
  passport_expiry_date: string
  country_applying_from: string

  // Step 3: Representative
  representative_name: string
  representative_email: string
  representative_phone: string
  representative_address: string
  representative_city: string
  representative_state: string
  representative_zip: string
  representative_country: string

  // Step 4: Program Info
  university_id: string
  program_id: string
  how_heard_about_program: string
  applied_before: boolean
  previous_application_year: string

  // Step 5: Education (repeating entries stored separately)

  // Step 6: Work Experience (repeating entries stored separately)
  no_work_experience: boolean
  no_work_experience_explanation: string

  // Step 7: Documents (repeating entries stored separately)

  // Step 8: English Proficiency
  english_proficiency_method: string
  english_test_name: string
  english_trf_number: string
  english_test_date: string
  english_overall_score: string

  // Step 9: Financial
  funding_source: string

  // Step 10: Terms
  scholarship_release_auth: string
  applicant_signature: string
  signature_date: string
  terms_accepted: boolean
}

export interface EducationEntry {
  id?: string
  level_of_study: string
  school_type: string
  country: string
  school_name: string
  ceeb_code: string
  status: string
  graduation_date: string
  degree_obtained: string
  gpa_score: string
  start_date: string
  end_date: string
  transcript_file?: File | null
  transcript_url?: string | null
  certificate_file?: File | null
  certificate_url?: string | null
}

export interface WorkExperienceEntry {
  id?: string
  employer_name: string
  job_title: string
  employment_type: string
  industry: string
  country: string
  city_state: string
  start_date: string
  end_date: string
  currently_working: boolean
  responsibilities: string
  reason_for_leaving: string
  recommendation_letter_file?: File | null
  recommendation_letter_url?: string | null
  work_attestation_file?: File | null
  work_attestation_url?: string | null
  additional_doc_file?: File | null
  additional_doc_url?: string | null
}

export interface DocumentEntry {
  id?: string
  document_type: string
  file?: File | null
  file_url?: string | null
  file_name?: string
  document_number: string
  issue_date: string
  expiry_date: string
  notes: string
  is_mandatory: boolean
}

export const MANDATORY_DOCUMENT_TYPES = [
  'Birth Certificate',
  'CV / Resume',
  'SOP / Statement of Purpose'
]

export const ALL_DOCUMENT_TYPES = [
  ...MANDATORY_DOCUMENT_TYPES,
  'Awards',
  'Certifications',
  'Recommendation Letter (Academic)',
  'Professional License',
  'Internship Certificate',
  'National ID',
  'Marriage Certificate / Legal Name Change',
  'Portfolio',
  'Research Paper / Publication',
  'Supporting Letter',
  'Financial Supporting Document',
  'Other'
]

export const EMPLOYMENT_TYPES = [
  'Full-time', 'Part-time', 'Contract', 'Internship', 'Volunteer', 'Self-employed'
]

export const INDUSTRIES = [
  'Healthcare', 'Education', 'Finance', 'Technology', 'NGO',
  'Government', 'Manufacturing', 'Retail', 'Hospitality',
  'Construction', 'Agriculture', 'Media', 'Legal',
  'Energy', 'Transportation', 'Other'
]

export const PREFIXES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.']

export const RELATIONSHIPS = [
  'Parent', 'Guardian', 'Sibling', 'Relative', 'Friend', 'Grandparent', 'Other'
]

export const HOW_DID_YOU_HEAR = [
  'Social Media', 'Search Engine', 'Friend', 'Family', 'Agent', 'Event', 'Other'
]

export const HOW_HEARD_ABOUT_PROGRAM = [
  'Social Media (Facebook, Instagram, LinkedIn, TikTok)',
  'Search Engine (Google, Bing)',
  'YouTube',
  'Email Marketing',
  'Agent / Recruiter',
  'Friend / Family Referral',
  'University Website',
  'Education Fair / Event',
  'Alumni Referral',
  'Print Media / Newspaper',
  'Radio / TV',
  'WhatsApp / Telegram Group',
  'Blog / Online Article',
  'Other'
]

export const EDUCATION_LEVELS = ['High School', 'Undergraduate', 'Graduate']

export const SCHOOL_TYPES = [
  'None', 'Secondary', 'University', 'College', 'Vocational School', 'Post-secondary', 'Other'
]

export const EDUCATION_STATUS = ['Graduated', 'In Progress', 'Withdrawn']

export const ENGLISH_METHODS = [
  'Official English proficiency test results',
  'Degree taught in English',
  'Native English-speaking country',
  'Institutional waiver / exemption'
]

export const ENGLISH_TESTS = [
  'IELTS', 'TOEFL iBT', 'TOEFL PBT', 'PTE Academic', 'Duolingo English Test', 'Cambridge C1/C2'
]

export const FUNDING_SOURCES = [
  'Self-funded', 'Parent / Family Sponsor', 'Employer Sponsor',
  'Scholarship', 'Government Sponsor', 'Mixed Funding', 'Other'
]

export const RACES = [
  'American Indian or Alaska Native', 'Asian', 'Black or African American',
  'Native Hawaiian or Other Pacific Islander', 'White', 'Other'
]

export function createEmptyFormData(): AdmissionFormData {
  return {
    intake_first_name: '', intake_last_name: '', intake_email: '', intake_phone: '', intake_country: '',
    prefix: '', first_name: '', middle_name: '', last_name: '',
    no_last_name_on_doc: false, legal_name_confirmed: false,
    email: '', primary_phone: '', secondary_phone: '',
    date_of_birth: '', gender: '', marital_status: '',
    country_of_birth: '', state_of_birth: '', city_of_birth: '',
    pronouns: '', preferred_name: '', how_did_you_hear: '',
    races: [], is_hispanic_latino: false,
    home_country: '', home_state: '', home_city: '',
    home_address_1: '', home_address_2: '', home_zip_code: '',
    mailing_same_as_permanent: true,
    mailing_country: '', mailing_state: '', mailing_city: '',
    mailing_address_1: '', mailing_address_2: '', mailing_zip_code: '',
    emergency_full_name: '', emergency_relationship: '',
    emergency_email: '', emergency_phone: '',
    emergency_country: '', emergency_state: '', emergency_city: '',
    emergency_address_1: '', emergency_address_2: '', emergency_zip: '',
    emergency_speaks_english: false,
    primary_citizenship: '', secondary_citizenship: '',
    passport_number: '', passport_expiry_date: '', country_applying_from: '',
    representative_name: '', representative_email: '',
    representative_phone: '', representative_address: '',
    representative_city: '', representative_state: '',
    representative_zip: '', representative_country: '',
    university_id: '', program_id: '',
    how_heard_about_program: '', applied_before: false, previous_application_year: '',
    no_work_experience: false, no_work_experience_explanation: '',
    english_proficiency_method: '', english_test_name: '',
    english_trf_number: '', english_test_date: '', english_overall_score: '',
    funding_source: '',
    scholarship_release_auth: '', applicant_signature: '',
    signature_date: '', terms_accepted: false,
  }
}

export function createEmptyEducation(): EducationEntry {
  return {
    level_of_study: '', school_type: '', country: '', school_name: '',
    ceeb_code: '', status: '', graduation_date: '', degree_obtained: '',
    gpa_score: '', start_date: '', end_date: '',
    transcript_file: null, transcript_url: null,
    certificate_file: null, certificate_url: null
  }
}

export function createEmptyWorkExperience(): WorkExperienceEntry {
  return {
    employer_name: '', job_title: '', employment_type: '', industry: '',
    country: '', city_state: '', start_date: '', end_date: '',
    currently_working: false, responsibilities: '', reason_for_leaving: '',
    recommendation_letter_file: null, recommendation_letter_url: null,
    work_attestation_file: null, work_attestation_url: null,
    additional_doc_file: null, additional_doc_url: null
  }
}

export function createEmptyDocument(type: string = '', mandatory: boolean = false): DocumentEntry {
  return {
    document_type: type, file: null, file_url: null, file_name: '',
    document_number: '', issue_date: '', expiry_date: '', notes: '',
    is_mandatory: mandatory
  }
}
