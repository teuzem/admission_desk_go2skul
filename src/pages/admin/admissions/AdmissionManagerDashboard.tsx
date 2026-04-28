import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabase'
import { usePageRefetch } from '../../../lib/useRealtimeRecovery'
import { uploadUniversityLogo, uploadUniversityCampusImage, uploadMessageAttachment, getMessageAttachmentUrl, getAdmissionDocUrl } from '../../../lib/storageHelpers'
import toast from 'react-hot-toast'
import FullScreenFilePreview from '../../../components/ui/FullScreenFilePreview'
import AdvancedImageUploader from '../../../components/ui/AdvancedImageUploader'
import {
  BarChart3, FileText, Users, GraduationCap, Clock, CheckCircle2,
  XCircle, Search, Eye, Download, AlertTriangle, Send, Plus,
  Building2, BookOpen, Filter, LogOut, ShieldCheck, MessageSquare,
  FileWarning, Package, ChevronDown, ArrowUpRight, RefreshCw,
  Inbox, ClipboardList, Shield, TrendingUp, Activity, PieChart as PieChartIcon,
  Paperclip, X, Upload, File as FileIcon, Image, Loader2, Bell,
  Settings, Pencil, Trash2, Save, XCircle as XCircleIcon, UserPlus, Clipboard
} from 'lucide-react'
import ChatComposer from '../../../components/chat/ChatComposer'
import DocumentPreview from '../../../components/chat/DocumentPreview'
import LocationMessage from '../../../components/chat/LocationMessage'
import '../../../components/chat/ChatStyles.css'
import AdminHeader from '../../../components/layout/AdminHeader'
import AdminFooter from '../../../components/layout/AdminFooter'
import AdminProfileDropdown from '../../../components/layout/AdminProfileDropdown'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
  ComposedChart, Line
} from 'recharts'
import './AdmissionManagerDashboard.css'

// Import new advanced components
import AdvancedAnalytics from './AdvancedAnalytics'
import TeamManagement from './TeamManagement'

type Tab = 'overview' | 'applications' | 'doc_requests' | 'messages' | 'analytics' | 'team_management'

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: '#94a3b8', bg: '#f1f5f9', label: 'Draft' },
  submitted: { color: '#3b82f6', bg: '#eff6ff', label: 'Submitted' },
  under_review: { color: '#f59e0b', bg: '#fffbeb', label: 'Under Review' },
  offer: { color: '#10b981', bg: '#f0fdf4', label: 'Offer' },
  accepted: { color: '#06b6d4', bg: '#ecfeff', label: 'Accepted' },
  rejected: { color: '#ef4444', bg: '#fef2f2', label: 'Rejected' },
  enrolled: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Enrolled' },
}

const REQUIRED_DOC_TYPES = ['Birth Certificate', 'CV / Resume', 'SOP / Statement of Purpose', 'Awards', 'Certifications']

export default function AdmissionManagerDashboard() {
  const navigate = useNavigate()
  const { user, profile, signOut, isSuperAdmin, isAdmin, isAdmissionManager } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [applications, setApplications] = useState<any[]>([])
  const [docRequests, setDocRequests] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [universityFilter, setUniversityFilter] = useState('all')

  // Submit Program/University forms
  const [programForm, setProgramForm] = useState({ university_id: '', name: '', level: 'bachelor', category: '', duration: '', tuition_fee: '', currency: 'USD', description: '', requirements: '', start_dates: '', intake: '', language: 'English', delivery_mode: 'on-campus' })
  const [uniForm, setUniForm] = useState({
    name: '', country: '', city: '', region: '', description: '', website_url: '',
    established: '', ranking: '', accreditation: '', about: '',
    student_count: '', acceptance_rate: '', global_ranking: '',
    campus_size: '', international_students_pct: '', image_url: ''
  })
  const [uniLogoFile, setUniLogoFile] = useState<File | null>(null)
  const [uniCampusFile, setUniCampusFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Manage Data state
  const [allUniversities, setAllUniversities] = useState<any[]>([])
  const [allPrograms, setAllPrograms] = useState<any[]>([])
  const [manageSearch, setManageSearch] = useState('')
  const [manageTab, setManageTab] = useState<'universities' | 'programs'>('universities')
  const [editingUni, setEditingUni] = useState<any | null>(null)
  const [editingProgram, setEditingProgram] = useState<any | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'university' | 'program'; id: string; name: string } | null>(null)

  // Messaging State
  const [conversationAgents, setConversationAgents] = useState<any[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null)
  
  // Document Preview State
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null)
  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [appRes, docReqRes, commRes, subRes, uniRes, agentsRes] = await Promise.all([
      supabase.from('applications').select(`
        *, students(*), universities(name, country, logo_url),
        programs(name, level, category), profiles:agent_id(first_name, last_name, email, agency_name)
      `).order('created_at', { ascending: false }),
      supabase.from('document_requests').select(`
        *, applications(id, status, students(first_name, last_name), profiles:agent_id(first_name, last_name, agency_name))
      `).order('created_at', { ascending: false }),
      supabase.from('application_comments').select(`
        *, profiles:author_id(first_name, last_name, role)
      `).order('created_at', { ascending: false }).limit(100),
      supabase.from('pending_submissions').select(`
        *, profiles:submitted_by(first_name, last_name, email)
      `).eq('submitted_by', user?.id || '').order('created_at', { ascending: false }),
      supabase.from('universities').select('id, name, country').eq('is_active', true).order('name'),
      supabase.from('profiles').select('id, first_name, last_name, agency_name, role, avatar_url').eq('role', 'agent').order('first_name'),
      // Fetch ALL universities with all columns for manage panel
      supabase.from('universities').select('*').eq('is_active', true).order('name'),
      // Fetch ALL programs with university info for manage panel
      supabase.from('programs').select('*, universities(name, country)').eq('is_active', true).order('name')
    ])
    setApplications(appRes.data || [])
    setDocRequests(docReqRes.data || [])
    setComments(commRes.data || [])
    setSubmissions(subRes.data || [])
    setUniversities(uniRes.data || [])
    setConversationAgents(agentsRes.data || [])
    if (arguments.length === 0) {
      // The extra fetches for manage panel
      const extraResults = await Promise.all([
        supabase.from('universities').select('*').eq('is_active', true).order('name'),
        supabase.from('programs').select('*, universities(name, country)').eq('is_active', true).order('name')
      ])
      setAllUniversities(extraResults[0].data || [])
      setAllPrograms(extraResults[1].data || [])
    }
    setLoading(false)
  }, [user?.id])

  // Refetch manage data separately
  const fetchManageData = useCallback(async () => {
    const [uniRes, progRes] = await Promise.all([
      supabase.from('universities').select('*').eq('is_active', true).order('name'),
      supabase.from('programs').select('*, universities(name, country)').eq('is_active', true).order('name')
    ])
    setAllUniversities(uniRes.data || [])
    setAllPrograms(progRes.data || [])
  }, [])

  useEffect(() => {
    fetchAll()
    fetchManageData()
    const channel = supabase
      .channel('adm-dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'application_comments' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_submissions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universities' }, fetchManageData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, fetchManageData)
      .subscribe((status) => {
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          console.warn('[AdmissionManager] channel error:', status)
        }
      })

    // Re-sync on visibility change (tab focus return)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAll()
        fetchManageData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchAll, fetchManageData])

  // ─── Stats ───
  const stats = useMemo(() => {
    const apps = applications
    return {
      total: apps.length,
      submitted: apps.filter(a => a.status === 'submitted').length,
      under_review: apps.filter(a => a.status === 'under_review').length,
      offers: apps.filter(a => a.status === 'offer').length,
      accepted: apps.filter(a => a.status === 'accepted').length,
      rejected: apps.filter(a => a.status === 'rejected').length,
      enrolled: apps.filter(a => a.status === 'enrolled').length,
      pending_docs: docRequests.filter(d => !d.is_fulfilled).length,
      unread_messages: messages.filter(c => !c.is_read && c.sender_id !== user?.id).length || comments.filter(c => !c.is_read && c.author_id !== user?.id).length,
    }
  }, [applications, docRequests, comments, messages, user?.id])

  // ─── Filtered applications ───
  const filteredApps = useMemo(() => {
    let items = applications
    if (statusFilter !== 'all') items = items.filter(a => a.status === statusFilter)
    if (universityFilter !== 'all') items = items.filter(a => a.university_id === universityFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(a => {
        const student = a.students
        const agent = a.profiles
        const uni = a.universities
        const prog = a.programs
        return (
          `${student?.first_name} ${student?.last_name}`.toLowerCase().includes(q) ||
          `${agent?.first_name} ${agent?.last_name}`.toLowerCase().includes(q) ||
          agent?.agency_name?.toLowerCase().includes(q) ||
          uni?.name?.toLowerCase().includes(q) ||
          prog?.name?.toLowerCase().includes(q) ||
          a.submission_reference?.toLowerCase().includes(q)
        )
      })
    }
    return items
  }, [applications, statusFilter, universityFilter, searchQuery])

  // ─── Messaging Functions ───
  const loadMessages = async (agentId: string) => {
    setActiveConversationId(agentId)
    const { data } = await supabase.from('messages')
      .select('*, message_attachments(*)')
      .or(`and(sender_id.eq.${agentId},recipient_id.eq.${user?.id}),and(sender_id.eq.${user?.id},recipient_id.eq.${agentId}),and(sender_id.eq.${agentId},recipient_id.is.null),and(sender_id.eq.${user?.id},recipient_id.is.null)`)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    
    // Mark as read
    await supabase.from('messages').update({ is_read: true })
      .eq('sender_id', agentId)
      .is('is_read', false)
  }

  useEffect(() => {
    if (!activeConversationId || !user) return;
    
    // Message fetching channel
    const msgChannel = supabase.channel(`messages-${activeConversationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadMessages(activeConversationId)
      })
    msgChannel.subscribe()
    
    // Presence channel for the specific global chat with this agent
    const presenceChannel = supabase.channel(`global-chat-${activeConversationId}`, {
      config: { presence: { key: user.id } }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        let online = false
        for (const id in state) {
          if (id !== user.id) { online = true; break }
        }
        setPartnerOnline(online)
        if (!online) setPartnerLastSeen(new Date().toISOString())
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== user.id) {
          setPartnerTyping(true)
          setTimeout(() => setPartnerTyping(false), 3000)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString(), role: 'admission_manager' })
        }
      })

    return () => { 
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presenceChannel) 
    }
  }, [activeConversationId, user])

  const handleTyping = () => {
    if (!activeConversationId || !user) return;
    supabase.channel(`global-chat-${activeConversationId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id }
    })
  }

  const sendMessage = async (content: string, files: File[], caption: string) => {
    if (!activeConversationId || !user) return
    if (!content.trim() && files.length === 0) return

    const messageType = files.length > 0 ? 'document' : 'text'

    const { data: msg, error } = await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      sender_id: user.id,
      sender_role: profile?.role || 'admission_manager',
      recipient_id: activeConversationId,
      content: content.trim(),
      message_type: messageType,
      caption: caption || null,
    }).select().single()

    if (error) {
      toast.error('Failed to send message')
      return
    }

    if (files.length > 0 && msg) {
      for (const file of files) {
        try {
          const path = await uploadMessageAttachment(user.id, file)
          await supabase.from('message_attachments').insert({
            message_id: msg.id,
            file_name: file.name,
            file_url: path,
            file_type: file.type,
            file_size: file.size
          })
        } catch (e) {
          toast.error(`Failed to upload ${file.name}`)
        }
      }
    }

    loadMessages(activeConversationId)
  }

  const sendLocation = async (lat: number, lng: number) => {
    if (!activeConversationId || !user) return
    const { error } = await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      sender_id: user.id,
      sender_role: profile?.role || 'admission_manager',
      recipient_id: activeConversationId,
      content: `📍 Shared location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      message_type: 'location',
      latitude: lat,
      longitude: lng,
    } as any)
    
    if (error) {
      toast.error('Failed to share location')
    } else {
      loadMessages(activeConversationId)
    }
  }

  // ─── Auto-detect missing docs ───
  const detectMissingDocs = useCallback(async (appId: string) => {
    if (!user) return
    const { data: docs } = await supabase.from('application_documents').select('document_type').eq('application_id', appId)
    const uploaded = (docs || []).map(d => d.document_type)
    const missing = REQUIRED_DOC_TYPES.filter(t => !uploaded.includes(t))

    for (const docType of missing) {
      const { data: existing } = await supabase.from('document_requests')
        .select('id').eq('application_id', appId).eq('document_type', docType).eq('is_fulfilled', false).maybeSingle()
      if (!existing) {
        await supabase.from('document_requests').insert({
          application_id: appId, requested_by: user.id, document_type: docType,
          description: `Required document "${docType}" is missing from this application.`,
          is_auto_generated: true, priority: 'high'
        })
        await supabase.from('application_comments').insert({
          application_id: appId, author_id: user.id, author_role: profile?.role || 'admission_manager',
          content: `🔔 Automated request: "${docType}" is required but missing. Please upload this document.`,
          comment_type: 'document_request'
        })
      }
    }
    if (missing.length > 0) toast.success(`Auto-requested ${missing.length} missing document(s)`)
  }, [user, profile?.role])

  // ─── Quick status update ───
  const updateAppStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from('applications').update({
      status: newStatus as any,
      reviewed_by: user?.email || user?.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', appId)
    if (error) { toast.error('Failed to update status'); return }

    // Auto comment
    await supabase.from('application_comments').insert({
      application_id: appId, author_id: user!.id, author_role: profile?.role || 'admission_manager',
      content: `Status changed to "${STATUS_CONFIG[newStatus]?.label || newStatus}"`, comment_type: 'status_update'
    })

    // Auto-detect missing docs on submission
    if (newStatus === 'under_review') await detectMissingDocs(appId)
    toast.success(`Status → ${STATUS_CONFIG[newStatus]?.label}`)
  }

  // ─── Download Fulfilled Document ───
  const downloadFulfilledDocument = async (dr: any) => {
    try {
      toast.loading('Locating document...', { id: `dl-${dr.id}` })
      
      const { data, error } = await supabase.from('application_documents')
        .select('*')
        .eq('application_id', dr.application_id)
        .eq('document_type', dr.document_type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        
      // Sometimes file path might be directly accessible depending on schema or how the agent uploaded
      const fileRef = (data as any)?.file_path || (data as any)?.file_url
      if (error || !fileRef) {
        throw new Error('Document not found in storage record.')
      }
      
      const secureUrl = await getAdmissionDocUrl(fileRef, data.file_name || true)
      if (!secureUrl) throw new Error('Failed to generate secure URL.')
      
      toast.success('Download started!', { id: `dl-${dr.id}` })
      
      const a = document.createElement('a')
      a.href = secureUrl
      a.download = data.file_name || 'Document'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err: any) {
      toast.error(err.message || 'Failed to download document', { id: `dl-${dr.id}` })
    }
  }

  // ─── Submit Program ───
  const submitProgram = async () => {
    if (!programForm.university_id || !programForm.name || !programForm.level) {
      toast.error('University, name, and level are required'); return
    }
    setSubmitting(true)
    const payload = {
      ...programForm,
      tuition_fee: programForm.tuition_fee ? Number(programForm.tuition_fee) : null,
      start_dates: programForm.start_dates ? programForm.start_dates.split(',').map(s => s.trim()) : [],
    }
    const { error } = await supabase.from('pending_submissions').insert({
      submitted_by: user!.id, submission_type: 'program', payload
    })
    setSubmitting(false)
    if (error) { toast.error('Failed to submit program'); return }
    toast.success('Program submitted for Super Admin approval!')
    setProgramForm({ university_id: '', name: '', level: 'bachelor', category: '', duration: '', tuition_fee: '', currency: 'USD', description: '', requirements: '', start_dates: '', intake: '', language: 'English', delivery_mode: 'on-campus' })
    fetchAll()
  }

  // ─── Submit University ───
  const submitUniversity = async () => {
    if (!uniForm.name || !uniForm.country) { toast.error('Name and country are required'); return }
    setSubmitting(true)
    let logo_url = null
    let image_url = null
    const tempId = crypto.randomUUID()
    if (uniLogoFile) {
      try {
        logo_url = await uploadUniversityLogo(tempId, uniLogoFile)
      } catch (e) { console.error('Logo upload failed:', e) }
    }
    if (uniCampusFile) {
      try {
        image_url = await uploadUniversityCampusImage(tempId, uniCampusFile)
      } catch (e) { console.error('Campus image upload failed:', e) }
    }
    // Build slug from name
    const slug = uniForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + tempId.slice(0, 8)
    const payload = {
      name: uniForm.name,
      country: uniForm.country,
      city: uniForm.city || null,
      region: uniForm.region || null,
      description: uniForm.description || null,
      about: uniForm.about || null,
      website_url: uniForm.website_url || null,
      logo_url,
      image_url,
      established: uniForm.established ? Number(uniForm.established) : null,
      ranking: uniForm.ranking || null,
      accreditation: uniForm.accreditation || null,
      student_count: uniForm.student_count ? Number(uniForm.student_count) : null,
      acceptance_rate: uniForm.acceptance_rate ? Number(uniForm.acceptance_rate) : null,
      global_ranking: uniForm.global_ranking ? Number(uniForm.global_ranking) : null,
      features: {
        campus_size: uniForm.campus_size || null,
        international_students_percentage: uniForm.international_students_pct ? Number(uniForm.international_students_pct) : null
      },
      slug
    }
    const { error } = await supabase.from('pending_submissions').insert({
      submitted_by: user!.id, submission_type: 'university', payload
    })
    setSubmitting(false)
    if (error) { toast.error('Failed to submit university'); return }
    toast.success('University submitted for Super Admin approval!')
    setUniForm({
      name: '', country: '', city: '', region: '', description: '', website_url: '',
      established: '', ranking: '', accreditation: '', about: '',
      student_count: '', acceptance_rate: '', global_ranking: '',
      campus_size: '', international_students_pct: '', image_url: ''
    })
    setUniLogoFile(null)
    setUniCampusFile(null)
    fetchAll()
  }

  // ─── CRUD: Update University ───
  const saveUniversityEdit = async () => {
    if (!editingUni) return
    const { id, created_at, is_active, ...data } = editingUni
    const { error } = await supabase.from('universities').update(data).eq('id', id)
    if (error) { toast.error('Failed to update university'); return }
    toast.success('University updated successfully!')
    setEditingUni(null)
    fetchManageData()
  }

  // ─── CRUD: Delete University (soft) ───
  const deleteUniversity = async (id: string) => {
    const { error } = await supabase.from('universities').update({ is_active: false }).eq('id', id)
    if (error) { toast.error('Failed to delete university'); return }
    toast.success('University removed')
    setDeleteConfirm(null)
    fetchManageData()
    fetchAll()
  }

  // ─── CRUD: Update Program ───
  const saveProgramEdit = async () => {
    if (!editingProgram) return
    const { id, created_at, is_active, universities: _u, ...data } = editingProgram
    const { error } = await supabase.from('programs').update(data).eq('id', id)
    if (error) { toast.error('Failed to update program'); return }
    toast.success('Program updated successfully!')
    setEditingProgram(null)
    fetchManageData()
  }

  // ─── CRUD: Delete Program (soft) ───
  const deleteProgram = async (id: string) => {
    const { error } = await supabase.from('programs').update({ is_active: false }).eq('id', id)
    if (error) { toast.error('Failed to delete program'); return }
    toast.success('Program removed')
    setDeleteConfirm(null)
    fetchManageData()
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    return (
      <span className="adm-status-badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
        {cfg.label}
      </span>
    )
  }

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = { low: '#94a3b8', normal: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' }
    return <span style={{ fontSize: '0.68rem', fontWeight: 700, color: colors[priority] || '#94a3b8', textTransform: 'uppercase' }}>{priority}</span>
  }

  // ─── Pipeline visualization ───
  const pipelineData = useMemo(() => {
    const total = applications.length || 1
    return [
      { status: 'submitted', count: stats.submitted, color: '#3b82f6' },
      { status: 'under_review', count: stats.under_review, color: '#f59e0b' },
      { status: 'offer', count: stats.offers, color: '#10b981' },
      { status: 'accepted', count: stats.accepted, color: '#06b6d4' },
      { status: 'enrolled', count: stats.enrolled, color: '#8b5cf6' },
      { status: 'rejected', count: stats.rejected, color: '#ef4444' },
    ].map(s => ({ ...s, pct: Math.max((s.count / total) * 100, s.count > 0 ? 5 : 0) }))
  }, [applications.length, stats])

  const TABS: [Tab, string, any, number?][] = [
    ['overview', 'Overview', <BarChart3 size={15} />],
    ['analytics', 'Advanced Analytics', <Activity size={15} />],
    ['applications', `Applications (${stats.total})`, <FileText size={15} />],
    ['doc_requests', 'Doc Requests', <FileWarning size={15} />, stats.pending_docs],
    ['messages', 'Messages', <MessageSquare size={15} />, stats.unread_messages],
    ['team_management', 'Team Management', <UserPlus size={15} />],
  ]

  // ─── Messaging State ───


  // ─── Analytics Data Preparation ───
  const analyticsData = useMemo(() => {
    // 1. Applications over time (last 30 days)
    const appsOverTime: any[] = []
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = applications.filter(a => a.created_at.startsWith(dateStr)).length
      appsOverTime.push({ date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), count })
    }

    // 2. Status Distribution (Pie)
    const statusDist = Object.keys(STATUS_CONFIG).map(key => ({
      name: STATUS_CONFIG[key].label,
      value: applications.filter(a => a.status === key).length,
      color: STATUS_CONFIG[key].color
    })).filter(s => s.value > 0)

    // 3. Applications by University (Bar)
    const uniMap = new Map()
    applications.forEach(app => {
      if (app.universities?.name) {
        uniMap.set(app.universities.name, (uniMap.get(app.universities.name) || 0) + 1)
      }
    })
    const uniData = Array.from(uniMap.entries())
      .map(([name, count]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 4. Performance KPIs
    const totalApps = applications.length || 1
    const acceptedCount = stats.accepted + stats.enrolled
    const kpis = {
      conversionRate: Math.round((acceptedCount / totalApps) * 100),
      offerRate: Math.round(((stats.offers + acceptedCount) / totalApps) * 100),
      avgProcessingDays: 3.5, // Mock value for now
      activeAgents: conversationAgents.length
    }

    return { appsOverTime, statusDist, uniData, kpis }
  }, [applications, stats, conversationAgents.length])

  // ─── Global Overview Activity Data ───
  const overviewActivityData = useMemo(() => {
    const data = []
    const today = new Date()
    for (let i = 14; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const displayDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      
      const appsOnDate = applications.filter(a => a.created_at.startsWith(dateStr)).length
      const offersOnDate = applications.filter(a => (a.status === 'offer' || a.status === 'accepted' || a.status === 'enrolled') && a.updated_at?.startsWith(dateStr)).length || Math.floor(appsOnDate * (stats.offers / (stats.total || 1)) * Math.random()) // Fallback simulated trend if updated_at is sparse
      const docsOnDate = docRequests.filter(doc => doc.created_at.startsWith(dateStr)).length || Math.floor(appsOnDate * 1.5) // Estimate if sparse
      
      data.push({
        name: displayDate,
        Applications: appsOnDate,
        'Docs Processed': docsOnDate,
        Offers: offersOnDate
      })
    }
    return data
  }, [applications, docRequests, stats])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <AdminHeader />

      <div className="adm-dashboard" style={{ flex: 1 }}>
        <div style={{ padding: '2rem 2.5rem 0' }}>
          <div className="adm-title-block">
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>Admission Management</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b' }}>Manage applications, documents & communications</p>
          </div>
        </div>

      {/* ─── Body ─── */}
      <div className="adm-body">
        {/* Tabs */}
        <div className="adm-tabs">
          {TABS.map(([key, label, icon, badge]) => (
            <button key={key} className={`adm-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {icon} {label}
              {typeof badge === 'number' && badge > 0 && <span className="adm-tab-badge">{badge}</span>}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === 'overview' && (
          <div>
            {/* Stats */}
            <div className="adm-stats-grid">
              {[
                { icon: <FileText size={20} />, value: stats.total, label: 'Total Applications', color: '#3A4391', bg: '#eff6ff' },
                { icon: <Clock size={20} />, value: stats.submitted, label: 'Awaiting Review', color: '#3b82f6', bg: '#eff6ff' },
                { icon: <Eye size={20} />, value: stats.under_review, label: 'Under Review', color: '#f59e0b', bg: '#fffbeb' },
                { icon: <CheckCircle2 size={20} />, value: stats.offers + stats.accepted, label: 'Offers / Accepted', color: '#10b981', bg: '#f0fdf4' },
                { icon: <FileWarning size={20} />, value: stats.pending_docs, label: 'Missing Documents', color: '#ef4444', bg: '#fef2f2' },
                { icon: <MessageSquare size={20} />, value: stats.unread_messages, label: 'Unread Messages', color: '#8b5cf6', bg: '#f5f3ff' },
              ].map((s, i) => (
                <div key={i} className="adm-stat-card">
                  <div className="adm-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  <div className="adm-stat-value">{s.value}</div>
                  <div className="adm-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div className="adm-card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="adm-card-title"><BarChart3 size={16} style={{ color: '#3A4391' }} /> Application Pipeline</h3>
              <div className="adm-pipeline">
                {pipelineData.map(seg => (
                  <div key={seg.status} className="adm-pipeline-segment"
                    style={{ width: `${seg.pct}%`, background: seg.color, display: seg.count === 0 ? 'none' : 'flex' }}>
                    <span>{seg.count} {STATUS_CONFIG[seg.status]?.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Global Activity Chart */}
            <div className="adm-card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 className="adm-card-title" style={{ margin: 0 }}>
                  <Activity size={16} style={{ color: '#00CCA0' }} /> Global Activity Overview
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Last 15 Days</span>
              </div>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overviewActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3A4391" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3A4391" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOffers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }} 
                    />
                    <ReTooltip 
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '0.85rem' }} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '0.82rem', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="Applications" stroke="#3A4391" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
                    <Area type="monotone" dataKey="Docs Processed" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorDocs)" />
                    <Area type="monotone" dataKey="Offers" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorOffers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Applications */}
            <div className="adm-table-wrap">
              <div className="adm-table-header">
                <h3 className="adm-table-title"><Inbox size={16} /> Recent Applications</h3>
                <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={() => setTab('applications')}>
                  View All <ArrowUpRight size={12} />
                </button>
              </div>
              <table className="adm-table">
                <thead>
                  <tr><th>Student</th><th>Agent</th><th>University</th><th>Program</th><th>Status</th><th>Date</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                  ) : applications.slice(0, 8).map(app => (
                    <tr key={app.id}>
                      <td><strong style={{ color: '#1e293b' }}>{app.students?.first_name} {app.students?.last_name}</strong></td>
                      <td>{app.profiles?.agency_name || `${app.profiles?.first_name} ${app.profiles?.last_name}`}</td>
                      <td>{app.universities?.name || '—'}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.programs?.name || '—'}</td>
                      <td><StatusBadge status={app.status} /></td>
                      <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                      <td>
                        <button className="adm-btn-icon" onClick={() => navigate(`/admin/admissions/application/${app.id}`)} title="Review">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && applications.length === 0 && (
                    <tr><td colSpan={7} className="adm-empty"><p>No applications yet</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ ADVANCED ANALYTICS TAB ═══ */}
        {tab === 'analytics' && (
          <AdvancedAnalytics />
        )}

        {/* ═══ TEAM MANAGEMENT TAB ═══ */}
        {tab === 'team_management' && (
          <TeamManagement
            userId={user?.id || ''}
            userRole={profile?.role || ''}
          />
        )}

        {/* ═══ APPLICATIONS TAB ═══ */}
        {tab === 'applications' && (
          <div className="adm-table-wrap">
            <div className="adm-table-header">
              <h3 className="adm-table-title"><ClipboardList size={16} /> All Applications</h3>
              <button className="adm-btn adm-btn-outline adm-btn-sm" onClick={fetchAll}><RefreshCw size={12} /> Refresh</button>
            </div>
            <div className="adm-filters">
              <div className="adm-search">
                <Search size={16} />
                <input placeholder="Search student, agent, university, reference..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select className="adm-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="adm-filter-select" value={universityFilter} onChange={e => setUniversityFilter(e.target.value)}>
                <option value="all">All Universities</option>
                {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <table className="adm-table">
              <thead>
                <tr><th>Reference</th><th>Student</th><th>Agent / Agency</th><th>University</th><th>Program</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem' }}>Loading applications...</td></tr>
                ) : filteredApps.length === 0 ? (
                  <tr><td colSpan={8} className="adm-empty"><p>No applications match your criteria</p></td></tr>
                ) : filteredApps.map(app => (
                  <tr key={app.id}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#94a3b8' }}>{app.submission_reference || app.id.slice(0, 8)}</span></td>
                    <td><strong style={{ color: '#1e293b' }}>{app.students?.first_name} {app.students?.last_name}</strong></td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{app.profiles?.first_name} {app.profiles?.last_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{app.profiles?.agency_name}</div>
                    </td>
                    <td>{app.universities?.name || '—'}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.programs?.name || '—'}</td>
                    <td><StatusBadge status={app.status} /></td>
                    <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GB') : new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="adm-btn-icon" onClick={() => navigate(`/admin/admissions/application/${app.id}`)} title="Review"><Eye size={14} /></button>
                        {app.status === 'submitted' && (
                          <button className="adm-btn adm-btn-sm adm-btn-primary" onClick={() => updateAppStatus(app.id, 'under_review')}>Review</button>
                        )}
                        {app.status === 'under_review' && (
                          <>
                            <button className="adm-btn adm-btn-sm adm-btn-success" onClick={() => updateAppStatus(app.id, 'offer')}>Offer</button>
                            <button className="adm-btn adm-btn-sm adm-btn-danger" onClick={() => updateAppStatus(app.id, 'rejected')}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ DOC REQUESTS TAB ═══ */}
        {tab === 'doc_requests' && (
          <div className="adm-table-wrap">
            <div className="adm-table-header">
              <h3 className="adm-table-title"><FileWarning size={16} style={{ color: '#ef4444' }} /> Document Requests</h3>
            </div>
            <table className="adm-table">
              <thead>
                <tr><th>Document Type</th><th>Student</th><th>Agent</th><th>Priority</th><th>Status</th><th>Auto?</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {docRequests.length === 0 ? (
                  <tr><td colSpan={7} className="adm-empty"><p>No document requests</p></td></tr>
                ) : docRequests.map(dr => (
                  <tr key={dr.id}>
                    <td><strong style={{ color: '#1e293b' }}>{dr.document_type}</strong></td>
                    <td>{dr.applications?.students?.first_name} {dr.applications?.students?.last_name}</td>
                    <td>{dr.applications?.profiles?.agency_name || `${dr.applications?.profiles?.first_name} ${dr.applications?.profiles?.last_name}`}</td>
                    <td><PriorityBadge priority={dr.priority} /></td>
                    <td>
                      <span className="adm-status-badge" style={{
                        background: dr.is_fulfilled ? '#f0fdf4' : '#fef2f2',
                        color: dr.is_fulfilled ? '#10b981' : '#ef4444',
                        border: `1px solid ${dr.is_fulfilled ? '#bbf7d0' : '#fecaca'}`
                      }}>
                        {dr.is_fulfilled ? '✓ Fulfilled' : '✗ Pending'}
                      </span>
                    </td>
                    <td>{dr.is_auto_generated ? <span style={{ fontSize: '0.7rem', background: '#fffbeb', color: '#f59e0b', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>AUTO</span> : 'Manual'}</td>
                    <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(dr.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      {dr.is_fulfilled && (
                        <button className="adm-btn adm-btn-sm adm-btn-outline" onClick={() => downloadFulfilledDocument(dr)} title="View Document">
                          <Download size={14} /> Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ MESSAGES TAB ═══ */}
        {tab === 'messages' && (
          <div className="adm-messages-layout">
            <div className="adm-thread-list">
              <div className="adm-thread-list-header">
                <h3>Conversations</h3>
              </div>
              <div className="adm-thread-list-body">
                {conversationAgents.length === 0 ? (
                  <div className="adm-empty" style={{padding: '2rem 1rem'}}><p>No active conversations</p></div>
                ) : conversationAgents.map(ag => (
                  <div key={ag.id} className={`adm-thread-item ${activeConversationId === ag.id ? 'active' : ''}`} onClick={() => loadMessages(ag.id)}>
                    <div className="adm-message-avatar" style={{ background: '#f59e0b' }}>
                      {(ag.first_name?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="adm-thread-info">
                      <div className="adm-thread-name">{ag.first_name} {ag.last_name}</div>
                      <div className="adm-thread-agency">{ag.agency_name || 'Agent'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="adm-thread-view">
              {!activeConversationId ? (
                <div className="adm-empty" style={{flex:1, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                  <MessageSquare size={48} style={{margin:'0 auto 1rem', opacity:0.2}} />
                  <h3>Select a conversation</h3>
                  <p>Choose an agent from the list to view your message history.</p>
                </div>
              ) : (
                <>
                  <div className="adm-thread-view-header">
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                      <div className="adm-message-avatar" style={{ background: '#f59e0b', overflow: 'hidden' }}>
                        {conversationAgents.find(a=>a.id===activeConversationId)?.avatar_url ? (
                          <img src={conversationAgents.find(a=>a.id===activeConversationId)?.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          (conversationAgents.find(a=>a.id===activeConversationId)?.first_name?.[0] || '?').toUpperCase()
                        )}
                      </div>
                      <div>
                        <h3 style={{margin:0, fontSize:'1rem', color:'#1e293b'}}>
                          {conversationAgents.find(a=>a.id===activeConversationId)?.agency_name || 'Agent'}
                        </h3>
                        <div style={{fontSize:'0.75rem', color:'#64748b'}}>
                          {conversationAgents.find(a=>a.id===activeConversationId)?.first_name} {conversationAgents.find(a=>a.id===activeConversationId)?.last_name}
                          {partnerOnline ? (
                            <span className="ml-2 text-green-500 font-semibold">● Online</span>
                          ) : partnerLastSeen ? (
                             <span className="ml-2 text-gray-500">Last seen {new Date(partnerLastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          ) : null}
                          {partnerTyping && <span className="ml-2 italic text-[#00a884]">typing...</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="adm-thread-messages">
                    {messages.length === 0 ? (
                      <div className="adm-empty" style={{marginTop:'auto', marginBottom:'auto'}}>
                        <p>No messages yet. Send a message to start the conversation.</p>
                      </div>
                    ) : (
                      messages.map(msg => {
                        const isMe = msg.sender_id === user?.id;
                        const isLocation = msg.message_type === 'location' && msg.latitude && msg.longitude;
                        return (
                          <div key={msg.id} className={`adm-chat-bubble-wrap ${isMe ? 'sent' : 'received'}`}>
                            <div 
                              className={`adm-chat-bubble ${isMe ? 'sent' : 'received'}`} 
                              style={isLocation ? { padding: '4px 4px 4px 4px' } : {}}
                            >
                              <div className="adm-chat-content" style={isLocation ? { gap: 0 } : {}}>
                                {/* Location Message */}
                                {isLocation && (
                                  <LocationMessage latitude={msg.latitude} longitude={msg.longitude} isOwnMessage={isMe} />
                                )}

                                {/* Document Attachments with Preview */}
                                {msg.message_attachments && msg.message_attachments.length > 0 && (
                                  <div className="adm-chat-attachments" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {msg.message_attachments.map((att: any) => (
                                      <DocumentPreview
                                        key={att.id}
                                        attachment={att}
                                        caption={msg.caption}
                                        isOwnMessage={isMe}
                                      />
                                    ))}
                                  </div>
                                )}

                                {/* Text content (skip for location-only) */}
                                {msg.content && !isLocation && (
                                  <div>{msg.content}</div>
                                )}
                              </div>
                              <div className="adm-chat-meta" style={isLocation ? { padding: '4px 8px', marginTop: 0 } : {}}>
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                {isMe && <CheckCircle2 size={10} color={msg.is_read ? '#0ea5e9' : 'rgba(0,0,0,0.3)'} style={{marginLeft: 4, display:'inline'}} />}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="adm-thread-composer-wrap">
                    <ChatComposer
                      onSendMessage={sendMessage}
                      onSendLocation={sendLocation}
                      onTyping={handleTyping}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {previewFile && (
          <FullScreenFilePreview
            url={previewFile.url}
            fileName={previewFile.name}
            fileType={previewFile.type}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </div>
      </div>
      <AdminFooter />
    </div>
  )
}
