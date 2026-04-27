// Supabase Edge Function: send-support-notification
// Sends email notifications to the technical team via Resend API
// when new support tickets are created or updated.

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-ignore
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SUPPORT_EMAIL = 'support@admissiondesk.online'
const FROM_EMAIL = 'Admission Desk Support <noreply@admissiondesk.online>'

interface TicketPayload {
  type: 'new_ticket' | 'new_message' | 'status_update' | 'ticket_assigned'
  ticket: any
  user: any
  message?: any
  assignee?: any
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return '#dc2626'
    case 'urgent': return '#ea580c'
    case 'high': return '#f59e0b'
    case 'medium': return '#3b82f6'
    case 'low': return '#6b7280'
    default: return '#6b7280'
  }
}

function getPriorityLabel(priority: string): string {
  return priority?.charAt(0).toUpperCase() + priority?.slice(1) || 'Medium'
}

function getStatusLabel(status: string): string {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Open'
}

function formatAttachments(attachments: any[]): string {
  if (!attachments || attachments.length === 0) return ''
  
  const items = attachments.map((att: any) => {
    const icon = att.type?.startsWith('image/') ? '🖼️' : 
                 att.type?.startsWith('video/') ? '🎥' : '📎'
    const size = att.size ? `(${(att.size / 1024 / 1024).toFixed(2)} MB)` : ''
    return `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
        <a href="${att.url}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">
          ${icon} ${att.name} ${size}
        </a>
      </td>
    </tr>`
  }).join('')

  return `
    <div style="margin-top: 24px;">
      <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
        Attachments (${attachments.length})
      </h3>
      <table style="width: 100%; border: 1px solid #e2e8f0; border-radius: 12px; border-collapse: collapse; overflow: hidden;">
        ${items}
      </table>
    </div>
  `
}

function buildNewTicketEmail(ticket: any, user: any): { subject: string; html: string } {
  const priorityColor = getPriorityColor(ticket.priority)
  const attachmentsHtml = formatAttachments(ticket.attachments || [])
  
  const sessionInfo = ticket.session_info || {}
  const agentInfo = ticket.agent_info || {}
  const deviceInfo = ticket.device_info || {}

  return {
    subject: `[${getPriorityLabel(ticket.priority)}] New Support Ticket: ${ticket.subject} — #${ticket.ticket_number || ticket.id?.substring(0, 8)}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.3px;">
        Admission Desk Support
      </h1>
      <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px;">New Technical Support Ticket</p>
    </div>

    <!-- Body -->
    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
      <!-- Priority & Status Badges -->
      <div style="display: flex; gap: 8px; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: white; background: ${priorityColor};">
          ${getPriorityLabel(ticket.priority)} Priority
        </span>
        <span style="display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4f46e5; background: #eef2ff;">
          ${getStatusLabel(ticket.status)}
        </span>
      </div>

      <!-- Ticket Subject -->
      <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px;">
        ${ticket.subject}
      </h2>
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 20px;">
        Ticket #${ticket.ticket_number || ticket.id?.substring(0, 8)} • Category: ${ticket.category}${ticket.subcategory ? ' / ' + ticket.subcategory : ''}
      </p>

      <!-- Description -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #4f46e5;">
        <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">Description</h3>
        <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0; white-space: pre-wrap;">${ticket.description}</p>
      </div>

      ${ticket.steps_to_reproduce ? `
      <div style="background: #fff7ed; border-radius: 12px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
        <h3 style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">Steps to Reproduce</h3>
        <p style="font-size: 13px; color: #78350f; line-height: 1.6; margin: 0; white-space: pre-wrap;">${ticket.steps_to_reproduce}</p>
      </div>` : ''}

      ${ticket.error_message ? `
      <div style="background: #fef2f2; border-radius: 12px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #ef4444;">
        <h3 style="font-size: 12px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">Error Message</h3>
        <code style="font-size: 12px; color: #dc2626; font-family: 'SF Mono', monospace; background: rgba(239,68,68,0.08); padding: 2px 6px; border-radius: 4px;">${ticket.error_message}</code>
      </div>` : ''}

      ${attachmentsHtml}

      <!-- Agent Information -->
      <div style="margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Agent Information
        </h3>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Full Name</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${agentInfo.name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email</td>
            <td style="padding: 6px 0; color: #0f172a;">${agentInfo.email || user?.email || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Agency</td>
            <td style="padding: 6px 0; color: #0f172a;">${agentInfo.agency || 'Independent Agent'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Role</td>
            <td style="padding: 6px 0; color: #0f172a;">${agentInfo.role || 'Agent'}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Phone</td>
            <td style="padding: 6px 0; color: #0f172a;">${agentInfo.phone || 'Not provided'}</td>
          </tr>
        </table>
      </div>

      <!-- Session Info -->
      <div style="margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 24px;">
        <h3 style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
          Session & Device Details
        </h3>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 8px 12px; color: #64748b; width: 140px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Browser</td>
            <td style="padding: 8px 12px; color: #334155; border-bottom: 1px solid #e2e8f0;">${deviceInfo.browser || sessionInfo.ua?.substring(0, 60) || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Operating System</td>
            <td style="padding: 8px 12px; color: #334155; border-bottom: 1px solid #e2e8f0;">${deviceInfo.os || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Screen Resolution</td>
            <td style="padding: 8px 12px; color: #334155; border-bottom: 1px solid #e2e8f0;">${deviceInfo.screen || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Language</td>
            <td style="padding: 8px 12px; color: #334155; border-bottom: 1px solid #e2e8f0;">${sessionInfo.lang || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Page URL</td>
            <td style="padding: 8px 12px; color: #334155; border-bottom: 1px solid #e2e8f0; word-break: break-all;">${ticket.page_url || sessionInfo.href || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #64748b; font-weight: 600;">Timestamp</td>
            <td style="padding: 8px 12px; color: #334155;">${sessionInfo.ts || new Date().toISOString()}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-radius: 0 0 16px 16px; padding: 24px 32px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
        This is an automated notification from <strong style="color: #4f46e5;">Admission Desk</strong> Support System.
      </p>
      <p style="font-size: 11px; color: #cbd5e1; margin: 8px 0 0;">
        Manage support tickets at your admin dashboard.
      </p>
    </div>
  </div>
</body>
</html>`
  }
}

function buildMessageNotificationEmail(ticket: any, message: any): { subject: string; html: string } {
  return {
    subject: `[Reply] ${ticket.subject} — Ticket #${ticket.ticket_number || ticket.id?.substring(0, 8)}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px 16px 0 0; padding: 24px 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 800;">New Reply on Ticket</h1>
    </div>
    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 12px;">
        Ticket #${ticket.ticket_number || ticket.id?.substring(0, 8)} • ${ticket.subject}
      </p>
      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border-left: 4px solid #4f46e5;">
        <p style="font-size: 13px; color: #64748b; margin: 0 0 4px; font-weight: 600;">${message.sender_name || 'User'} replied:</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.7; margin: 0; white-space: pre-wrap;">${message.text}</p>
      </div>
      ${formatAttachments(message.attachments || [])}
    </div>
    <div style="background: #f8fafc; border-radius: 0 0 16px 16px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">Admission Desk Support System</p>
    </div>
  </div>
</body>
</html>`
  }
}

function buildStatusUpdateEmail(ticket: any): { subject: string; html: string } {
  return {
    subject: `[Status Update] ${ticket.subject} — Now ${getStatusLabel(ticket.status)}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-radius: 16px 16px 0 0; padding: 24px 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 800;">Ticket Status Updated</h1>
    </div>
    <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
      <p style="font-size: 14px; color: #64748b; margin: 0 0 16px;">
        Ticket #${ticket.ticket_number || ticket.id?.substring(0, 8)}
      </p>
      <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 8px;">${ticket.subject}</h2>
      <div style="margin: 24px 0;">
        <span style="display: inline-block; padding: 8px 24px; border-radius: 24px; font-size: 14px; font-weight: 700; color: #4f46e5; background: #eef2ff;">
          ${getStatusLabel(ticket.status)}
        </span>
      </div>
      ${ticket.resolution_notes ? `
      <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin-top: 16px; border-left: 4px solid #22c55e; text-align: left;">
        <h3 style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; margin: 0 0 8px;">Resolution Notes</h3>
        <p style="font-size: 13px; color: #15803d; margin: 0;">${ticket.resolution_notes}</p>
      </div>` : ''}
    </div>
    <div style="background: #f8fafc; border-radius: 0 0 16px 16px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">Admission Desk Support System</p>
    </div>
  </div>
</body>
</html>`
  }
}

// @ts-ignore
serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: TicketPayload = await req.json()
    let emailContent: { subject: string; html: string }

    switch (payload.type) {
      case 'new_ticket':
        emailContent = buildNewTicketEmail(payload.ticket, payload.user)
        break
      case 'new_message':
        emailContent = buildMessageNotificationEmail(payload.ticket, payload.message)
        break
      case 'status_update':
        emailContent = buildStatusUpdateEmail(payload.ticket)
        break
      default:
        emailContent = buildNewTicketEmail(payload.ticket, payload.user)
    }

    // Send via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [SUPPORT_EMAIL],
        subject: emailContent.subject,
        html: emailContent.html,
        // Include attachment URLs as references in the email
        // Actual file content is linked via URLs in the HTML
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, emailId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
