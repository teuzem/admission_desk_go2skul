import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Briefcase, FileText, CheckCircle, Clock,
  ChevronDown, ChevronUp, Play, Plus, User, GraduationCap, FileSignature,
  Facebook, Instagram, Linkedin, Youtube, Music, Minus, Upload, Loader2, X, File as FileIcon,
  Paperclip
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { getSecureUrl, uploadMessageAttachment, uploadAdmissionDocument, getAdmissionDocUrl } from '../../lib/storageHelpers'
import ApplicationChat from '../../components/common/ApplicationChat'
import FullScreenFilePreview from '../../components/ui/FullScreenFilePreview'
import ChatComposer from '../../components/chat/ChatComposer'
import DocumentPreview from '../../components/chat/DocumentPreview'
import LocationMessage from '../../components/chat/LocationMessage'
import '../../components/chat/ChatStyles.css'
import './DashboardPages.css'

// Advanced detailed statuses matching mockup pastel colours
const renderMockBadge = (status: string) => {
  let cls = 'mock-badge '
  let label = status
  switch(status) {
    case 'draft': 
      cls += 'draft'; label = 'Draft Application'; break;
    case 'incomplete': 
      cls += 'incomplete'; label = 'Application not complete'; break;
    case 'accepted': 
      cls += 'accepted'; label = 'Accepted'; break;
    case 'offer': 
      cls += 'offer'; label = 'Offer'; break;
    case 'conditional_offer': 
      cls += 'conditional-offer'; label = 'Conditional Offer'; break;
    case 'submitted':
      cls += 'accepted'; label = 'Submitted'; break; // treat submitted as green for now
    case 'under_review':
      cls += 'conditional-offer'; label = 'Under Review'; break;
    case 'enrolled':
      cls += 'accepted'; label = 'Enrolled'; break;
    case 'rejected':
      cls += 'incomplete'; label = 'Rejected'; break;
    default: 
      cls += 'draft'; label = status; break;
  }
  return <span className={cls}>{label}</span>
}

export default function MyApplicationsPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const effectiveId = profile?.effective_agency_id || user?.id
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Tabs: All Applications, Draft Applications, Document Review, Pending Tasks, Admission Review, Explore, Communication
  const [activeTab, setActiveTab] = useState('All Applications')

  // Communication / Messages State
  const [messages, setMessages] = useState<any[]>([])
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Presence and typing state
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null)
  
  // Document Preview State
  const [previewFile, setPreviewFile] = useState<{url: string, name: string, type: string} | null>(null)

  // Notifications State
  const [documentRequests, setDocumentRequests] = useState<any[]>([])
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(true)

  // Document Request Inline Upload State
  const [activeUploadReqId, setActiveUploadReqId] = useState<string | null>(null)
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  
  const handleFulfillDocumentRequest = async (req: any, file: File) => {
    try {
      setUploadingReqId(req.id)
      setUploadProgress(10)
      
      const studentId = req.applications?.student_id || req.applications?.students?.id || 'unknown_student'
      const studentName = `${req.applications?.students?.first_name || ''} ${req.applications?.students?.last_name || ''}`.trim() || 'Unknown'
      
      const dType = req.document_type.toLowerCase()
      const docCategory = dType.includes('passport') ? 'passport' : 
                         dType.includes('transcript') ? 'transcript' : 
                         dType.includes('english') ? 'english-proficiency' : 'additional'

      setUploadProgress(40)
      const path = await uploadAdmissionDocument(studentId, studentName, req.application_id, docCategory as any, file)
      
      setUploadProgress(60)
      await supabase.from('application_documents').insert({
        application_id: req.application_id,
        document_type: req.document_type,
        file_url: path,
        file_name: file.name
      } as any)

      setUploadProgress(80)
      await supabase.from('document_requests').update({
        is_fulfilled: true
      } as any).eq('id', req.id)

      await supabase.from('application_comments').insert({
        application_id: req.application_id,
        author_id: user?.id,
        author_role: 'agent',
        content: `Document provided: "${req.document_type}" has been uploaded.`,
        comment_type: 'system'
      } as any)

      setUploadProgress(100)
      
      setDocumentRequests(prev => prev.filter(r => r.id !== req.id))
      setActiveUploadReqId(null)
      toast.success('Document uploaded successfully!')
    } catch (e: any) {
      console.error('Failed to fulfill document request:', e)
      toast.error(e.message || 'Failed to upload document')
    } finally {
      setUploadingReqId(null)
      setUploadProgress(0)
    }
  }

  useEffect(() => {
    if (!user) return
    const fetchApps = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          students(first_name, last_name, email, nationality, passport_number),
          universities(name, country),
          programs(name, level, duration, tuition_fee, currency, start_dates),
          application_documents(*)
        `)
        .eq('agent_id', effectiveId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setApplications(data)
      }
      setLoading(false)
    }
    const fetchMessages = async () => {
      const orQuery = effectiveId === user?.id
        ? `sender_id.eq.${effectiveId},recipient_id.eq.${effectiveId}`
        : `sender_id.eq.${effectiveId},recipient_id.eq.${effectiveId},sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`;

      const { data, error } = await supabase.from('messages')
        .select(`
          *,
          message_attachments(*),
          sender:profiles!sender_id(first_name, last_name, avatar_url, role)
        `)
        .or(orQuery)
        .order('created_at', { ascending: true })

      if (error) console.error("Error fetching messages", error)
      if (data) {
        setMessages(data)
        // Auto scroll to bottom
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }

    const fetchDocumentRequests = async () => {
      const { data } = await supabase
        .from('document_requests')
        .select('*, applications!inner(agent_id, student_id, students(id, first_name, last_name))')
        .eq('applications.agent_id', effectiveId)
        .eq('is_fulfilled', false)
      if (data) {
        setDocumentRequests(data)
      }
    }

    fetchApps()
    fetchMessages()
    fetchDocumentRequests()

    const channel = supabase.channel('my-applications-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `agent_id=eq.${effectiveId}` }, fetchApps)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchMessages)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, fetchDocumentRequests)
      .subscribe()

    // Presence channel for the specific global chat with this agent
    const presenceChannel = supabase.channel(`global-chat-${effectiveId}`, {
      config: { presence: { key: user?.id } }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        let online = false
        for (const id in state) {
          if (id !== user?.id) { online = true; break }
        }
        setPartnerOnline(online)
        if (!online) setPartnerLastSeen(new Date().toISOString())
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user_id !== user?.id) {
          setPartnerTyping(true)
          setTimeout(() => setPartnerTyping(false), 3000)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString(), role: 'agent' })
        }
      })

    return () => { 
      supabase.removeChannel(channel)
      supabase.removeChannel(presenceChannel)
    }
  }, [user, effectiveId])

  const handleTyping = () => {
    if (!effectiveId || !user) return;
    supabase.channel(`global-chat-${effectiveId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id }
    })
  }

  // Reset pagination when searching or changing tabs/filters
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab, statusFilter, itemsPerPage])

  // Filter Logic
  const filteredApps = applications.filter((app: any) => {
    if (activeTab === 'Explore') return false
    
    // Tab filtering
    if (activeTab === 'Draft Applications' && app.status !== 'draft') return false
    if (activeTab === 'Document Review' && app.status !== 'under_review') return false
    if (activeTab === 'Pending Tasks' && app.status === 'accepted') return false // Mock condition for tasks
    if (activeTab === 'Admission Review' && !['under_review', 'submitted'].includes(app.status)) return false

    // Dropdown Status filtering
    if (statusFilter !== 'All' && app.status !== statusFilter) return false
    
    // Real-time Text Search filtering
    const studentName = app.students ? `${app.students.first_name} ${app.students.last_name}` : ''
    const studentEmail = app.students?.email || ''
    const uniName = app.universities?.name || ''
    const programName = app.programs?.name || ''
    const appId = app.id || ''

    const searchStr = searchTerm.toLowerCase()
    
    const matchSearch = (searchStr === '') || 
      studentName.toLowerCase().includes(searchStr) || 
      studentEmail.toLowerCase().includes(searchStr) ||
      uniName.toLowerCase().includes(searchStr) ||
      programName.toLowerCase().includes(searchStr) ||
      appId.toLowerCase().includes(searchStr)
      
    if (!matchSearch) return false

    return true
  })

  // Pagination Computation
  const totalItems = filteredApps.length
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1
  const paginatedApps = filteredApps.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  // Computed Stats
  const appsToSubmit = applications.filter(a => a.status === 'draft').length
  const appsToComplete = applications.filter(a => !a.students?.passport_number || a.status === 'incomplete').length
  const openTasks = applications.filter(a => ['draft', 'under_review'].includes(a.status)).length
  const completedTasks = applications.filter(a => ['accepted', 'offer', 'enrolled'].includes(a.status)).length

  const handleOpenDoc = async (path: string | null) => {
    if (!path) return
    try {
      let url = path
      // check if it is a storage path (does not start with http)
      if (!path.startsWith('http')) {
        const secureOutput = await getSecureUrl('application-documents', path) // old fallback
        if (!secureOutput) {
           const secureAd = await getAdmissionDocUrl(path)
           url = secureAd || path
        } else {
           url = secureOutput
        }
      }
      window.open(url, '_blank')
    } catch (e) {
      console.error(e)
    }
  }

  const handleInlineDocumentUpload = async (appId: string, studentId: string, studentName: string, docCategory: string, file: File) => {
    try {
      // 1. Upload to storage
      const path = await uploadAdmissionDocument(studentId, studentName, appId, docCategory as any, file)
      
      // 2. Add to application_documents table
      const { error: insertErr } = await supabase.from('application_documents').insert({
        application_id: appId,
        document_type: docCategory,
        file_url: path,
        file_name: file.name
      } as any)
      if (insertErr) throw insertErr

      // 3. Optional: update application's old column if it maps
      const oldColMap: Record<string, string> = {
        'passport': 'passport_url',
        'transcript': 'transcript_url',
        'english-proficiency': 'english_test_url',
        'financial': 'financial_proof_url'
      }
      if (oldColMap[docCategory]) {
        await supabase.from('applications').update({ [oldColMap[docCategory]]: path }).eq('id', appId)
      }

      // Reload applications to show the new document
      const tempId = effectiveId
      const { data } = await supabase
        .from('applications')
        .select(`
          *,
          students(first_name, last_name, email, nationality, passport_number),
          universities(name, country),
          programs(name, level, duration, tuition_fee, currency, start_dates),
          application_documents(*)
        `)
        .eq('agent_id', tempId || '')
        .order('created_at', { ascending: false })
      if (data) setApplications(data)
    } catch (e) {
      console.error('Failed to upload inline document', e)
    }
  }

  // Messaging Functions
  const sendMessage = async (content: string, files: File[], caption: string) => {
    if (!user) return
    if (!content.trim() && files.length === 0) return

    const messageType = files.length > 0 ? 'document' : 'text'

    const { data: msg, error } = await supabase.from('messages').insert({
      sender_id: user.id,
      sender_role: 'agent',
      recipient_id: null,
      content: content.trim(),
      message_type: messageType,
      caption: caption || null,
    } as any).select().single()

    if (error) {
      console.error(error)
      throw new Error('Failed to send message')
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
  }

  const sendLocation = async (lat: number, lng: number) => {
    if (!user) return
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      sender_role: 'agent',
      recipient_id: null,
      content: `📍 Shared location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      message_type: 'location',
      latitude: lat,
      longitude: lng,
    } as any)
    if (error) throw new Error('Failed to share location')
  }

  useEffect(() => {
    if (activeTab === 'Communication') {
      supabase.from('messages').update({ is_read: true }).eq('recipient_id', effectiveId).then(() => {})
    }
  }, [activeTab, effectiveId, messages.length])

  return (
    <div style={{ padding: '2rem 1rem 4rem 1rem', maxWidth: '100%', width: '100%', margin: 0 }}>
      {/* HEADER SECTION */}
      <div className="apps-header-bar">
        <h1 className="apps-header-title">Applications</h1>
        <Link to="/dashboard/applications/create" className="btn btn-primary" style={{ background: '#0f172a', fontWeight: 600 }}>
          <Plus size={18} style={{ marginRight: '6px' }} /> Start new application +
        </Link>
      </div>

      {/* STATS SECTION */}
      <div className="app-stats-grid">
        <div className="app-stat-card">
          <div className="app-stat-icon"><Briefcase /></div>
          <div className="app-stat-info">
            <span className="app-stat-value">{appsToSubmit}</span>
            <span className="app-stat-label">Application to Submit</span>
          </div>
        </div>
        <div className="app-stat-card">
          <div className="app-stat-icon"><Briefcase /></div>
          <div className="app-stat-info">
            <span className="app-stat-value">{appsToComplete}</span>
            <span className="app-stat-label">Application to Complete</span>
          </div>
        </div>
        <div className="app-stat-card">
          <div className="app-stat-icon"><Briefcase /></div>
          <div className="app-stat-info">
            <span className="app-stat-value">{openTasks}</span>
            <span className="app-stat-label">Open Tasks</span>
          </div>
        </div>
        <div className="app-stat-card">
          <div className="app-stat-icon"><CheckCircle /></div>
          <div className="app-stat-info">
            <span className="app-stat-value">{completedTasks}</span>
            <span className="app-stat-label">Completed Tasks</span>
          </div>
        </div>
      </div>

      {/* VISA BANNER */}
      <div className="visa-banner">
        <div className="visa-banner-icon"><FileText /></div>
        <div className="visa-banner-content">
          <div className="visa-banner-title">New Feature: Visa Application Information</div>
          <div className="visa-banner-text">
            Easily Upload and manage Visa details for your application. Stay organised and track your progress seamlessly. Find the Visa info section in the application detail!
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS & REQUESTS PANEL */}
      {documentRequests.length > 0 && (
        <div className="agent-notifications-panel" style={{ marginBottom: '1.5rem', background: '#ffe4e6', borderRadius: '12px', border: '1px solid #fda4af', overflow: 'hidden' }}>
          <div className="agent-notifications-header" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#e11d48' }}><FileText size={20} /></span>
              <h3 style={{ margin: 0, color: '#9f1239', fontSize: '1rem', fontWeight: 600 }}>Action Required: Document Requests ({documentRequests.length})</h3>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: '#be123c', cursor: 'pointer' }}>
              {notificationsPanelOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          {notificationsPanelOpen && (
            <div className="agent-notifications-content" style={{ padding: '0 1.25rem 1.25rem 1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {documentRequests.map(req => (
                  <div key={req.id} className="document-request-card" style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid #fecdd3', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e11d48', background: '#ffe4e6', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                        {req.priority || 'Urgent'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#0f172a' }}>{req.document_type}</h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#475569' }}>
                      For: <strong>{req.applications?.students?.first_name} {req.applications?.students?.last_name}</strong>
                    </p>
                    {req.description && (
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>"{req.description}"</p>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {activeUploadReqId === req.id ? (
                        <div style={{ marginTop: '0.5rem', width: '100%' }}>
                          <div 
                            className="dropzone"
                            style={{
                              border: '2px dashed #cbd5e1',
                              borderRadius: '8px',
                              padding: '1.5rem 1rem',
                              textAlign: 'center',
                              background: '#f8fafc',
                              position: 'relative',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                              e.preventDefault()
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleFulfillDocumentRequest(req, e.dataTransfer.files[0])
                              }
                            }}
                          >
                            <input 
                              type="file" 
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFulfillDocumentRequest(req, e.target.files[0])
                                }
                              }}
                            />
                            {uploadingReqId === req.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                                <Loader2 className="spinner" size={24} style={{ color: '#3b82f6' }} />
                                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>Uploading... {uploadProgress}%</span>
                                <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', background: '#3b82f6', width: `${uploadProgress}%`, transition: 'width 0.2s' }}></div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Upload size={24} color="#64748b" />
                                <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>
                                  Drag & drop your document here, or <span style={{ color: '#2563eb' }}>browse</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Supports PDF, JPG, PNG up to 10MB</div>
                              </>
                            )}
                          </div>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: '8px', width: '100%', borderColor: '#cbd5e1', color: '#64748b' }}
                            onClick={() => setActiveUploadReqId(null)}
                            disabled={uploadingReqId === req.id}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} onClick={() => setActiveUploadReqId(req.id)}>
                          <Upload size={14} /> Upload Document
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TABS Navigation */}
      <div className="app-tabs-header">
        {['All Applications', 'Draft Applications', 'Document Review', 'Pending Tasks', 'Admission Review', 'Communication', 'Explore'].map(tab => (
          <button 
            key={tab} 
            className={`app-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ position: 'relative' }}
          >
            {tab}
            {tab === 'Communication' && messages.filter(m => m.recipient_id === effectiveId && !m.is_read).length > 0 && (
              <span style={{ position: 'absolute', top: '4px', right: '-8px', background: '#e11d48', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                {messages.filter(m => m.recipient_id === effectiveId && !m.is_read).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* RENDER TABLE OR EXPLORE */}
      {activeTab === 'Explore' ? (
        <ExploreHub />
      ) : activeTab === 'Communication' ? (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden', height: '650px' }}>
          <div className="flex flex-col h-full bg-[#efeae2]">
            {/* Header */}
            {(() => {
              const lastReceivedMsg = messages.slice().reverse().find(m => m.sender_id !== user?.id && m.sender)
              const chatPartner = lastReceivedMsg?.sender || null
              return (
                <div className="bg-[#f0f2f5] border-b border-gray-300 p-3 flex items-center justify-between z-10 shadow-sm relative">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                      {chatPartner?.avatar_url ? (
                        <img src={chatPartner.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        (chatPartner?.first_name?.[0] || 'A') + (chatPartner?.last_name?.[0] || 'T')
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111b21] leading-tight">
                        {chatPartner ? `${chatPartner.first_name} ${chatPartner.last_name}` : 'Admissions Team'}
                      </h3>
                      <p className="text-xs text-[#667781] capitalize flex items-center">
                        {chatPartner?.role?.replace('_', ' ') || 'Support & Admission Management'}
                        {partnerOnline ? (
                          <span className="ml-2 text-green-500 font-semibold">● Online</span>
                        ) : partnerLastSeen ? (
                           <span className="ml-2 text-gray-500">Last seen {new Date(partnerLastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        ) : null}
                        {partnerTyping && <span className="ml-2 italic text-[#00a884]">typing...</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3 relative"
              style={{
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundRepeat: 'repeat',
                backgroundSize: '400px'
              }}
            >
              {messages.length === 0 ? (
                <div className="flex justify-center mt-6">
                  <div className="bg-[#ffeecd] px-4 py-2 rounded-lg shadow-sm text-center text-sm text-[#54656f] max-w-sm">
                    Messages are secured. Start a conversation with the admissions team.
                  </div>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_id === user?.id;
                  const isLocation = msg.message_type === 'location' && msg.latitude && msg.longitude;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[75%] px-3 md:px-4 py-1.5 md:py-2 relative flex flex-col shadow-sm`}
                        style={{ 
                          backgroundColor: isMe ? '#d9fdd3' : '#ffffff', 
                          borderRadius: isMe ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                          ...(isLocation ? { padding: '4px 4px 4px 4px' } : {})
                        }}
                      >
                        {!isMe && (
                          <div className="text-[12px] font-semibold text-[#00a884] mb-0.5 leading-none tracking-wide" style={isLocation ? { padding: '4px 8px 0' } : {}}>
                            <span className="capitalize">{msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : (msg.sender_role?.replace('_', ' ') || 'Admissions')}</span>
                            {msg.sender?.role && <span className="ml-2 text-[10px] text-gray-500 font-normal capitalize">({msg.sender.role.replace('_', ' ')})</span>}
                          </div>
                        )}

                        {/* Location Message */}
                        {isLocation && (
                          <LocationMessage latitude={msg.latitude} longitude={msg.longitude} isOwnMessage={isMe} />
                        )}

                        {/* Document Attachments with Preview */}
                        {msg.message_attachments && msg.message_attachments.length > 0 && (
                          <div className="mb-1 mt-1 space-y-1.5">
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
                          <p className="text-[14.5px] leading-[20px] text-[#111b21] whitespace-pre-wrap word-break pb-1">
                            {msg.content}
                          </p>
                        )}

                        <div className="self-end flex items-center justify-end gap-1 mt-0 text-[11px] text-[#667781]" style={isLocation ? { padding: '0 8px 4px' } : {}}>
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {isMe && (
                            <CheckCircle className="w-[15px] h-[15px] text-[#53bdeb] translate-y-[-1px]" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Rich Composer */}
            <ChatComposer
              onSendMessage={sendMessage}
              onSendLocation={sendLocation}
              onTyping={handleTyping}
            />
          </div>
        </div>
      ) : (
        <div className="card-panel" style={{ padding: '0', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div className="app-toolbar" style={{ padding: '1.25rem' }}>
            <div className="app-toolbar-left">
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input app-search-input" 
                  placeholder="Real-time application search..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
                <span style={{ position: 'absolute', right: '12px', top: '10px', color: '#94a3b8' }}>
                  <Search size={18} />
                </span>
              </div>
            </div>
            <div className="app-toolbar-right">
              {/* Advance Filters Dropdown */}
              <select className="form-input" style={{ width: '220px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All My Applications</option>
                <option value="draft">Draft Applications</option>
                <option value="submitted">Submitted Applications</option>
                <option value="under_review">Under Review</option>
                <option value="offer">Offers Received</option>
                <option value="conditional_offer">Conditional Offers</option>
                <option value="accepted">Accepted / Enrolled</option>
              </select>
              <button 
                className="btn btn-primary" 
                style={{ background: '#1e3a8a', padding: '0.6rem 0.8rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >&lt;</button>
              <button 
                className="btn btn-primary" 
                style={{ background: '#1e3a8a', padding: '0.6rem 0.8rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >&gt;</button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem', borderColor: '#cbd5e1', borderTopColor: '#3b82f6' }} />
              Loading applications...
            </div>
          ) : filteredApps.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <h3 style={{ color: '#334155', fontWeight: 600, fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Applications Found</h3>
                <p>No applications match your current search and filter settings.</p>
             </div>
          ) : (
            <div className="table-responsive">
              <table className="clean-data-table">
                <thead>
                  <tr>
                    <th>Created Date <ChevronDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                    <th>Applicant Name & Email <ChevronDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                    <th>Institution <ChevronDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                    <th>Programme of Study <ChevronDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                    <th>Progress <ChevronDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                    <th>Admission Status <ChevronDown size={12} style={{display:'inline', marginLeft:'4px'}}/></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApps.map(app => {
                    const studentName = app.students ? `${app.students.first_name} ${app.students.last_name}` : 'Unknown Student'
                    const programName = app.programs?.name || 'Unknown Program'
                    const uniName = app.universities?.name || 'Unknown University'
                    
                    // Format date
                    const dateObj = new Date(app.created_at)
                    const dateStr = `${dateObj.getDate()}${getOrdinalNum(dateObj.getDate())} ${dateObj.toLocaleString('en-US', {month: 'short'})} ${dateObj.getFullYear()}`
                    
                    const progress = app.status === 'draft' ? 22 : 100
                    const isExpanded = expandedId === app.id

                    return (
                      <React.Fragment key={app.id}>
                        <tr onClick={() => setExpandedId(isExpanded ? null : app.id)}>
                          <td>{dateStr}</td>
                          <td>
                            <div className="stacked-cell-primary">{studentName.toUpperCase()}</div>
                            <div className="stacked-cell-secondary">{app.students?.email}</div>
                          </td>
                          <td>{getInitials(uniName)}</td>
                          <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={programName}>{programName}</td>
                          <td>
                            <div className="progress-column-container">
                              <span className="progress-text">{progress}%</span>
                              <div className="progress-track">
                                <div className={`progress-fill ${progress === 100 ? 'complete' : 'partial'}`} style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td>{renderMockBadge(app.status)}</td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: '#f8fafc' }}>
                            <td colSpan={6} style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(280px, 1fr) minmax(300px, 1.5fr)', gap: '3rem' }}>
                                {/* Student Profile Overview */}
                                <div>
                                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                    <User size={14} color="#3b82f6" /> Applicant Overview
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[
                                      ['Full Name', studentName],
                                      ['Email Address', app.students?.email],
                                      ['Nationality', app.students?.nationality || 'Not specified'],
                                      ['Passport Number', app.students?.passport_number || 'Pending Verification'],
                                      ['Emergency Contact', app.emergency_phone || 'Not provided'],
                                    ].map(([k, v]) => (
                                      <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#64748b' }}>{k}:</span>
                                        <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Academic & Program Outline */}
                                <div>
                                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                    <GraduationCap size={14} color="#10b981" /> Academic Intention
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[
                                      ['Institution', uniName],
                                      ['Programme', programName],
                                      ['Level Target', app.programs?.level || '—'],
                                      ['Intake Term', app.intake_month || '—'],
                                      ['Required Tuition', app.programs?.tuition_fee ? `${app.programs.currency} ${app.programs.tuition_fee.toLocaleString()}` : 'Variable'],
                                    ].map(([k, v]) => (
                                      <div key={k as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#64748b' }}>{k}:</span>
                                        <span style={{ color: '#0f172a', fontWeight: 600, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{v}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Documentation Ledger & Visa Information */}
                                <div>
                                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                    <FileSignature size={14} color="#8b5cf6" /> Document Vault & Visa
                                  </h4>
                                  
                                  <div style={{ 
                                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1.5rem'
                                  }}>
                                    {/* Helper to extract the newest document of a specific category from the real-time application_documents relation, falling back to old column if missing */}
                                    {(() => {
                                      const getDocUrl = (category: string, fallbackUrl: string | null) => {
                                        const docs = app.application_documents?.filter((d: any) => d.document_category === category)
                                        if (docs && docs.length > 0) {
                                          // get most recent
                                          const latest = docs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                                          return latest.file_path
                                        }
                                        return fallbackUrl
                                      }

                                      return (
                                        <>
                                          <DocLedgerItem 
                                            name="Passport ID" 
                                            url={getDocUrl('passport', app.passport_url)} 
                                            onOpen={handleOpenDoc}
                                            onUpload={(file) => handleInlineDocumentUpload(app.id, app.student_id, studentName, 'passport', file)}
                                          />
                                          <DocLedgerItem 
                                            name="Transcripts" 
                                            url={getDocUrl('transcript', app.transcript_url)} 
                                            onOpen={handleOpenDoc}
                                            onUpload={(file) => handleInlineDocumentUpload(app.id, app.student_id, studentName, 'transcript', file)}
                                          />
                                          <DocLedgerItem 
                                            name="Language Test" 
                                            url={getDocUrl('english-proficiency', app.english_test_url)} 
                                            onOpen={handleOpenDoc}
                                            onUpload={(file) => handleInlineDocumentUpload(app.id, app.student_id, studentName, 'english-proficiency', file)}
                                          />
                                          <DocLedgerItem 
                                            name="Financial Proof" 
                                            url={getDocUrl('financial', app.financial_proof_url)} 
                                            onOpen={handleOpenDoc}
                                            onUpload={(file) => handleInlineDocumentUpload(app.id, app.student_id, studentName, 'financial', file)}
                                          />
                                          <DocLedgerItem 
                                            name="Stmt. of Purpose" 
                                            url={getDocUrl('additional', app.sop_url)} 
                                            onOpen={handleOpenDoc}
                                            onUpload={(file) => handleInlineDocumentUpload(app.id, app.student_id, studentName, 'additional', file)}
                                          />
                                          <DocLedgerItem 
                                            name="Curriculum Vitae" 
                                            url={getDocUrl('additional', app.cv_url)} 
                                            onOpen={handleOpenDoc} 
                                            onUpload={(file) => handleInlineDocumentUpload(app.id, app.student_id, studentName, 'additional', file)}
                                          />
                                        </>
                                      )
                                    })()}
                                  </div>

                                  <div style={{ background: '#eff6ff', border: '1px dashed #bfdbfe', borderRadius: '8px', padding: '1rem' }}>
                                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a', fontSize: '0.8rem', fontWeight: 700 }}>Visa Application Process</h5>
                                    <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.75rem' }}>
                                      No Visa tracking documents established yet. Initial admission approval required before commencement.
                                    </div>
                                    <button style={{ background: 'white', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                                      + Initialize Visa Tracker
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Application-specific Chat */}
                              <div style={{ marginTop: '2rem', borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                <ApplicationChat 
                                  applicationId={app.id} 
                                  currentUserId={user?.id || ''}
                                  currentUserRole={profile?.role || 'agent'}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>

              {/* Table Footer - Dynamic Pagination */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderTop: '2px solid #1e3a8a' }}>
                <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Items per page: 
                  <select 
                    style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '4px' }}
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#475569' }}>Page {currentPage} of {totalPages} (Total: {totalItems})</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '0.4rem 1rem', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#1e293b', borderRadius: '4px', fontSize: '0.85rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >Previous</button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '0.4rem 1rem', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#1e293b', borderRadius: '4px', fontSize: '0.85rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                    >Next</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Social Media Footer matching mockup */}
      <div style={{ 
        marginTop: '3rem', 
        background: '#ffffff', 
        padding: '1.5rem', 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '2.5rem', 
        alignItems: 'center',
        borderTop: '1px solid #e2e8f0',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
      }}>
        <a href="https://instagram.com/Admission-desk-portal" target="_blank" rel="noopener noreferrer" style={{ color: '#e1306c', transition: 'transform 0.2s' }}>
          <Instagram size={30} />
        </a>
        <a href="https://linkedin.com/in/Admission-desk-portal" target="_blank" rel="noopener noreferrer" style={{ color: '#0077b5', transition: 'transform 0.2s' }}>
          <Linkedin size={30} />
        </a>
        <a href="https://youtube.com/@Admission-desk-portal" target="_blank" rel="noopener noreferrer" style={{ color: '#ff0000', transition: 'transform 0.2s' }}>
          <Youtube size={30} />
        </a>
        <a href="https://tiktok.com/@Admission-desk-portal" target="_blank" rel="noopener noreferrer" style={{ color: '#000000', transition: 'transform 0.2s', display: 'flex', alignItems: 'center' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        </a>
        <a href="https://facebook.com/Admission-desk-portal" target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2', transition: 'transform 0.2s' }}>
          <Facebook size={30} />
        </a>
      </div>
    </div>
  )
}

function DocLedgerItem({ 
  name, url, onOpen, onUpload 
}: { 
  name: string, 
  url: string | null, 
  onOpen: (u: string) => void,
  onUpload?: (file: File) => void
}) {
  const [uploading, setUploading] = useState(false)
  if (!url) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', padding: '6px 8px', background: '#f8fafc', borderRadius: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={12} color="#cbd5e1" /> {name} (Missing)
        </div>
        {onUpload && (
          <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', color: '#3b82f6', fontWeight: 600 }}>
            {uploading ? '...' : '+ Upload'}
            <input type="file" style={{ display: 'none' }} disabled={uploading} onChange={async (e) => {
              if (e.target.files && e.target.files[0]) {
                setUploading(true)
                try {
                  await onUpload(e.target.files[0])
                } finally {
                  setUploading(false)
                }
              }
            }} />
          </label>
        )}
      </div>
    )
  }
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation()
        onOpen(url)
      }}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#0f172a', fontWeight: 500, padding: '6px 8px', background: '#f1f5f9', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
      onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
    >
      <CheckCircle size={12} color="#10b981" /> {name}
    </div>
  )
}

// ----------------------------------------------------
// ExploreHub component with rich interactive accordions
// ----------------------------------------------------
function ExploreHub() {
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    guides_1: true // Open first accordion by default
  });

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="explore-hub">
      <div className="explore-header">
        <div className="explore-title">Applications Hub on Admission Desk Portal</div>
      </div>
      <div className="explore-body">
        <h2 className="explore-h2">What is the Applications Hub?</h2>
        <p className="explore-text">
          The <strong>Applications Hub</strong> is your central workspace for managing every student application across all global institutions — from the first draft to final enrolment.
        </p>
        <p className="explore-text">
          It gives you a complete, real-time view of your recruitment pipeline with smart tools that help you stay organised, take action faster, and close offers efficiently.
        </p>
        <p className="explore-text" style={{ fontWeight: 700, color: '#0f172a' }}>
          With the Admission Desk Portal, partners gain total visibility and control of their pipelines, which helps them prioritise, track, and convert applications more effectively than ever before. Real-time updates, secure document transmission, and immediate communication pathways bridge the gap between agent and university flawlessly.
        </p>

        {/* Video Mock */}
        <div className="explore-video-placeholder">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80" alt="Students studying" />
          <div className="play-btn-mock">
            <Play size={24} fill="white" />
          </div>
        </div>

        <h2 className="explore-h2">1. What You Can Do in the Applications Hub</h2>
        <ul className="explore-list">
          <li><strong>Track Applications in Real Time</strong> — Monitor every application from <em>Draft</em> through to <em>Decision</em> with live status updates and automated alerts directly integrated from our partner university platforms.</li>
          <li><strong>Collaborate with Admissions Teams</strong> — View feedback and comments from the admissions team in real time and respond directly to accelerate application review and decisions. Resolve "Needs More Info" roadblocks instantly.</li>
          <li><strong>Secure Document Management</strong> — Centralized, extremely secure document vaults. Every document uploaded maintains state encryption and strict privacy protocols ensuring compliance with GDPR and international data standards.</li>
          <li><strong>Explore Programmes with Pathfinder</strong> — Search and filter programmes by institution, subject, or country, and launch new applications directly from selected listings knowing exactly what the tuition fees, currency, and intake months are.</li>
          <li><strong>Log Visa Details</strong> — Record each student's visa status, appointment dates, and notes to ensure smooth processing and compliance tracking all the way to border control approvals.</li>
          <li><strong>Analyse Pipeline Performance</strong> — Use the built-in advanced analytics dashboard to track submissions, offers, and conversions — helping you identify opportunities, optimize performance, and scale your active revenue streams efficiently.</li>
        </ul>

        <h2 className="explore-h2">2. Step-by-Step Guides</h2>
        
        {/* Accordion 1 */}
        <div className="explore-accordion">
          <div className="explore-accordion-header" onClick={() => toggleAccordion('guides_1')}>
            Tracking and Managing Applications
            {openAccordions['guides_1'] ? <Minus size={18} color="#64748b" /> : <Plus size={18} color="#64748b" />}
          </div>
          {openAccordions['guides_1'] && (
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
              To efficiently manage your applications, use the real-time search and filter controls located at the top of your dashboard. You can segment by <strong>Draft</strong>, <strong>Submitted</strong>, or <strong>Accepted</strong> statuses. Click on any application row to reveal the expanded overview panel. This provides a unified view of all submitted document requirements, academic intentions, and the most recent admissions logs without navigating away from your main dashboard view. Ensure you address any outstanding generic errors flagged in red!
            </div>
          )}
        </div>

        {/* Accordion 2 */}
        <div className="explore-accordion">
          <div className="explore-accordion-header" onClick={() => toggleAccordion('guides_2')}>
            Configuring the Visa Processing Logic
            {openAccordions['guides_2'] ? <Minus size={18} color="#64748b" /> : <Plus size={18} color="#64748b" />}
          </div>
          {openAccordions['guides_2'] && (
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Once an applicant secures an <strong>Offer</strong> or <strong>Accepted</strong> status, the Visa Processing segment of the application unlocks. It requires uploading verified financial statements, police clearances, and proof of medical exams depending on the geographical deployment of the target university. Utilize the Visa Banner shortcuts up top to quickly navigate to students requiring administrative Visa oversight immediately.
            </div>
          )}
        </div>

        {/* Accordion 3 */}
        <div className="explore-accordion">
          <div className="explore-accordion-header" onClick={() => toggleAccordion('guides_3')}>
            Submitting High-Quality Documentation
            {openAccordions['guides_3'] ? <Minus size={18} color="#64748b" /> : <Plus size={18} color="#64748b" />}
          </div>
          {openAccordions['guides_3'] && (
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Ensuring the documents you submit are correctly formatted minimizes friction internally. 
              <br/><br/>
              - Always upload documents in <strong>PDF</strong> or high-fidelity <strong>JPEG/PNG</strong> format.<br/>
              - Our system automatically allows you to crop and orient documents. Please ensure no edges of passports or academic transcripts are clipped.<br/>
              - Check the <em>Requirements Checker</em> prior to submission.
            </div>
          )}
        </div>

        {/* Accordion 4 */}
        <div className="explore-accordion">
          <div className="explore-accordion-header" onClick={() => toggleAccordion('guides_4')}>
            Analysing Application Performance Metrics
            {openAccordions['guides_4'] ? <Minus size={18} color="#64748b" /> : <Plus size={18} color="#64748b" />}
          </div>
          {openAccordions['guides_4'] && (
            <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
              By reviewing the four primary KPI widgets located globally at the top of your agent portal, you dynamically stay in tune with your business. For deep granular breakdowns by country, target university, and quarterly growth scales—please access the "Analytics" tab on your primary left-hand sidebar navigation.
            </div>
          )}
        </div>

        <h2 className="explore-h2">3. Frequently Asked Questions</h2>
        <div className="explore-faq">
          <strong>Q: What happens if an application is marked as "Application not complete"?</strong>
          <span style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>A: The application usually requires additional fields, such as passport parameters or financial proof. Check the expanded view of that target application to exactly define what element is missing. Applications in this specific tier cannot be processed by admissions officers until fully complete.</span>
        </div>
        <div className="explore-faq">
          <strong>Q: What is the Admission Desk Portal?</strong>
          <span style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>A: It's your advanced all-in-one workspace built entirely dynamically to create, track, and manage every global student application across all of our partner institutions seamlessly — from draft stages up to enrolment operations.</span>
        </div>
        <div className="explore-faq">
          <strong>Q: Can I track the status in absolute real-time without refreshing?</strong>
          <span style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>A: Yes. The dashboard leverages live Postgres Subscriptions and WebSockets. As soon as a university representative updates the server status, your entire UI and metrics will flash and synchronize locally!</span>
        </div>
        <div className="explore-faq">
          <strong>Q: Can I communicate with the admissions team effectively?</strong>
          <span style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.5' }}>A: Yes. You can view administrative notes and respond directly via specific support tickets connected to any given student application to aggressively accelerate and secure the processing timeline securely.</span>
        </div>

        <h2 className="explore-h2">4. Helpful Best-Practice Guidelines</h2>
        <ul className="explore-list">
          <li>Review admissions feedback daily and act promptly. Immediate responses natively advance your internal agency trust ranking algorithms!</li>
          <li>Ensure financial capacity certificates accurately reflect the student's designated sponsorship. Financial validation is responsible for 64% of generic application denials.</li>
          <li>Review broad metrics via Analytics weekly to identify which partner universities provide maximum commission value compared to regional processing efforts.</li>
          <li>Encourage prospective students to upload original digitized copies of documents utilizing our built-in high-fidelity image cropping tool.</li>
          <li>Pre-verify all visa details proactively to maintain stringent compliance controls.</li>
        </ul>
      </div>
    </div>
  )
}

function getOrdinalNum(n: number) {
  return n + (n > 0 ? ['th', 'st', 'nd', 'rd'][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10] : '')
}

function getInitials(name: string) {
  if (!name) return 'UN'
  if (name.includes('Berlin School')) return 'BSBI'
  if (name.includes('Toronto')) return 'TSoM'
  const parts = name.split(' ')
  if (parts.length > 1) return parts.map(p => p[0]).join('').substring(0, 3).toUpperCase()
  return name.substring(0, 3).toUpperCase()
}
