import { supabase } from './supabase';
import type { SupportTicketRow, SupportTicketMessageRow } from '../types/database';
import type { DeviceInfo, SessionInfo, AgentInfo, SupportAttachment } from '../types/database-extended';

// ─── Device & Session Detection ──────────────────────────────────────────────

export function detectDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  let browser = 'Unknown', browserVersion = '', os = 'Unknown', osVersion = '', deviceType = 'desktop';

  // Browser detection
  if (ua.includes('Firefox/')) { browser = 'Firefox'; browserVersion = ua.split('Firefox/')[1]?.split(' ')[0] || ''; }
  else if (ua.includes('Edg/')) { browser = 'Microsoft Edge'; browserVersion = ua.split('Edg/')[1]?.split(' ')[0] || ''; }
  else if (ua.includes('Chrome/')) { browser = 'Google Chrome'; browserVersion = ua.split('Chrome/')[1]?.split(' ')[0] || ''; }
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) { browser = 'Safari'; browserVersion = ua.split('Version/')[1]?.split(' ')[0] || ''; }

  // OS detection
  if (ua.includes('Windows NT 10')) { os = 'Windows'; osVersion = '10/11'; }
  else if (ua.includes('Windows')) { os = 'Windows'; osVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || ''; }
  else if (ua.includes('Mac OS X')) { os = 'macOS'; osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace(/_/g, '.') || ''; }
  else if (ua.includes('Linux')) { os = 'Linux'; }
  else if (ua.includes('Android')) { os = 'Android'; osVersion = ua.match(/Android (\d+)/)?.[1] || ''; deviceType = 'mobile'; }
  else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; osVersion = ua.match(/OS (\d+)/)?.[1] || ''; deviceType = ua.includes('iPad') ? 'tablet' : 'mobile'; }

  // Device type
  if (/Mobi|Android/i.test(ua)) deviceType = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    screen: `${window.screen.width}x${window.screen.height}`,
    deviceType,
    platform: navigator.platform || 'Unknown'
  };
}

export function captureSessionInfo(): SessionInfo {
  return {
    ua: navigator.userAgent,
    lang: navigator.language,
    href: window.location.href,
    ts: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

export function buildAgentInfo(profile: any, email: string): AgentInfo {
  return {
    name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Unknown',
    email: email || profile?.email || '',
    agency: profile?.agency_name || profile?.trading_name || 'Independent Agent',
    role: profile?.role || 'agent',
    phone: profile?.phone || profile?.whatsapp_number || 'Not provided',
    country: profile?.country || profile?.office_country || 'Not specified',
    city: profile?.city || profile?.office_city || 'Not specified'
  };
}

// ─── File Upload ─────────────────────────────────────────────────────────────

export const uploadSupportAttachment = async (file: File, ticketId: string): Promise<SupportAttachment> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${ticketId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `support-attachments/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('support-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('support-attachments')
    .getPublicUrl(filePath);

  return {
    name: file.name,
    url: publicUrl,
    type: file.type,
    size: file.size
  };
};

export const uploadKbMedia = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `kb-media/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('kb-media')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('kb-media')
    .getPublicUrl(filePath);

  // Record in database for gallery
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('kb_media').insert([{
      name: file.name,
      url: publicUrl,
      type: file.type,
      size: file.size,
      uploaded_by: user?.id
    }]);
  } catch (err) {
    console.error('Failed to record media in gallery:', err);
  }

  return publicUrl;
};

export const uploadTechnicalMedia = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `events/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('support-attachments')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('support-attachments')
    .getPublicUrl(fileName);

  return publicUrl;
};

// ─── Ticket CRUD ─────────────────────────────────────────────────────────────

export const createSupportTicket = async (
  payload: {
    subject: string;
    category: string;
    subcategory?: string;
    priority: string;
    description: string;
    steps_to_reproduce?: string;
    expected_behavior?: string;
    actual_behavior?: string;
    error_message?: string;
    page_url?: string;
  },
  files: File[],
  user: any
) => {
  const sessionInfo = captureSessionInfo();
  const deviceInfo = detectDeviceInfo();
  const agentInfo = buildAgentInfo(user, user.email);

  // 1. Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert([{
      user_id: user.id,
      subject: payload.subject,
      category: payload.category,
      subcategory: payload.subcategory || null,
      priority: payload.priority as any,
      status: 'open' as any,
      description: payload.description,
      steps_to_reproduce: payload.steps_to_reproduce || null,
      expected_behavior: payload.expected_behavior || null,
      actual_behavior: payload.actual_behavior || null,
      error_message: payload.error_message || null,
      page_url: payload.page_url || window.location.href,
      session_info: sessionInfo as any,
      agent_info: agentInfo as any,
      device_info: deviceInfo as any,
    }])
    .select()
    .single();

  if (ticketError) throw ticketError;

  // 2. Upload attachments
  let attachments: SupportAttachment[] = [];
  if (files.length > 0) {
    attachments = await Promise.all(
      files.map(file => uploadSupportAttachment(file, ticket.id))
    );
    await supabase
      .from('support_tickets')
      .update({ attachments: attachments as any })
      .eq('id', ticket.id);
  }

  // 3. Trigger email notification via Edge Function
  try {
    await supabase.functions.invoke('send-support-notification', {
      body: {
        type: 'new_ticket',
        ticket: { ...ticket, attachments },
        user: { id: user.id, email: user.email }
      }
    });
  } catch (err) {
    console.error('Failed to send email notification:', err);
  }

  return ticket;
};

export const addTicketMessage = async (
  ticketId: string,
  message: string,
  senderId: string,
  files: File[],
  isInternal = false
) => {
  const { data: msg, error: msgError } = await supabase
    .from('support_ticket_messages')
    .insert([{
      ticket_id: ticketId,
      sender_id: senderId,
      message,
      is_internal: isInternal
    }])
    .select()
    .single();

  if (msgError) throw msgError;

  let attachments: SupportAttachment[] = [];
  if (files.length > 0) {
    attachments = await Promise.all(
      files.map(file => uploadSupportAttachment(file, ticketId))
    );
    await supabase
      .from('support_ticket_messages')
      .update({ attachments: attachments as any })
      .eq('id', msg.id);
  }

  // Notify team
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single();

  const { data: sender } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', senderId)
    .single();

  try {
    await supabase.functions.invoke('send-support-notification', {
      body: {
        type: 'new_message',
        ticket,
        message: {
          text: message,
          sender_name: `${sender?.first_name || ''} ${sender?.last_name || ''}`.trim(),
          attachments
        },
        user: { id: senderId }
      }
    });
  } catch (err) {
    console.error('Failed to notify team:', err);
  }

  return msg;
};

export const updateTicketStatus = async (
  ticketId: string,
  status: string,
  resolutionNotes?: string
) => {
  const updatePayload: any = { status };
  if (status === 'resolved' || status === 'closed') {
    updatePayload.resolved_at = new Date().toISOString();
  }
  if (resolutionNotes) {
    updatePayload.resolution_notes = resolutionNotes;
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .update(updatePayload)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw error;

  // Send status update notification
  try {
    await supabase.functions.invoke('send-support-notification', {
      body: { type: 'status_update', ticket: data }
    });
  } catch (err) {
    console.error('Failed to send status update notification:', err);
  }

  return data;
};

export const assignTicket = async (ticketId: string, assigneeId: string) => {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ assigned_to: assigneeId, status: 'in_progress' as any })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─── Knowledge Base ──────────────────────────────────────────────────────────

export const fetchPublishedArticles = async (categorySlug?: string) => {
  let query = supabase
    .from('kb_articles')
    .select('*, kb_categories(name, slug, icon)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (categorySlug) {
    const { data: cat } = await supabase
      .from('kb_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single();
    if (cat) {
      query = query.eq('category_id', cat.id);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const fetchArticleBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('kb_articles')
    .select('*, kb_categories(name, slug, icon)')
    .eq('slug', slug)
    .single();

  if (error) throw error;

  // Increment view count
  if (data) {
    await supabase
      .from('kb_articles')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', data.id);
  }

  return data;
};

export const searchArticles = async (query: string) => {
  const { data, error } = await supabase
    .from('kb_articles')
    .select('*, kb_categories(name, slug, icon)')
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('view_count', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
};

export const submitPortalFeedback = async (feedback: {
  user_id: string;
  type: 'suggestion' | 'complaint' | 'compliment' | 'bug_report' | 'other';
  subject: string;
  message: string;
  rating: number;
  page_url?: string;
}) => {
  const { data, error } = await supabase
    .from('portal_feedback')
    .insert([feedback])
    .select()
    .single();

  if (error) throw error;
  return data;
};
