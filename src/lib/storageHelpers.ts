/**
 * Centralized Supabase Storage upload/download helpers
 * Organizes files into structured bucket paths for easy admin management
 */
import { supabase } from './supabase'

/** Gets the public URL for a file in a public bucket */
export function getPublicUrl(bucket: string, path: string): string {
  const { publicUrl } = supabase.storage.from(bucket).getPublicUrl(path).data
  // Append timestamp for cache busting to ensure updates are visible immediately across the app
  return `${publicUrl}?t=${Date.now()}`
}

/** Upload a file to a specific bucket and path, returns the public URL or path */
async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  isPublic: boolean = true
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  if (isPublic) {
    return getPublicUrl(bucket, path)
  } else {
    // For private buckets, we store the raw path in the database.
    // The UI will generate a signed URL on-the-fly when the user wants to view it.
    return path
  }
}

/** 
 * Gets a viewable URL for a file. 
 * If it's already an HTTP URL (public bucket or legacy), returns it.
 * Otherwise, generates a 1-hour signed URL from the private bucket.
 */
export async function getSecureUrl(bucket: string, pathOrUrl: string, download: boolean | string = false): Promise<string | null> {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http')) {
    if (download) {
       // Append download query param if missing in public urls, though standard public urls from supabase don't support custom download headers over query param.
       return `${pathOrUrl}${pathOrUrl.includes('?') ? '&' : '?'}download=`
    }
    return pathOrUrl
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(pathOrUrl, 3600, { download })
    
  if (error) {
    console.error('Error generating signed URL:', error)
    return null
  }
  return data.signedUrl
}

/** Get file extension from a File object */
function getExt(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || 'bin'
}

// ─── Agent KYC Documents ────────────────────────────────────────────────────

/** Upload agent's business licence to kyc-documents/{agent_id}/business-licence.ext */
export async function uploadAgentKycDoc(agentId: string, file: File): Promise<string> {
  const path = `${agentId}/business-licence.${getExt(file)}`
  return uploadFile('kyc-documents', path, file, false)
}

/** Get a signed URL for an agent's KYC document */
export async function getAgentKycDocUrl(agentId: string, fileName: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .createSignedUrl(`${agentId}/${fileName}`, 3600)
  if (error) return null
  return data.signedUrl
}

// ─── Agent Contract Documents ───────────────────────────────────────────────

/** 
 * Upload a document for a contract request 
 * agent-documents/{agent_id}/{request_id}-{filename}.ext
 */
export async function uploadAgentContractDoc(
  agentId: string, 
  requestId: string, 
  file: File
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${agentId}/${requestId}-${safeName}`
  return uploadFile('agent-documents', path, file, false)
}

/** Get a signed URL for a contract document */
export async function getAgentContractDocUrl(pathOrUrl: string, download: boolean | string = false): Promise<string | null> {
  return getSecureUrl('agent-documents', pathOrUrl, download)
}

/** List all files in an agent's KYC folder */
export async function listAgentKycDocs(agentId: string) {
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .list(agentId)
  if (error) return []
  return data || []
}

// ─── University Assets ──────────────────────────────────────────────────────

/** Upload university logo → university-assets/logos/{university_id}.ext */
export async function uploadUniversityLogo(universityId: string, file: File): Promise<string> {
  const path = `logos/${universityId}.${getExt(file)}`
  return uploadFile('university-assets', path, file, true)
}

/** Upload university campus image → university-assets/images/{university_id}.ext */
export async function uploadUniversityCampusImage(universityId: string, file: File): Promise<string> {
  const path = `images/${universityId}.${getExt(file)}`
  return uploadFile('university-assets', path, file, true)
}

// ─── Program Assets ─────────────────────────────────────────────────────────

/** Upload program cover image → program-assets/covers/{program_id}.ext */
export async function uploadProgramCover(programId: string, file: File): Promise<string> {
  const path = `covers/${programId}.${getExt(file)}`
  return uploadFile('program-assets', path, file, true)
}

// ─── Student Documents ──────────────────────────────────────────────────────

export type StudentDocType =
  | 'passport'
  | 'transcript'
  | 'sop'
  | 'cv'
  | 'english-test'
  | 'financial-proof'
  | 'additional'

/** Upload student document → student-documents/{student_id}/{docType}.ext */
export async function uploadStudentDoc(
  studentId: string,
  file: File,
  docType: StudentDocType,
  index?: number
): Promise<string> {
  const suffix = docType === 'additional' && index !== undefined ? `-${index}` : ''
  const path = `${studentId}/${docType}${suffix}.${getExt(file)}`
  return uploadFile('student-documents', path, file, false)
}

/** Get a signed URL for a student document */
export async function getStudentDocUrl(studentId: string, fileName: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('student-documents')
    .createSignedUrl(`${studentId}/${fileName}`, 3600)
  if (error) return null
  return data.signedUrl
}

/** List all files in a student's document folder */
export async function listStudentDocs(studentId: string) {
  const { data, error } = await supabase.storage
    .from('student-documents')
    .list(studentId)
  if (error) return []
  return data || []
}

// ─── Admission Documents (NEW Workflow) ─────────────────────────────────────

export type AdmissionDocCategory =
  | 'citizenship'
  | 'education'
  | 'work-experience'
  | 'personal-documents'
  | 'english-proficiency'
  | 'financial'
  | 'additional'

/**
 * Upload an admission document with hierarchical path:
 * admission-documents/{studentId}_{studentName}/{applicationId}/{category}/{filename}.ext
 */
export async function uploadAdmissionDocument(
  studentId: string,
  studentName: string,
  applicationId: string,
  category: AdmissionDocCategory,
  file: File,
  subFolder?: string
): Promise<string> {
  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const timestamp = Date.now()
  const folder = subFolder ? `${category}/${subFolder}` : category
  const path = `${studentId}_${safeName}/${applicationId}/${folder}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  return uploadFile('admission-documents', path, file, false)
}

/** Get a signed URL for an admission document (private bucket) */
export async function getAdmissionDocUrl(pathOrUrl: string, download: boolean | string = false): Promise<string | null> {
  return getSecureUrl('admission-documents', pathOrUrl, download)
}

/** Delete an admission document */
export async function deleteAdmissionDocument(path: string): Promise<boolean> {
  if (!path || path.startsWith('http')) return false
  const { error } = await supabase.storage
    .from('admission-documents')
    .remove([path])
  return !error
}

/** List all files in a specific folder of a student's admission docs */
export async function listAdmissionDocs(
  studentId: string,
  studentName: string,
  applicationId: string,
  category: AdmissionDocCategory
) {
  const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const folderPath = `${studentId}_${safeName}/${applicationId}/${category}`
  const { data, error } = await supabase.storage
    .from('admission-documents')
    .list(folderPath)
  if (error) return []
  return data || []
}

// ─── News Assets ────────────────────────────────────────────────────────────

/** Upload news post image → news-assets/{postId}.ext */
export async function uploadNewsImage(postId: string, file: File): Promise<string> {
  const path = `${postId}.${getExt(file)}`
  return uploadFile('news-assets', path, file, true)
}

/** Upload announcement image → announcement-assets/{annId}.ext */
export async function uploadAnnImage(annId: string, file: File): Promise<string> {
  const path = `${annId}.${getExt(file)}`
  return uploadFile('announcement-assets', path, file, true)
}

// ─── Blog Assets ────────────────────────────────────────────────────────────

/** Upload blog featured image → blog-assets/featured/{postId}.ext */
export async function uploadBlogFeaturedImage(postId: string, file: File): Promise<string> {
  const path = `featured/${postId}.${getExt(file)}`
  return uploadFile('blog-assets', path, file, true)
}

/** Upload blog content image → blog-assets/content/{postId}-{index}.ext */
export async function uploadBlogContentImage(postId: string, file: File, index: number): Promise<string> {
  const path = `content/${postId}-${index}.${getExt(file)}`
  return uploadFile('blog-assets', path, file, true)
}

// ─── Message Attachments ────────────────────────────────────────────────────

/** Upload a message attachment → message-attachments/{senderId}/{timestamp}-{filename} */
export async function uploadMessageAttachment(senderId: string, file: File): Promise<string> {
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${senderId}/${timestamp}-${safeName}`
  return uploadFile('message-attachments', path, file, false)
}

/** Get a signed URL for a message attachment */
export async function getMessageAttachmentUrl(pathOrUrl: string): Promise<string | null> {
  return getSecureUrl('message-attachments', pathOrUrl)
}

// ─── Admin Profile Avatars & Covers ──────────────────────────────────────────

/** Upload admin avatar → admin-profiles/{userId}/avatar.ext */
export async function uploadAdminAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}/avatar.${getExt(file)}`
  return uploadFile('admin-profiles', path, file, true)
}

/** Upload admin cover image → admin-profiles/{userId}/cover.ext */
export async function uploadAdminCoverImage(userId: string, file: File): Promise<string> {
  const path = `${userId}/cover.${getExt(file)}`
  return uploadFile('admin-profiles', path, file, true)
}

// ─── Profile Avatars & Covers (Legacy/General) ───────────────────────────────

/** Upload profile avatar (uses existing 'avatars' bucket) */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const path = `${userId}.${getExt(file)}`
  return uploadFile('avatars', path, file, true)
}

/** Upload profile cover image (uses existing 'covers' bucket) */
export async function uploadCoverImage(userId: string, file: File): Promise<string> {
  const path = `${userId}.${getExt(file)}`
  return uploadFile('covers', path, file, true)
}

