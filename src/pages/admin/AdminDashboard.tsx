import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, FileText, Bell, GraduationCap, CheckCircle2, XCircle, Clock, BarChart3, Plus, Pencil, Trash2, Eye, AlertCircle, X, Shield, BookOpen, UserCheck, Calendar, Newspaper, BookMarked, Image, Package, ArrowUpRight, UserPlus, ShieldCheck, ToggleLeft, ToggleRight, Mail, UserCog, ChevronDown, Search, Filter, LifeBuoy, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { usePageRefetch } from '../../lib/useRealtimeRecovery'
import { uploadNewsImage, uploadBlogFeaturedImage, uploadAnnImage } from '../../lib/storageHelpers'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import AdminHeader from '../../components/layout/AdminHeader'
import AdminFooter from '../../components/layout/AdminFooter'
import AdminProfileDropdown from '../../components/layout/AdminProfileDropdown'
import SupportAdminDashboard from './support/SupportAdminDashboard'
import '../dashboard/DashboardPages.css'

const generateUniSlug = (name: string, country: string) => {
  const base = `${name}-${country}`.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  return `${base}-${Math.floor(Math.random() * 1000)}`
}

const generateProgSlug = (name: string, level: string) => {
  const base = `${name}-${level}`.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
  return `${base}-${Math.floor(Math.random() * 10000)}`
}

type Tab = 'overview' | 'agents' | 'programs' | 'applications' | 'announcements' | 'universities' | 'students' | 'events' | 'news' | 'blog' | 'activations' | 'pending_approvals' | 'admin_users' | 'support'

const KYC_COLORS: Record<string, string> = {
  pending: '#f59e0b', under_review: '#3b82f6', approved: '#10b981', rejected: '#ef4444'
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { isSuperAdmin, user, profile } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [agents, setAgents] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [universities, setUniversities] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [stats, setStats] = useState({ agents: 0, apps: 0, pending_kyc: 0, approved_agents: 0, programs: 0, universities: 0, students: 0 })
  const [loading, setLoading] = useState(false)
  const [showAnnForm, setShowAnnForm] = useState(false)
  const [editingAnn, setEditingAnn] = useState<any>(null)
  const [annForm, setAnnForm] = useState({ title: '', content: '', is_important: false, social_link: '' })
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [uniSearch, setUniSearch] = useState('')
  const [uniFilters, setUniFilters] = useState({ country: 'all', status: 'all', minRanking: '', maxRanking: '' })
  const [uniSortBy, setUniSortBy] = useState('name-asc')
  const [isUniFilterOpen, setIsUniFilterOpen] = useState(false)
  const [annImageFile, setAnnImageFile] = useState<File | null>(null)

  // Events
  const [eventsList, setEventsList] = useState<any[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<any>(null)
  const [eventForm, setEventForm] = useState({ title: '', description: '', event_type: 'webinar', event_date: '', end_date: '', location: '', is_online: true, meeting_link: '', max_attendees: '' })

  // News
  const [newsList, setNewsList] = useState<any[]>([])
  const [showNewsForm, setShowNewsForm] = useState(false)
  const [editingNews, setEditingNews] = useState<any>(null)
  const [newsForm, setNewsForm] = useState({ title: '', content: '', category: '' })
  const [newsImageFile, setNewsImageFile] = useState<File | null>(null)

  // Blog
  const [blogList, setBlogList] = useState<any[]>([])
  const [showBlogForm, setShowBlogForm] = useState(false)
  const [editingBlog, setEditingBlog] = useState<any>(null)
  const [blogForm, setBlogForm] = useState({ title: '', slug: '', content: '', excerpt: '', category: '', tags: '' })
  const [blogImageFile, setBlogImageFile] = useState<File | null>(null)

  // Partner Activation Requests
  const [activationRequests, setActivationRequests] = useState<any[]>([])

  // Pending Submissions (Super Admin Approvals)
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([])

  // Admin User Management
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminInvites, setAdminInvites] = useState<any[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', first_name: '', last_name: '', role: 'admission_manager' })
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

  // User Role Attribution State
  const [searchEmail, setSearchEmail] = useState('')
  const [searchedUser, setSearchedUser] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState('admission_manager')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [agentRes, appRes, annRes, uniRes, progRes, studentRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email, kyc_status, agency_name, country, created_at').eq('role', 'agent').order('created_at', { ascending: false }),
      supabase.from('applications').select('id, status, created_at, profiles!agent_id(first_name, last_name, agency_name), universities(name), programs(name)').order('created_at', { ascending: false }).limit(50),
      supabase.from('announcements').select('*').order('published_at', { ascending: false }),
      supabase.from('universities').select('id, name, country, city, logo_url, is_active, ranking, established, is_multisite, university_campuses(*)').order('name'),
      supabase.from('programs').select('id, name, level, category, tuition_fee, currency, is_active, university_id, universities(name, country)').order('created_at', { ascending: false }).limit(100),
      supabase.from('students').select('id, first_name, last_name, email, nationality, created_at').order('created_at', { ascending: false }).limit(50)
    ])
    const agentList = agentRes.data || []
    const progList = progRes.data || []
    const uniList = uniRes.data || []
    const studentList = studentRes.data || []
    setAgents(agentList)
    setApplications(appRes.data || [])
    setAnnouncements(annRes.data || [])
    setUniversities(uniList)
    setPrograms(progList)
    setStudents(studentList)
    setStats({
      agents: agentList.length,
      apps: (appRes.data || []).length,
      pending_kyc: agentList.filter((a: any) => a.kyc_status === 'pending' || a.kyc_status === 'under_review').length,
      approved_agents: agentList.filter((a: any) => a.kyc_status === 'approved').length,
      programs: progList.length,
      universities: uniList.length,
      students: studentList.length
    })
    setLoading(false)
  }, [])

  const fetchNewData = useCallback(async () => {
    const [evRes, newsRes, blogRes, actRes, psRes] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: false }),
      supabase.from('news_posts').select('*').order('published_at', { ascending: false }),
      supabase.from('blog_posts').select('*').order('published_at', { ascending: false }),
      supabase.from('partner_activation_requests').select('*, profiles!agent_id(first_name, last_name, email, agency_name), universities!university_id(name, country, logo_url)').order('created_at', { ascending: false }),
      supabase.from('pending_submissions').select('*, profiles:submitted_by(first_name, last_name, email)').order('created_at', { ascending: false })
    ])
    setEventsList(evRes.data || [])
    setNewsList(newsRes.data || [])
    setBlogList(blogRes.data || [])
    setActivationRequests(actRes.data || [])
    setPendingSubmissions(psRes.data || [])
  }, [])

  const fetchAdminUsers = useCallback(async () => {
    const [usersRes, invitesRes] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, email, role, is_super_admin, is_active, is_technical_team, approved_by, approved_at, created_at').in('role', ['admin', 'admission_manager', 'program_manager', 'technical_team']).order('created_at', { ascending: false }),
      supabase.from('admin_user_invites').select('*, profiles:invited_by(first_name, last_name, email)').order('created_at', { ascending: false }),
    ])
    setAdminUsers(usersRes.data || [])
    setAdminInvites(invitesRes.data || [])
  }, [])

  useEffect(() => { 
    fetchAll()
    fetchNewData()
    if (isSuperAdmin) fetchAdminUsers()

    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchAll(); if (isSuperAdmin) fetchAdminUsers(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'universities' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programs' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_kyc' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchNewData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news_posts' }, fetchNewData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, fetchNewData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_activation_requests' }, fetchNewData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pending_submissions' }, fetchNewData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_user_invites' }, fetchAdminUsers)
      .subscribe((status) => {
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          console.warn('[AdminDashboard] channel error:', status)
        }
      })

    // Re-sync on visibility change (tab focus return)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAll()
        fetchNewData()
        if (isSuperAdmin) fetchAdminUsers()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchAll, fetchNewData, fetchAdminUsers, isSuperAdmin])


  const updateKyc = async (agentId: string, status: string, notes?: string) => {
    const { error } = await supabase.from('profiles').update({ kyc_status: status as any }).eq('id', agentId)
    if (error) { toast.error('Failed to update KYC status'); return }
    if (status !== 'pending') {
      await supabase.from('agent_kyc').update({ status: status as any, admin_notes: notes || null }).eq('agent_id', agentId)
    }
    toast.success(`Agent KYC status updated to: ${status}`)
    fetchAll()
  }

  const saveAnnouncement = async () => {
    if (!annForm.title || !annForm.content) { toast.error('Title and content required'); return }
    const userId = (await supabase.auth.getUser()).data.user?.id
    let featured_image_url = editingAnn?.featured_image_url || null
    if (annImageFile) {
      const id = editingAnn?.id || crypto.randomUUID()
      featured_image_url = await uploadAnnImage(id, annImageFile)
    }
    const payload = { ...annForm, published_at: new Date().toISOString(), created_by: userId, featured_image_url }
    if (editingAnn) {
      const { error } = await supabase.from('announcements').update(payload).eq('id', editingAnn.id)
      if (error) { toast.error('Failed to update'); return }
      toast.success('Announcement updated')
    } else {
      const { error } = await supabase.from('announcements').insert(payload)
      if (error) { toast.error('Failed to create'); return }
      toast.success('Announcement created')
    }
    setShowAnnForm(false); setEditingAnn(null); setAnnImageFile(null)
    setAnnForm({ title: '', content: '', is_important: false, social_link: '' })
    fetchAll()
  }

  const deleteAnn = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', id)
    toast.success('Deleted')
    fetchAll()
  }

  const getStatusBadge = (status: string, colors: Record<string, string>) => {
    const color = colors[status] || '#94a3b8'
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    return <span style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>{label}</span>
  }

  const AppStatusColors: Record<string, string> = {
    draft: '#94a3b8', submitted: '#3b82f6', under_review: '#f59e0b',
    offer: '#10b981', accepted: '#059669', rejected: '#ef4444', enrolled: '#8b5cf6'
  }

  // ─── Event CRUD ───
  const saveEvent = async () => {
    if (!eventForm.title || !eventForm.event_date) { toast.error('Title and event date required'); return }
    const payload = { ...eventForm, max_attendees: eventForm.max_attendees ? Number(eventForm.max_attendees) : null, created_by: (await supabase.auth.getUser()).data.user?.id }
    if (editingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id)
      if (error) { toast.error('Failed to update event'); return }
      toast.success('Event updated')
    } else {
      const { error } = await supabase.from('events').insert(payload)
      if (error) { toast.error('Failed to create event'); return }
      toast.success('Event created')
    }
    setShowEventForm(false); setEditingEvent(null)
    setEventForm({ title: '', description: '', event_type: 'webinar', event_date: '', end_date: '', location: '', is_online: true, meeting_link: '', max_attendees: '' })
    fetchNewData()
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return
    await supabase.from('events').delete().eq('id', id)
    toast.success('Event deleted'); fetchNewData()
  }

  // ─── News CRUD ───
  const saveNews = async () => {
    if (!newsForm.title) { toast.error('Title required'); return }
    const userId = (await supabase.auth.getUser()).data.user?.id
    let image_url = editingNews?.image_url || null
    if (newsImageFile) {
      const id = editingNews?.id || crypto.randomUUID()
      image_url = await uploadNewsImage(id, newsImageFile)
    }
    const payload = { ...newsForm, image_url, published_at: new Date().toISOString(), created_by: userId }
    if (editingNews) {
      const { error } = await supabase.from('news_posts').update(payload).eq('id', editingNews.id)
      if (error) { toast.error('Failed to update'); return }
      toast.success('News updated')
    } else {
      const { error } = await supabase.from('news_posts').insert(payload)
      if (error) { toast.error('Failed to create'); return }
      toast.success('News post created')
    }
    setShowNewsForm(false); setEditingNews(null); setNewsImageFile(null)
    setNewsForm({ title: '', content: '', category: '' })
    fetchNewData()
  }

  const deleteNews = async (id: string) => {
    if (!confirm('Delete this news post?')) return
    await supabase.from('news_posts').delete().eq('id', id)
    toast.success('Deleted'); fetchNewData()
  }

  // ─── Blog CRUD ───
  const saveBlog = async () => {
    if (!blogForm.title) { toast.error('Title required'); return }
    const userId = (await supabase.auth.getUser()).data.user?.id
    let featured_image_url = editingBlog?.featured_image_url || null
    if (blogImageFile) {
      const id = editingBlog?.id || crypto.randomUUID()
      featured_image_url = await uploadBlogFeaturedImage(id, blogImageFile)
    }
    const slug = blogForm.slug || blogForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const tags = blogForm.tags ? blogForm.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    const payload = { ...blogForm, slug, tags, featured_image_url, published_at: new Date().toISOString(), created_by: userId }
    if (editingBlog) {
      const { error } = await supabase.from('blog_posts').update(payload).eq('id', editingBlog.id)
      if (error) { toast.error('Failed to update'); return }
      toast.success('Blog post updated')
    } else {
      const { error } = await supabase.from('blog_posts').insert(payload)
      if (error) { toast.error('Failed to create'); return }
      toast.success('Blog post created')
    }
    setShowBlogForm(false); setEditingBlog(null); setBlogImageFile(null)
    setBlogForm({ title: '', slug: '', content: '', excerpt: '', category: '', tags: '' })
    fetchNewData()
  }

  const deleteBlog = async (id: string) => {
    if (!confirm('Delete this blog post?')) return
    await supabase.from('blog_posts').delete().eq('id', id)
    toast.success('Deleted'); fetchNewData()
  }

  const deleteProgram = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return
    const { error } = await supabase.from('programs').delete().eq('id', id)
    if (error) { toast.error('Failed to delete program'); return }
    toast.success('Program deleted')
    fetchAll()
  }

  const deleteUniversity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this university? This might fail if there are programs attached to it.')) return
    const { error } = await supabase.from('universities').delete().eq('id', id)
    if (error) { toast.error('Failed to delete university. Ensure no programs are attached.'); return }
    toast.success('University deleted')
    fetchAll()
  }

  const pendingActivations = activationRequests.filter(a => a.status === 'pending').length
  const pendingInvites = adminInvites.filter(i => i.status === 'pending').length

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Full Admin',
    admission_manager: 'Admission Manager',
    program_manager: 'Program Manager',
    technical_team: 'Technical Team',
    agent: 'Agent',
  }

  // ─── Admin User Invite ───
  const sendAdminInvite = async () => {
    if (!inviteForm.email) { toast.error('Email is required'); return }
    const normalizedEmail = inviteForm.email.trim().toLowerCase()
    setInviteSubmitting(true)
    const userId = (await supabase.auth.getUser()).data.user?.id
    // Check if user already exists with an admin role
    const { data: existing } = await supabase.from('profiles').select('id, role').eq('email', normalizedEmail).maybeSingle()
    if (existing && ['admin', 'admission_manager', 'program_manager', 'technical_team'].includes(existing.role)) {
      toast.error(`A user with this email already exists as ${ROLE_LABELS[existing.role] || existing.role}`)
      setInviteSubmitting(false)
      return
    }
    // If user exists as agent, auto-assign the role immediately
    if (existing && existing.role === 'agent') {
      const isTech = inviteForm.role === 'technical_team'
      const { error: roleErr } = await supabase.from('profiles').update({
        role: inviteForm.role as any,
        is_active: true,
        is_technical_team: isTech,
        approved_by: userId,
        approved_at: new Date().toISOString(),
      }).eq('id', existing.id)
      setInviteSubmitting(false)
      if (roleErr) { toast.error('Failed to assign role: ' + roleErr.message); return }
      // Also create an invite record for history
      await supabase.from('admin_user_invites').insert({
        email: normalizedEmail,
        first_name: inviteForm.first_name || null,
        last_name: inviteForm.last_name || null,
        role: inviteForm.role,
        invited_by: userId!,
        status: 'registered',
      })
      toast.success(`${normalizedEmail} has been assigned as ${ROLE_LABELS[inviteForm.role]}! They can now access their dashboard.`)
      setInviteForm({ email: '', first_name: '', last_name: '', role: 'admission_manager' })
      setShowInviteForm(false)
      fetchAdminUsers()
      return
    }
    // Check for existing invite
    const { data: existingInvite } = await supabase.from('admin_user_invites').select('id, status').eq('email', normalizedEmail).maybeSingle()
    if (existingInvite) {
      toast.error(`An invite for this email already exists (${existingInvite.status})`)
      setInviteSubmitting(false)
      return
    }
    const { error } = await supabase.from('admin_user_invites').insert({
      email: normalizedEmail,
      first_name: inviteForm.first_name || null,
      last_name: inviteForm.last_name || null,
      role: inviteForm.role,
      invited_by: userId!,
      status: 'approved', // Super admin auto-approves
    })
    setInviteSubmitting(false)
    if (error) { toast.error('Failed to create invite: ' + error.message); return }
    toast.success(`Invite for ${normalizedEmail} created! They can now register via /admin/login and will be auto-assigned as ${ROLE_LABELS[inviteForm.role]}.`)
    setInviteForm({ email: '', first_name: '', last_name: '', role: 'admission_manager' })
    setShowInviteForm(false)
    fetchAdminUsers()
  }

  const updateInviteStatus = async (inviteId: string, status: 'approved' | 'rejected', notes?: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('admin_user_invites').update({
      status, approved_by: userId, approved_at: new Date().toISOString(), admin_notes: notes || null
    }).eq('id', inviteId)
    if (error) { toast.error('Failed to update invite'); return }
    toast.success(`Invite ${status}`)
    fetchAdminUsers()
  }

  const toggleAdminUserActive = async (userId: string, currentActive: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: !currentActive }).eq('id', userId)
    if (error) { toast.error('Failed to update status'); return }
    toast.success(!currentActive ? 'User activated' : 'User deactivated')
    fetchAdminUsers()
  }

  const changeAdminUserRole = async (userId: string, newRole: 'admin' | 'admission_manager' | 'program_manager' | 'technical_team' | 'agent') => {
    const isTech = newRole === 'technical_team';
    const updatePayload: any = { role: newRole, is_technical_team: isTech }
    // When revoking to agent, also clear technical team flag
    if (newRole === 'agent') {
      updatePayload.is_technical_team = false
    }
    const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId)
    if (error) {
      console.error('[AdminDashboard] Failed to change role:', error)
      toast.error('Failed to update role: ' + (error.message || 'Unknown error'))
      return
    }
    toast.success(`Role changed to ${ROLE_LABELS[newRole] || newRole}`)
    fetchAdminUsers()
  }

  const handleSearchUser = async () => {
    if (!searchEmail) { toast.error('Enter an email address to search'); return; }
    setSearching(true);
    setSearchedUser(null);
    const { data, error } = await supabase.from('profiles').select('id, email, first_name, last_name, role, is_active, is_technical_team, avatar_url').eq('email', searchEmail.trim().toLowerCase()).maybeSingle();
    setSearching(false);
    if (error) { toast.error('Error finding user: ' + error.message); return; }
    if (data) {
      setSearchedUser(data);
      setSelectedRole(data.role && ['admin', 'admission_manager', 'program_manager', 'technical_team'].includes(data.role) ? data.role : 'admission_manager');
    } else {
      toast.error('No user found with this email. You can invite them instead.');
    }
  }

  const handleAssignRole = async () => {
    if (!searchedUser) return;
    const isTech = selectedRole === 'technical_team';
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const updatePayload: any = {
      role: selectedRole as any,
      is_technical_team: isTech,
      is_active: true,
    }
    // When revoking to agent, clear admin-specific flags
    if (selectedRole === 'agent') {
      updatePayload.is_technical_team = false
    } else {
      // For admin roles, set approval info
      updatePayload.approved_by = adminId
      updatePayload.approved_at = new Date().toISOString()
    }
    const { error, data } = await supabase.from('profiles').update(updatePayload).eq('id', searchedUser.id).select();
    if (error) {
      console.error('[AdminDashboard] Failed to assign role:', error)
      toast.error('Failed to assign role: ' + (error.message || 'Check RLS policies in Supabase'))
      return;
    }
    if (!data || data.length === 0) {
      toast.error('Role assignment returned no data. Check Supabase RLS policies — the profiles table may restrict UPDATE for admin users.')
      return;
    }
    toast.success(`User role successfully attributed to ${ROLE_LABELS[selectedRole] || selectedRole}!`);
    setSearchedUser({...searchedUser, role: selectedRole, is_technical_team: isTech});
    fetchAdminUsers();
  }

  const approveAdmissionManager = async (userId: string) => {
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('profiles').update({
      is_active: true, approved_by: adminId, approved_at: new Date().toISOString(), kyc_status: 'approved' as any
    }).eq('id', userId)
    if (error) { toast.error('Failed to approve user'); return }
    toast.success('Admission Manager approved and activated!')
    fetchAdminUsers()
  }

  const deleteInvite = async (inviteId: string) => {
    if (!confirm('Delete this invite?')) return
    await supabase.from('admin_user_invites').delete().eq('id', inviteId)
    toast.success('Invite deleted')
    fetchAdminUsers()
  }

  const handleActivationAction = async (requestId: string, action: 'approved' | 'rejected', agentId?: string, universityId?: string) => {
    const adminId = (await supabase.auth.getUser()).data.user?.id
    const { error } = await supabase.from('partner_activation_requests').update({
      status: action,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId)
    if (error) { toast.error(`Failed to ${action} request`); return }

    // On approval, add partner selection
    if (action === 'approved' && agentId && universityId) {
      const { error: partnerError } = await supabase.from('agent_partner_selections').insert({
        agent_id: agentId,
        university_id: universityId,
      })
      if (partnerError && !partnerError.message?.includes('duplicate')) {
        console.error('Failed to add partner selection:', partnerError)
      }
    }

    toast.success(`Request ${action} successfully`)
    fetchNewData()
    fetchAll()
  }

  const TABS: [Tab, string, any][] = [
    ['overview', 'Overview', <BarChart3 size={15} />],
    ['agents', `Agents (${stats.agents})`, <Users size={15} />],
    ['programs', `Programs (${stats.programs})`, <BookOpen size={15} />],
    ['students', `Students (${stats.students})`, <UserCheck size={15} />],
    ['applications', `Applications (${stats.apps})`, <FileText size={15} />],
    ['activations', `Activations${pendingActivations > 0 ? ` (${pendingActivations})` : ''}`, <Shield size={15} />],
    ['announcements', 'Announcements', <Bell size={15} />],
    ['universities', `Universities (${stats.universities})`, <GraduationCap size={15} />],
    ['events', `Events (${eventsList.length})`, <Calendar size={15} />],
    ['news', `News (${newsList.length})`, <Newspaper size={15} />],
    ['blog', `Blog (${blogList.length})`, <BookMarked size={15} />],
    ...(isSuperAdmin ? [
      ['admin_users', `Admin Users${pendingInvites > 0 ? ` (${pendingInvites})` : ''}`, <UserCog size={15} />] as [Tab, string, any],
      ['pending_approvals', `Approvals (${pendingSubmissions.filter(s => s.status === 'pending').length})`, <Package size={15} />] as [Tab, string, any],
    ] : []),
    ...(profile?.role === 'admin' || profile?.is_technical_team || profile?.role === 'technical_team' ? [
      ['support', 'Support Desk', <LifeBuoy size={15} />] as [Tab, string, any],
    ] : []),
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <AdminHeader />

      <main className="dashboard-page" style={{ flex: 1, padding: '2rem 2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Manage agents, programs, universities, students, applications, and announcements.</p>
        </div>

      {/* Tab Navigation */}
      <div className="admin-tabs-container">
        {TABS.map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`admin-tab-btn ${tab === key ? 'active' : ''}`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div>
          <div className="admin-stats-grid">
            {[
              { icon: <Users size={18} />, value: stats.agents, label: 'Agents', color: '#3A4391', bg: '#eff6ff' },
              { icon: <Clock size={18} />, value: stats.pending_kyc, label: 'KYC Pending', color: '#f59e0b', bg: '#fffbeb' },
              { icon: <BookOpen size={18} />, value: stats.programs, label: 'Programs', color: '#10b981', bg: '#f0fdf4' },
              { icon: <FileText size={18} />, value: stats.apps, label: 'Applications', color: '#8b5cf6', bg: '#f5f3ff' },
            ].map((s, i) => (
              <div key={i} className="card-panel" style={{ 
                padding: '0.65rem 1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem',
                borderLeft: `4px solid ${s.color}`,
                height: 'fit-content'
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  backgroundColor: s.bg, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: s.color,
                  flexShrink: 0 
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="admin-quick-actions">
            <button onClick={() => navigate('/admin/programs')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={16} /> Program Management</button>
            <button onClick={() => navigate('/admin/admissions')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={16} /> Admission Management</button>
            <button onClick={() => navigate('/admin/students')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UserCheck size={16} /> Manage Students</button>
            <button onClick={() => navigate('/admin/agents')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} /> Manage Agents</button>
          </div>

          {/* Pending KYC Quick View */}
          {agents.filter(a => a.kyc_status === 'pending' || a.kyc_status === 'under_review').length > 0 && (
            <div className="card-panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                <AlertCircle size={18} style={{ color: '#f59e0b' }} />
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Agents Awaiting KYC Review</h2>
              </div>
              {agents.filter(a => a.kyc_status === 'pending' || a.kyc_status === 'under_review').slice(0, 5).map(agent => (
                <div key={agent.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 0', borderBottom: '1px solid #f8fafc' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{agent.first_name} {agent.last_name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>— {agent.agency_name}</span></div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{agent.email} • {agent.country}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => updateKyc(agent.id, 'under_review')} style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid #3b82f6', background: '#eff6ff', color: '#3b82f6', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Review</button>
                    <button onClick={() => updateKyc(agent.id, 'approved')} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: '#10b981', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> Approve</button>
                    <button onClick={() => updateKyc(agent.id, 'rejected')} style={{ padding: '5px 12px', borderRadius: '7px', border: 'none', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Reject</button>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/admin/agents')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>View all agents →</button>
            </div>
          )}
        </div>
      )}

      {/* Agents Tab */}
      {tab === 'agents' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>All Registered Agents</h2>
            <button onClick={() => navigate('/admin/agents')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Shield size={16} /> Full Agent Management
            </button>
          </div>
          <div className="card-panel" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th><th>Agency</th><th>Country</th><th>KYC Status</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading...</td></tr>
                  ) : agents.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No agents registered yet.</td></tr>
                  ) : agents.map(agent => (
                    <tr key={agent.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{agent.first_name} {agent.last_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{agent.email}</div>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: '#475569' }}>{agent.agency_name || '—'}</td>
                      <td style={{ fontSize: '0.875rem', color: '#475569' }}>{agent.country || '—'}</td>
                      <td>{getStatusBadge(agent.kyc_status || 'pending', KYC_COLORS)}</td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(agent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {agent.kyc_status !== 'approved' && (
                            <button onClick={() => updateKyc(agent.id, 'approved')} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#10b981', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={11} /> Approve</button>
                          )}
                          {agent.kyc_status !== 'rejected' && (
                            <button onClick={() => updateKyc(agent.id, 'rejected')} style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}><XCircle size={11} /> Reject</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Programs Tab */}
      {tab === 'programs' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>All Programs ({programs.length})</h2>
            <button onClick={() => navigate('/admin/programs/new')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Plus size={16} /> Add Program
            </button>
          </div>
          <div className="card-panel" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Program</th><th>University</th><th>Level</th><th>Category</th><th>Tuition</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading...</td></tr>
                  ) : programs.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No programs yet. Add the first one!</td></tr>
                  ) : programs.map(prog => (
                    <tr key={prog.id}>
                      <td><div style={{ fontWeight: 600, color: '#1e293b', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prog.name}</div></td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>{(prog.universities as any)?.name || '—'}</td>
                      <td><span style={{ background: '#f5f3ff', color: '#8b5cf6', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>{prog.level?.charAt(0).toUpperCase() + prog.level?.slice(1)}</span></td>
                      <td style={{ fontSize: '0.85rem', color: '#64748b' }}>{prog.category || '—'}</td>
                      <td style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{prog.tuition_fee ? `${prog.currency} ${Number(prog.tuition_fee).toLocaleString()}` : '—'}</td>
                      <td>
                        <span style={{ background: prog.is_active ? '#f0fdf4' : '#fef2f2', color: prog.is_active ? '#10b981' : '#ef4444', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
                          {prog.is_active ? '✓ Active' : '✗ Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => navigate(`/admin/programs/edit/${prog.id}`)} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b' }}><Pencil size={14} /></button>
                          <button onClick={() => deleteProgram(prog.id)} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {tab === 'students' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>All Students ({students.length})</h2>
            <button onClick={() => navigate('/admin/students')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <UserCheck size={16} /> Full Student Management
            </button>
          </div>
          <div className="card-panel" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr><th>Student</th><th>Email</th><th>Nationality</th><th>Registered</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading...</td></tr>
                  ) : students.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No students registered yet.</td></tr>
                  ) : students.map(student => (
                    <tr key={student.id}>
                      <td><div style={{ fontWeight: 600, color: '#1e293b' }}>{student.first_name} {student.last_name}</div></td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>{student.email}</td>
                      <td style={{ fontSize: '0.85rem', color: '#475569' }}>{student.nationality || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Applications Tab */}
      {tab === 'applications' && (
        <div className="card-panel" style={{ padding: 0 }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>All Applications</h2>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr><th>Agent</th><th>University</th><th>Programme</th><th>Status</th><th>Submitted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading...</td></tr>
                ) : applications.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No applications yet.</td></tr>
                ) : applications.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{(app.profiles as any)?.first_name} {(app.profiles as any)?.last_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{(app.profiles as any)?.agency_name}</div>
                    </td>
                    <td style={{ fontSize: '0.875rem', color: '#475569' }}>{app.universities?.name || '—'}</td>
                    <td style={{ fontSize: '0.875rem', color: '#475569', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.programs?.name || '—'}</td>
                    <td>{getStatusBadge(app.status, AppStatusColors)}</td>
                    <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(app.created_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => navigate(`/admin/applications/${app.id}`)}
                          style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid #3A4391', background: '#eff6ff', color: '#3A4391', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                        >
                          <Eye size={10} /> Review
                        </button>
                        {['submitted', 'under_review', 'offer_received', 'accepted', 'rejected'].filter(s => s !== app.status).slice(0, 2).map(newStatus => (
                          <button
                            key={newStatus}
                            onClick={async () => {
                              const { error } = await supabase.from('applications').update({ status: newStatus as any }).eq('id', app.id)
                              if (!error) { toast.success(`Status → ${newStatus}`); fetchAll() }
                              else toast.error('Failed to update')
                            }}
                            style={{ padding: '3px 8px', borderRadius: '6px', border: `1px solid ${AppStatusColors[newStatus]}40`, background: `${AppStatusColors[newStatus]}12`, color: AppStatusColors[newStatus], fontSize: '10px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {newStatus.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Support Tab */}
      {tab === 'support' && (
        <div style={{ width: '100%' }}>
          <SupportAdminDashboard />
        </div>
      )}

      {/* Announcements Tab */}
      {tab === 'announcements' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Manage Announcements</h2>
            <button
              onClick={() => { setShowAnnForm(true); setEditingAnn(null); setAnnForm({ title: '', content: '', is_important: false, social_link: '' }); setAnnImageFile(null) }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}
            >
              <Plus size={16} /> New Announcement
            </button>
          </div>

          {showAnnForm && (
            <div className="card-panel" style={{ marginBottom: '1.5rem', border: '2px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1e293b', margin: 0 }}>{editingAnn ? 'Edit' : 'New'} Announcement</h3>
                <button onClick={() => setShowAnnForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Title <span className="required">*</span></label>
                <input className="form-input" value={annForm.title} onChange={e => setAnnForm(p => ({...p, title: e.target.value}))} placeholder="Announcement title..." />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Content <span className="required">*</span></label>
                <textarea className="form-input" rows={5} value={annForm.content} onChange={e => setAnnForm(p => ({...p, content: e.target.value}))} placeholder="Announcement body text..." />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Featured Image <span className="required">*(Optional)</span></label>
                  <input type="file" accept="image/*" onChange={e => setAnnImageFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem', width: '100%' }} />
                  {editingAnn?.featured_image_url && !annImageFile && <img src={editingAnn.featured_image_url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />}
                </div>
                <div>
                  <label className="form-label">Social/External Link <span className="required">*(Redirect users)</span></label>
                  <input className="form-input" value={annForm.social_link || ''} onChange={e => setAnnForm(p => ({...p, social_link: e.target.value}))} placeholder="https://instagram.com/..." />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '1.25rem' }}>
                <input type="checkbox" checked={annForm.is_important} onChange={e => setAnnForm(p => ({...p, is_important: e.target.checked}))} style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }} />
                Mark as Important
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAnnForm(false)} className="btn btn-outline">Cancel</button>
                <button onClick={saveAnnouncement} className="btn btn-primary">{editingAnn ? 'Update' : 'Publish'} Announcement</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {announcements.length === 0 ? (
              <div className="card-panel" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No announcements yet. Create the first one!</div>
            ) : announcements.map(ann => (
              <div key={ann.id} style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', border: `1px solid ${ann.is_important ? '#fde68a' : '#f1f5f9'}`, borderLeft: `3px solid ${ann.is_important ? '#f59e0b' : '#e2e8f0'}`, boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {ann.is_important && <span style={{ background: '#fffbeb', color: '#f59e0b', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', border: '1px solid #fde68a' }}>⚠️ Important</span>}
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{ann.title}</h3>
                    </div>
                    {ann.featured_image_url && <div style={{ height: '140px', width: '100%', maxWidth: '300px', backgroundImage: `url(${ann.featured_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px', marginBottom: '10px' }} />}
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 8px', lineHeight: 1.6 }}>{ann.content}</p>
                    {ann.social_link && <p style={{ fontSize: '0.75rem', color: '#3b82f6', marginBottom: '6px' }}><a href={ann.social_link} target="_blank" rel="noreferrer">{ann.social_link}</a></p>}
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{new Date(ann.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => { setEditingAnn(ann); setAnnForm({ title: ann.title, content: ann.content, is_important: ann.is_important, social_link: ann.social_link || '' }); setShowAnnForm(true); setAnnImageFile(null) }} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b' }}><Pencil size={14} /></button>
                    <button onClick={() => deleteAnn(ann.id)} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Universities Tab */}
      {tab === 'universities' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Partner Universities ({universities.length})</h2>
              <div className="search-box" style={{ width: '250px' }}>
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={uniSearch}
                  onChange={e => setUniSearch(e.target.value)}
                />
                {uniSearch && <X size={14} className="clear-btn" onClick={() => setUniSearch('')} style={{ cursor: 'pointer' }} />}
              </div>
              <select 
                className="sort-select" 
                style={{ width: 'auto', minWidth: '130px', height: '40px', fontSize: '0.8rem' }}
                value={uniSortBy}
                onChange={e => setUniSortBy(e.target.value)}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="rank-asc">Rank (Best first)</option>
                <option value="rank-desc">Rank (Lowest first)</option>
              </select>
              <button 
                onClick={() => setIsUniFilterOpen(!isUniFilterOpen)}
                className={`btn ${isUniFilterOpen ? 'btn-primary' : 'btn-outline'} btn-sm`}
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Filter size={14} /> Filters
              </button>
            </div>
            <button onClick={() => navigate('/admin/universities/new')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Plus size={16} /> Add University
            </button>
          </div>

          {isUniFilterOpen && (
            <div className="card-panel" style={{ marginBottom: '1.5rem', background: '#f8fafc', display: 'flex', gap: '1rem', alignItems: 'flex-end', padding: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Country</label>
                <select className="form-input" style={{ fontSize: '0.8rem', height: '36px' }} value={uniFilters.country} onChange={e => setUniFilters({...uniFilters, country: e.target.value})}>
                  <option value="all">All Countries</option>
                  {Array.from(new Set(universities.map(u => u.country).filter(Boolean))).sort().map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Status</label>
                <select className="form-input" style={{ fontSize: '0.8rem', height: '36px' }} value={uniFilters.status} onChange={e => setUniFilters({...uniFilters, status: e.target.value})}>
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
              <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Min Rank</label>
                  <input type="number" className="form-input" style={{ fontSize: '0.8rem', height: '36px' }} placeholder="Min" value={uniFilters.minRanking} onChange={e => setUniFilters({...uniFilters, minRanking: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Max Rank</label>
                  <input type="number" className="form-input" style={{ fontSize: '0.8rem', height: '36px' }} placeholder="Max" value={uniFilters.maxRanking} onChange={e => setUniFilters({...uniFilters, maxRanking: e.target.value})} />
                </div>
              </div>
              <button onClick={() => { setUniFilters({ country: 'all', status: 'all', minRanking: '', maxRanking: '' }); setUniSearch('') }} className="btn btn-outline btn-sm" style={{ height: '36px' }}>Reset</button>
            </div>
          )}

          <div className="card-panel" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr><th>Institution</th><th>Location</th><th>Ranking</th><th>Established</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Loading...</td></tr>
                  ) : universities.filter(u => {
                    if (uniSearch) {
                      const q = uniSearch.toLowerCase()
                      const match = u.name.toLowerCase().includes(q) || u.country.toLowerCase().includes(q) || (u.city && u.city.toLowerCase().includes(q))
                      if (!match) return false
                    }
                    if (uniFilters.country !== 'all' && u.country !== uniFilters.country) return false
                    if (uniFilters.status !== 'all') {
                      if (uniFilters.status === 'active' && !u.is_active) return false
                      if (uniFilters.status === 'inactive' && u.is_active) return false
                    }
                    if (uniFilters.minRanking && (parseInt(u.ranking) || 0) < parseInt(uniFilters.minRanking)) return false
                    if (uniFilters.maxRanking && (parseInt(u.ranking) || 0) > parseInt(uniFilters.maxRanking)) return false
                    return true
                  }).sort((a, b) => {
                    if (uniSortBy === 'name-asc') return a.name.localeCompare(b.name)
                    if (uniSortBy === 'name-desc') return b.name.localeCompare(a.name)
                    if (uniSortBy === 'rank-asc') return (parseInt(a.ranking) || 9999) - (parseInt(b.ranking) || 9999)
                    if (uniSortBy === 'rank-desc') return (parseInt(b.ranking) || 0) - (parseInt(a.ranking) || 0)
                    return 0
                  }).length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No universities found matching filters.</td></tr>
                  ) : universities.filter(u => {
                    if (uniSearch) {
                      const q = uniSearch.toLowerCase()
                      const match = u.name.toLowerCase().includes(q) || u.country.toLowerCase().includes(q) || (u.city && u.city.toLowerCase().includes(q))
                      if (!match) return false
                    }
                    if (uniFilters.country !== 'all' && u.country !== uniFilters.country) return false
                    if (uniFilters.status !== 'all') {
                      if (uniFilters.status === 'active' && !u.is_active) return false
                      if (uniFilters.status === 'inactive' && u.is_active) return false
                    }
                    if (uniFilters.minRanking && (parseInt(u.ranking) || 0) < parseInt(uniFilters.minRanking)) return false
                    if (uniFilters.maxRanking && (parseInt(u.ranking) || 0) > parseInt(uniFilters.maxRanking)) return false
                    return true
                  }).sort((a, b) => {
                    if (uniSortBy === 'name-asc') return a.name.localeCompare(b.name)
                    if (uniSortBy === 'name-desc') return b.name.localeCompare(a.name)
                    if (uniSortBy === 'rank-asc') return (parseInt(a.ranking) || 9999) - (parseInt(b.ranking) || 9999)
                    if (uniSortBy === 'rank-desc') return (parseInt(b.ranking) || 0) - (parseInt(a.ranking) || 0)
                    return 0
                  }).map(uni => (
                    <tr key={uni.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {uni.logo_url ? (
                            <img src={uni.logo_url} alt={uni.name} style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px', background: '#f8fafc', padding: '2px' }} onError={e => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GraduationCap size={16} style={{ color: '#94a3b8' }} /></div>
                          )}
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{uni.name}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.875rem', color: '#475569' }}>{uni.city ? `${uni.city}, ` : ''}{uni.country}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{uni.ranking || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{uni.established || '—'}</td>
                      <td>
                        <span style={{ background: uni.is_active ? '#f0fdf4' : '#fef2f2', color: uni.is_active ? '#10b981' : '#ef4444', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px' }}>
                          {uni.is_active ? '✓ Active' : '✗ Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => navigate(`/admin/universities/edit/${uni.id}`)} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b' }}><Pencil size={14} /></button>
                          <button onClick={() => deleteUniversity(uni.id)} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Manage Events ({eventsList.length})</h2>
            <button onClick={() => { setShowEventForm(true); setEditingEvent(null); setEventForm({ title: '', description: '', event_type: 'webinar', event_date: '', end_date: '', location: '', is_online: true, meeting_link: '', max_attendees: '' }) }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
              <Plus size={16} /> New Event
            </button>
          </div>

          {showEventForm && (
            <div className="card-panel" style={{ marginBottom: '1.5rem', border: '2px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1e293b', margin: 0 }}>{editingEvent ? 'Edit' : 'New'} Event</h3>
                <button onClick={() => setShowEventForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Title <span className="required">*</span></label>
                  <input className="form-input" value={eventForm.title} onChange={e => setEventForm(p => ({...p, title: e.target.value}))} placeholder="Event title..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-input" value={eventForm.event_type} onChange={e => setEventForm(p => ({...p, event_type: e.target.value}))}>
                    {['webinar', 'workshop', 'conference', 'training', 'meetup', 'other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Event Date <span className="required">*</span></label>
                  <input type="datetime-local" className="form-input" value={eventForm.event_date ? eventForm.event_date.slice(0, 16) : ''} onChange={e => setEventForm(p => ({...p, event_date: new Date(e.target.value).toISOString()}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="datetime-local" className="form-input" value={eventForm.end_date ? eventForm.end_date.slice(0, 16) : ''} onChange={e => setEventForm(p => ({...p, end_date: e.target.value ? new Date(e.target.value).toISOString() : ''}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input className="form-input" value={eventForm.location} onChange={e => setEventForm(p => ({...p, location: e.target.value}))} placeholder="Venue or address..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Attendees</label>
                  <input type="number" className="form-input" value={eventForm.max_attendees} onChange={e => setEventForm(p => ({...p, max_attendees: e.target.value}))} placeholder="Leave empty for unlimited" />
                </div>
                <div className="form-group">
                  <label className="form-label">Meeting Link</label>
                  <input className="form-input" value={eventForm.meeting_link} onChange={e => setEventForm(p => ({...p, meeting_link: e.target.value}))} placeholder="https://..." />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '1.5rem' }}>
                  <input type="checkbox" checked={eventForm.is_online} onChange={e => setEventForm(p => ({...p, is_online: e.target.checked}))} style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px' }} />
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>Online Event</label>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={eventForm.description} onChange={e => setEventForm(p => ({...p, description: e.target.value}))} placeholder="Event description..." />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button onClick={() => setShowEventForm(false)} className="btn btn-outline">Cancel</button>
                <button onClick={saveEvent} className="btn btn-primary">{editingEvent ? 'Update' : 'Create'} Event</button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {eventsList.length === 0 ? (
              <div className="card-panel" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No events yet. Create the first one!</div>
            ) : eventsList.map(ev => (
              <div key={ev.id} style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ background: '#eff6ff', color: '#3A4391', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase' }}>{ev.event_type}</span>
                      <span style={{ background: ev.is_online ? '#f0fdf4' : '#fffbeb', color: ev.is_online ? '#10b981' : '#f59e0b', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px' }}>{ev.is_online ? '🌐 Online' : '📍 In-Person'}</span>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{ev.title}</h3>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 4px' }}>{new Date(ev.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    {ev.description && <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>{ev.description.substring(0, 150)}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => { setEditingEvent(ev); setEventForm({ title: ev.title, description: ev.description || '', event_type: ev.event_type, event_date: ev.event_date, end_date: ev.end_date || '', location: ev.location || '', is_online: ev.is_online, meeting_link: ev.meeting_link || '', max_attendees: ev.max_attendees?.toString() || '' }); setShowEventForm(true) }} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b' }}><Pencil size={14} /></button>
                    <button onClick={() => deleteEvent(ev.id)} style={{ padding: '6px', borderRadius: '7px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* News Tab */}
      {tab === 'news' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Manage News Posts ({newsList.length})</h2>
            <button onClick={() => { setShowNewsForm(true); setEditingNews(null); setNewsForm({ title: '', content: '', category: '' }); setNewsImageFile(null) }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
              <Plus size={16} /> New News Post
            </button>
          </div>

          {showNewsForm && (
            <div className="card-panel" style={{ marginBottom: '1.5rem', border: '2px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1e293b', margin: 0 }}>{editingNews ? 'Edit' : 'New'} News Post</h3>
                <button onClick={() => setShowNewsForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Title <span className="required">*</span></label>
                <input className="form-input" value={newsForm.title} onChange={e => setNewsForm(p => ({...p, title: e.target.value}))} placeholder="News headline..." />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Category</label>
                <input className="form-input" value={newsForm.category} onChange={e => setNewsForm(p => ({...p, category: e.target.value}))} placeholder="e.g. Industry News, Platform Updates..." />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Content</label>
                <textarea className="form-input" rows={5} value={newsForm.content} onChange={e => setNewsForm(p => ({...p, content: e.target.value}))} placeholder="News body text..." />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Image (Square 1080×1080 recommended)</label>
                <input type="file" accept="image/*" onChange={e => setNewsImageFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                {editingNews?.image_url && !newsImageFile && <img src={editingNews.image_url} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowNewsForm(false)} className="btn btn-outline">Cancel</button>
                <button onClick={saveNews} className="btn btn-primary">{editingNews ? 'Update' : 'Publish'} News</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {newsList.length === 0 ? (
              <div className="card-panel" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', gridColumn: '1 / -1' }}>No news posts yet.</div>
            ) : newsList.map(n => (
              <div key={n.id} style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                {n.image_url && <div style={{ height: '140px', backgroundImage: `url(${n.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                <div style={{ padding: '1rem' }}>
                  {n.category && <span style={{ background: '#f0fdf4', color: '#10b981', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', marginBottom: '4px', display: 'inline-block' }}>{n.category}</span>}
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: '4px 0' }}>{n.title}</h4>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0 0 8px' }}>{new Date(n.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditingNews(n); setNewsForm({ title: n.title, content: n.content || '', category: n.category || '' }); setShowNewsForm(true) }} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}><Pencil size={11} /> Edit</button>
                    <button onClick={() => deleteNews(n.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#ef4444', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}><Trash2 size={11} /> Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blog Tab */}
      {tab === 'blog' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Manage Blog Posts ({blogList.length})</h2>
            <button onClick={() => { setShowBlogForm(true); setEditingBlog(null); setBlogForm({ title: '', slug: '', content: '', excerpt: '', category: '', tags: '' }); setBlogImageFile(null) }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
              <Plus size={16} /> New Blog Post
            </button>
          </div>

          {showBlogForm && (
            <div className="card-panel" style={{ marginBottom: '1.5rem', border: '2px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1e293b', margin: 0 }}>{editingBlog ? 'Edit' : 'New'} Blog Post</h3>
                <button onClick={() => setShowBlogForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Title <span className="required">*</span></label>
                  <input className="form-input" value={blogForm.title} onChange={e => setBlogForm(p => ({...p, title: e.target.value}))} placeholder="Blog post title..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Slug (auto-generated if empty)</label>
                  <input className="form-input" value={blogForm.slug} onChange={e => setBlogForm(p => ({...p, slug: e.target.value}))} placeholder="my-blog-post" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input className="form-input" value={blogForm.category} onChange={e => setBlogForm(p => ({...p, category: e.target.value}))} placeholder="e.g. Study Abroad, Tips..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input className="form-input" value={blogForm.tags} onChange={e => setBlogForm(p => ({...p, tags: e.target.value}))} placeholder="education, uk, scholarship" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Excerpt</label>
                <textarea className="form-input" rows={2} value={blogForm.excerpt} onChange={e => setBlogForm(p => ({...p, excerpt: e.target.value}))} placeholder="Short summary..." />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Content</label>
                <textarea className="form-input" rows={8} value={blogForm.content} onChange={e => setBlogForm(p => ({...p, content: e.target.value}))} placeholder="Full blog post content..." />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Featured Image</label>
                <input type="file" accept="image/*" onChange={e => setBlogImageFile(e.target.files?.[0] || null)} style={{ fontSize: '0.875rem' }} />
                {editingBlog?.featured_image_url && !blogImageFile && <img src={editingBlog.featured_image_url} alt="" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginTop: '8px' }} />}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowBlogForm(false)} className="btn btn-outline">Cancel</button>
                <button onClick={saveBlog} className="btn btn-primary">{editingBlog ? 'Update' : 'Publish'} Blog Post</button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {blogList.length === 0 ? (
              <div className="card-panel" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', gridColumn: '1 / -1' }}>No blog posts yet.</div>
            ) : blogList.map(b => (
              <div key={b.id} style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                {b.featured_image_url && <div style={{ height: '160px', backgroundImage: `url(${b.featured_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    {b.category && <span style={{ background: '#eff6ff', color: '#3A4391', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px' }}>{b.category}</span>}
                    <span style={{ background: b.is_published ? '#f0fdf4' : '#fef2f2', color: b.is_published ? '#10b981' : '#ef4444', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px' }}>{b.is_published ? 'Published' : 'Draft'}</span>
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{b.title}</h4>
                  {b.excerpt && <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 8px', lineHeight: 1.5 }}>{b.excerpt.substring(0, 120)}...</p>}
                  <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 10px' }}>{new Date(b.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { setEditingBlog(b); setBlogForm({ title: b.title, slug: b.slug || '', content: b.content || '', excerpt: b.excerpt || '', category: b.category || '', tags: (b.tags || []).join(', ') }); setShowBlogForm(true) }} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}><Pencil size={11} /> Edit</button>
                    <button onClick={() => deleteBlog(b.id)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', color: '#ef4444', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}><Trash2 size={11} /> Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activations Tab */}
      {tab === 'activations' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Partner Activation Requests ({activationRequests.length})</h2>
          </div>

          {/* Pending Requests */}
          {activationRequests.filter(r => r.status === 'pending').length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Pending Review ({activationRequests.filter(r => r.status === 'pending').length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activationRequests.filter(r => r.status === 'pending').map(req => (
                  <div key={req.id} style={{ background: 'white', borderRadius: '12px', padding: '1.25rem 1.5rem', border: '1px solid #fde68a', borderLeft: '3px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          {(req.universities as any)?.logo_url && (
                            <img src={(req.universities as any).logo_url} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{(req.universities as any)?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{(req.universities as any)?.country}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '6px' }}>
                          <strong>Requested by:</strong> {(req.profiles as any)?.first_name} {(req.profiles as any)?.last_name} — {(req.profiles as any)?.agency_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>
                          <strong>Email:</strong> {req.contact_email} {req.contact_phone && <> • <strong>Phone:</strong> {req.contact_phone}</>}
                        </div>
                        {req.reason && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>
                            <strong>Reason:</strong> {req.reason}
                          </div>
                        )}
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Submitted: {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleActivationAction(req.id, 'approved', req.agent_id, req.university_id)}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          onClick={() => handleActivationAction(req.id, 'rejected')}
                          style={{ padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processed Requests */}
          {activationRequests.filter(r => r.status !== 'pending').length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginBottom: '0.75rem' }}>Processed Requests</h3>
              <div className="card-panel" style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr><th>University</th><th>Agent</th><th>Agency</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {activationRequests.filter(r => r.status !== 'pending').map(req => (
                        <tr key={req.id}>
                          <td style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{(req.universities as any)?.name || '—'}</td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>{(req.profiles as any)?.first_name} {(req.profiles as any)?.last_name}</td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>{(req.profiles as any)?.agency_name || '—'}</td>
                          <td>{getStatusBadge(req.status, { approved: '#10b981', rejected: '#ef4444', pending: '#f59e0b' })}</td>
                          <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activationRequests.length === 0 && (
            <div className="card-panel" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              No activation requests yet. Agents will submit requests from the application page.
            </div>
          )}
        </div>
      )}

      {/* ═══ ADMIN USERS TAB (Super Admin only) ═══ */}
      {tab === 'admin_users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Admin, Admission & Program Manager Users</h2>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '4px 0 0' }}>Manage admin users who can access the admission management desk, program dashboard, and admin panel</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => navigate('/admin/admissions')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <ArrowUpRight size={14} /> Admission Dashboard
              </button>
              <button onClick={() => { setShowInviteForm(true); setInviteForm({ email: '', first_name: '', last_name: '', role: 'admission_manager' }) }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <UserPlus size={14} /> Invite New User
              </button>
            </div>
          </div>

          {/* Invite Form */}
          {showInviteForm && (
            <div className="card-panel" style={{ marginBottom: '1.5rem', border: '2px solid var(--color-primary)', borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #3A4391, #00CCA0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><UserPlus size={18} /></div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1e293b', margin: 0, fontSize: '1rem' }}>Invite New Staff User</h3>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>The invited user will register via the admin login page and be auto-assigned their role</p>
                  </div>
                </div>
                <button onClick={() => setShowInviteForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="required">*</span></label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <input className="form-input" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" type="email" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign Role <span className="required">*</span></label>
                  <select className="form-input" value={inviteForm.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="admission_manager">Admission Manager</option>
                    <option value="program_manager">Program Manager</option>
                    <option value="technical_team">Technical Team</option>
                    <option value="admin">Full Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={inviteForm.first_name} onChange={e => setInviteForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={inviteForm.last_name} onChange={e => setInviteForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                </div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <ShieldCheck size={18} style={{ color: '#3A4391', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6 }}>
                  <strong style={{ color: '#3A4391' }}>How it works:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: '16px' }}>
                    <li><strong>Admission Manager</strong> — Can access the Admission Management desk, review applications, request documents, and communicate with agents.</li>
                    <li><strong>Program Manager</strong> — Can access the Program Management dashboard, submit university and program proposals, and manage academic content.</li>
                    <li><strong>Technical Team</strong> — Can access the Technical Support dashboard, manage support tickets, knowledge base articles, and system events.</li>
                    <li><strong>Full Admin</strong> — Has complete access to the Admin Dashboard including all management capabilities plus approval rights.</li>
                  </ul>
                  The invited user will sign up via <strong>/admin/login</strong> with this email and be automatically assigned the selected role.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowInviteForm(false)} className="btn btn-outline">Cancel</button>
                <button onClick={sendAdminInvite} className="btn btn-primary" disabled={inviteSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {inviteSubmitting ? <><span className="spinner" /> Sending...</> : <><UserPlus size={14} /> Send Invite</>}
                </button>
              </div>
            </div>
          )}

          {/* User Role Attribution (Search & Assign) */}
          <div className="card-panel" style={{ marginBottom: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3A4391', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}><Search size={18} /></div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#1e293b', margin: 0, fontSize: '0.95rem' }}>Role Attribution & Management</h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Search any user by email to assign or revoke admin roles</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>User Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    className="form-input"
                    value={searchEmail}
                    onChange={e => setSearchEmail(e.target.value)}
                    placeholder="Search user by email..."
                    style={{ paddingLeft: '36px' }}
                    onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                  />
                </div>
              </div>
              <button
                onClick={handleSearchUser}
                className="btn btn-primary"
                disabled={searching}
                style={{ height: '40px' }}
              >
                {searching ? 'Searching...' : 'Find User'}
              </button>
            </div>

            {searchedUser && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '250px' }}>
                  {searchedUser.avatar_url ? (
                    <img src={searchedUser.avatar_url} alt="avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 }}>
                      {searchedUser.first_name?.charAt(0) || searchedUser.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{searchedUser.first_name || '—'} {searchedUser.last_name || ''}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{searchedUser.email}</div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: searchedUser.role === 'admin' ? '#eff6ff' : searchedUser.role ? '#ecfdf5' : '#f1f5f9', color: searchedUser.role === 'admin' ? '#3A4391' : searchedUser.role ? '#10b981' : '#64748b' }}>
                        Current Role: {searchedUser.role ? searchedUser.role.replace('_', ' ').toUpperCase() : 'USER / AGENT'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Assign New Role</label>
                    <select className="form-input" style={{ width: '200px', height: '38px', fontSize: '0.85rem' }} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                      <option value="admission_manager">Admission Management</option>
                      <option value="program_manager">Program Management</option>
                      <option value="technical_team">Technical Team</option>
                      <option value="admin">Super Admin</option>
                      <option value="agent">Revoke Admin (Agent)</option>
                    </select>
                  </div>
                  <button onClick={handleAssignRole} className="btn btn-primary" style={{ height: '38px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} /> Attribute Role
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Admin Users */}
          <div className="card-panel" style={{ padding: 0, marginBottom: '1.5rem' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: '#3A4391' }} /> Registered Admin Users ({adminUsers.length})
              </h3>
              <button onClick={fetchAdminUsers} className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>Refresh</button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Super Admin</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>No admin users found</td></tr>
                  ) : adminUsers.map(u => {
                    const isSelf = u.id === user?.id
                    return (
                      <tr key={u.id} style={{ opacity: u.is_active === false ? 0.6 : 1 }}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.first_name || '—'} {u.last_name || ''}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{u.email}</div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700,
                            background: u.role === 'admin' ? '#eff6ff' : u.role === 'program_manager' ? '#ecfdf5' : u.role === 'technical_team' ? '#fdf2f8' : '#f5f3ff',
                            color: u.role === 'admin' ? '#3A4391' : u.role === 'program_manager' ? '#10b981' : u.role === 'technical_team' ? '#db2777' : '#8b5cf6',
                            border: `1px solid ${u.role === 'admin' ? '#3A439125' : u.role === 'program_manager' ? '#10b98125' : u.role === 'technical_team' ? '#db277725' : '#8b5cf625'}`
                          }}>
                            {u.role === 'admin' ? <Shield size={10} /> : u.role === 'program_manager' ? <BookOpen size={10} /> : u.role === 'technical_team' ? <Settings size={10} /> : <ShieldCheck size={10} />}
                            {u.role === 'admin' ? 'Admin' : u.role === 'program_manager' ? 'Program Manager' : u.role === 'technical_team' ? 'Technical Team' : 'Admission Manager'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 10px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700,
                            background: u.is_active !== false ? '#f0fdf4' : '#fef2f2',
                            color: u.is_active !== false ? '#10b981' : '#ef4444',
                          }}>
                            {u.is_active !== false ? '✓ Active' : '✗ Inactive'}
                          </span>
                        </td>
                        <td>
                          {u.is_super_admin ? (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', background: '#fffbeb', padding: '2px 8px', borderRadius: 4 }}>⭐ SUPER</span>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td>
                          {!u.is_super_admin && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {/* Toggle active/inactive */}
                              <button
                                onClick={() => toggleAdminUserActive(u.id, u.is_active !== false)}
                                style={{
                                  padding: '4px 10px', borderRadius: '6px', border: '1px solid',
                                  borderColor: u.is_active !== false ? '#fecaca' : '#bbf7d0',
                                  background: u.is_active !== false ? '#fef2f2' : '#f0fdf4',
                                  color: u.is_active !== false ? '#ef4444' : '#10b981',
                                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                              >
                                {u.is_active !== false ? <><ToggleRight size={11} /> Block Access</> : <><ToggleLeft size={11} /> Unblock</>}
                              </button>
                              <button onClick={() => changeAdminUserRole(u.id, 'agent')} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: 'white', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <XCircle size={11} /> Revoke Role
                              </button>
                            </div>
                          )}
                          {u.is_super_admin && <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Protected account</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invites History */}
          <div className="card-panel" style={{ padding: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} style={{ color: '#f59e0b' }} /> Invite History ({adminInvites.length})
              </h3>
            </div>
            {adminInvites.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                No invites sent yet. Click "Invite New User" to get started.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Invited By</th><th>Date</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {adminInvites.map(inv => {
                      const statusColors: Record<string, { c: string; bg: string }> = {
                        pending: { c: '#f59e0b', bg: '#fffbeb' },
                        approved: { c: '#10b981', bg: '#f0fdf4' },
                        rejected: { c: '#ef4444', bg: '#fef2f2' },
                        registered: { c: '#3A4391', bg: '#eff6ff' },
                      }
                      const sc = statusColors[inv.status] || statusColors.pending
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{inv.email}</td>
                          <td style={{ fontSize: '0.85rem', color: '#475569' }}>{inv.first_name || '—'} {inv.last_name || ''}</td>
                          <td>
                            {(() => {
                              const roleStyles: Record<string, { bg: string; c: string; label: string }> = {
                                admin: { bg: '#eff6ff', c: '#3A4391', label: 'Full Admin' },
                                admission_manager: { bg: '#f5f3ff', c: '#8b5cf6', label: 'Adm. Manager' },
                                program_manager: { bg: '#ecfdf5', c: '#10b981', label: 'Prog. Manager' },
                                technical_team: { bg: '#fff7ed', c: '#ea580c', label: 'Technical Team' },
                              }
                              const rs = roleStyles[inv.role] || { bg: '#f1f5f9', c: '#64748b', label: inv.role }
                              return (
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: rs.bg, color: rs.c, textTransform: 'uppercase' }}>
                                  {rs.label}
                                </span>
                              )
                            })()}
                          </td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.c }}>
                              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{inv.profiles?.first_name} {inv.profiles?.last_name}</td>
                          <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(inv.created_at).toLocaleDateString('en-GB')}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {inv.status === 'pending' && (
                                <>
                                  <button onClick={() => updateInviteStatus(inv.id, 'approved')} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#10b981', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <CheckCircle2 size={11} /> Approve
                                  </button>
                                  <button onClick={() => updateInviteStatus(inv.id, 'rejected')} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <XCircle size={11} /> Reject
                                  </button>
                                </>
                              )}
                              <button onClick={() => deleteInvite(inv.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Approvals Tab (Super Admin only) */}
      {tab === 'pending_approvals' && (
        <div>
          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Pending Submissions from Admission Managers</h2>
              </div>
              <button onClick={() => navigate('/admin/admissions')} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <ArrowUpRight size={14} /> Admission Dashboard
              </button>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No pending submissions.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Type', 'Name / Details', 'Submitted By', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingSubmissions.map(sub => {
                    const colors: Record<string, { c: string; bg: string }> = { pending: { c: '#f59e0b', bg: '#fffbeb' }, approved: { c: '#10b981', bg: '#f0fdf4' }, rejected: { c: '#ef4444', bg: '#fef2f2' } }
                    const sc = colors[sub.status] || colors.pending
                    const isUni = sub.submission_type === 'university'
                    const submittedCampuses: any[] = sub.payload?.campuses || []
                    const submittedCampusIds: string[] = sub.payload?.campus_ids || []
                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: isUni ? '#eff6ff' : '#f5f3ff', color: isUni ? '#3A4391' : '#8b5cf6', textTransform: 'uppercase' }}>{sub.submission_type}</span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                          <div>{sub.payload?.name || '—'}</div>
                          {isUni && sub.payload?.is_multisite && (
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, marginTop: '2px' }}>🌐 Multisite — {submittedCampuses.length} campus{submittedCampuses.length !== 1 ? 'es' : ''}</div>
                          )}
                          {isUni && sub.payload?.country && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>{sub.payload.country}{sub.payload.city ? `, ${sub.payload.city}` : ''}</div>
                          )}
                          {!isUni && sub.payload?.level && (
                            <div style={{ fontSize: '0.72rem', color: '#8b5cf6', marginTop: '1px' }}>{sub.payload.level}{sub.payload.category ? ` · ${sub.payload.category}` : ''}</div>
                          )}
                          <div style={{ marginTop: '4px' }}>
                            <button onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)} style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {expandedSub === sub.id ? 'Hide Details' : 'View Details'} <ChevronDown size={12} style={{ transform: expandedSub === sub.id ? 'rotate(180deg)' : 'none' }} />
                            </button>
                          </div>
                          {expandedSub === sub.id && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxWidth: '440px', fontSize: '0.8rem' }}>
                              {isUni ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {([
                                    ['Established', sub.payload.established],
                                    ['Ranking', sub.payload.ranking],
                                    ['Global Rank #', sub.payload.global_ranking],
                                    ['Accreditation', sub.payload.accreditation],
                                    ['Students', sub.payload.student_count?.toLocaleString()],
                                    ['Acceptance Rate', sub.payload.acceptance_rate ? `${sub.payload.acceptance_rate}%` : null],
                                    ['Website', sub.payload.website_url],
                                    ['Active', sub.payload.is_active ? '✓ Yes' : '✗ No'],
                                    ['Multisite', sub.payload.is_multisite ? `✓ Yes (${submittedCampuses.length} campuses)` : '✗ No'],
                                  ] as [string, any][]).filter(([, v]) => v != null && v !== '' && v !== undefined).map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', gap: '8px' }}>
                                      <span style={{ color: '#94a3b8', minWidth: '120px', flexShrink: 0 }}>{k}:</span>
                                      <span style={{ color: '#1e293b', fontWeight: 600 }}>{String(v)}</span>
                                    </div>
                                  ))}
                                  {sub.payload.about && (
                                    <div style={{ marginTop: '6px', color: '#475569', lineHeight: 1.5 }}><strong>About:</strong> {String(sub.payload.about).substring(0, 200)}{String(sub.payload.about).length > 200 ? '...' : ''}</div>
                                  )}
                                  {submittedCampuses.length > 0 && (
                                    <div style={{ marginTop: '8px' }}>
                                      <strong style={{ color: '#475569' }}>Campuses:</strong>
                                      <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {submittedCampuses.map((c: any, i: number) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: c.is_main ? '#fef3c7' : '#f1f5f9', borderRadius: '6px' }}>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: c.is_main ? '#b45309' : '#64748b' }}>{c.is_main ? '★ MAIN' : `#${i + 1}`}</span>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{c.campus_name}</span>
                                            <span style={{ color: '#64748b' }}>— {c.city}, {c.country}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {([
                                    ['Duration', sub.payload.duration],
                                    ['Language', sub.payload.language],
                                    ['Delivery', sub.payload.delivery_mode],
                                    ['Tuition', sub.payload.tuition_fee ? `${sub.payload.currency} ${Number(sub.payload.tuition_fee).toLocaleString()}/yr` : null],
                                    ['App. Fee', sub.payload.application_fee ? `${sub.payload.currency} ${sub.payload.application_fee}` : null],
                                    ['Deadline', sub.payload.application_deadline],
                                    ['Scholarship', sub.payload.scholarship_available ? '✓ Yes' : null],
                                    ['Campus', !sub.payload.is_all_campuses ? `Specific (${submittedCampusIds.length} campus${submittedCampusIds.length !== 1 ? 'es' : ''})` : 'All campuses'],
                                    ['Active', sub.payload.is_active ? '✓ Yes' : '✗ No'],
                                  ] as [string, any][]).filter(([, v]) => v != null && v !== '' && v !== undefined).map(([k, v]) => (
                                    <div key={k} style={{ display: 'flex', gap: '8px' }}>
                                      <span style={{ color: '#94a3b8', minWidth: '120px', flexShrink: 0 }}>{k}:</span>
                                      <span style={{ color: '#1e293b', fontWeight: 600 }}>{String(v)}</span>
                                    </div>
                                  ))}
                                  {sub.payload.description && (
                                    <div style={{ marginTop: '6px', color: '#475569', lineHeight: 1.5 }}><strong>Description:</strong> {String(sub.payload.description).substring(0, 200)}{String(sub.payload.description).length > 200 ? '...' : ''}</div>
                                  )}
                                  {!sub.payload.is_all_campuses && sub.payload.campuses_details?.length > 0 && (
                                    <div style={{ marginTop: '10px' }}>
                                      <strong style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase' }}>Selected Campuses ({sub.payload.campuses_details.length})</strong>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '6px' }}>
                                        {sub.payload.campuses_details.map((c: any, i: number) => (
                                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f8fafc', borderRadius: '6px', border: `1px solid ${c.is_main ? '#fde68a' : '#e2e8f0'}` }}>
                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: c.is_main ? '#b45309' : '#64748b' }}>{c.is_main ? '★ MAIN' : `#${i + 1}`}</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.campus_name}</span>
                                              <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.city}, {c.country}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.82rem', color: '#64748b' }}>{sub.profiles?.first_name} {sub.profiles?.last_name}<br /><span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{sub.profiles?.email}</span></td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: sc.bg, color: sc.c }}>{sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}</span>
                        </td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(sub.created_at).toLocaleDateString('en-GB')}</td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {sub.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => navigate(`/admin/${isUni ? 'universities' : 'programs'}/review/${sub.id}`)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #3b82f6', background: '#eff6ff', color: '#3b82f6', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Eye size={12} /> Review & Edit
                              </button>
                              <button onClick={async () => {
                                const userId = (await supabase.auth.getUser()).data.user?.id
                                // ── Strip non-DB fields from payload ──
                                const {
                                  campuses: campPayload,
                                  campus_ids: campIdsPayload,
                                  campuses_details,
                                  target_id: tgtId,
                                  edit_mode: editMode,
                                  ...dbPayload
                                } = sub.payload
                                const campRows: any[] = campPayload || []
                                const campIdRows: string[] = campIdsPayload || []
                                try {
                                  if (sub.submission_type === 'program') {
                                    // ── PROGRAM APPROVAL ──
                                    if (editMode && tgtId) {
                                      const { error } = await supabase.from('programs').update(dbPayload).eq('id', tgtId)
                                      if (error) { toast.error('Failed to update program: ' + error.message); return }
                                      await supabase.from('program_campus_assignments').delete().eq('program_id', tgtId)
                                      if (!dbPayload.is_all_campuses && campIdRows.length > 0) {
                                        await supabase.from('program_campus_assignments').insert(campIdRows.map((cid: string) => ({ program_id: tgtId, campus_id: cid })))
                                      }
                                      } else {
                                        const { data: newProg, error } = await supabase.from('programs').insert({ 
                                          ...dbPayload, 
                                          is_active: dbPayload.is_active ?? true,
                                          slug: dbPayload.slug || generateProgSlug(dbPayload.name, dbPayload.level)
                                        }).select('id').single()
                                        if (error) { toast.error('Failed to create program: ' + error.message); return }
                                        if (newProg && !dbPayload.is_all_campuses && campIdRows.length > 0) {
                                          const { error: ce } = await supabase.from('program_campus_assignments').insert(campIdRows.map((cid: string) => ({ program_id: newProg.id, campus_id: cid })))
                                          if (ce) console.error('Campus assignment failed:', ce)
                                      }
                                    }
                                  } else {
                                    // ── UNIVERSITY APPROVAL ──
                                    if (editMode && tgtId) {
                                      const { error } = await supabase.from('universities').update(dbPayload).eq('id', tgtId)
                                      if (error) { toast.error('Failed to update university: ' + error.message); return }
                                      await supabase.from('university_campuses').delete().eq('university_id', tgtId)
                                      if (dbPayload.is_multisite && campRows.length > 0) {
                                        const rows = campRows.map((c: any) => ({ university_id: tgtId, campus_name: c.campus_name, country: c.country, city: c.city || null, region: c.region || null, address: c.address || null, postal_code: c.postal_code || null, phone: c.phone || null, email: c.email || null, website_url: c.website_url || null, student_count: c.student_count || null, is_main: !!c.is_main, is_active: true }))
                                        const { error: ce } = await supabase.from('university_campuses').insert(rows)
                                        if (ce) console.error('Campus insert failed:', ce)
                                      }
                                    } else {
                                      const { data: newUni, error } = await supabase.from('universities').insert({ 
                                        ...dbPayload, 
                                        is_active: dbPayload.is_active ?? true,
                                        slug: dbPayload.slug || generateUniSlug(dbPayload.name, dbPayload.country)
                                      }).select('id').single()
                                      if (error) { toast.error('Failed to create university: ' + error.message); return }
                                      if (newUni && dbPayload.is_multisite && campRows.length > 0) {
                                        const rows = campRows.map((c: any) => ({ university_id: newUni.id, campus_name: c.campus_name, country: c.country, city: c.city || null, region: c.region || null, address: c.address || null, postal_code: c.postal_code || null, phone: c.phone || null, email: c.email || null, website_url: c.website_url || null, student_count: c.student_count || null, is_main: !!c.is_main, is_active: true }))
                                        const { error: ce } = await supabase.from('university_campuses').insert(rows)
                                        if (ce) { toast.error('University created but campus insert failed: ' + ce.message); console.error(ce) }
                                      }
                                    }
                                  }
                                  await supabase.from('pending_submissions').update({ status: 'approved', reviewer_id: userId, reviewed_at: new Date().toISOString() }).eq('id', sub.id)
                                  const campMsg = isUni && dbPayload.is_multisite && campRows.length > 0 ? ` with ${campRows.length} campuses` : ''
                                  toast.success(`${isUni ? 'University' : 'Program'}${campMsg} approved and published!`)
                                  setExpandedSub(null)
                                  fetchNewData()
                                  fetchAll()
                                } catch (err: any) {
                                  toast.error('Approval failed: ' + (err.message || 'Unknown error'))
                                }
                              }} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#10b981', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={12} /> Quick Approve
                              </button>
                              <button onClick={async () => {
                                const notes = prompt('Rejection reason (optional):')
                                const userId = (await supabase.auth.getUser()).data.user?.id
                                await supabase.from('pending_submissions').update({ status: 'rejected', reviewer_id: userId, reviewer_notes: notes || null, reviewed_at: new Date().toISOString() }).eq('id', sub.id)
                                toast.success('Submission rejected')
                                setExpandedSub(null)
                                fetchNewData()
                              }} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#ef4444', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{sub.reviewer_notes || 'Reviewed'}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
      </main>
      <AdminFooter />
    </div>
  )
}
