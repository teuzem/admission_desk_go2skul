// Supabase Edge Function: send-contract-notification
// Sends branded email notifications to the contract management team
// via Resend API when new agents register on the platform.

// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// @ts-ignore
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const CONTRACT_TEAM_EMAIL = 'partners@admissiondesk.online'
const FROM_EMAIL = 'Admission Desk <noreply@admissiondesk.online>'

interface AgentRegistrationPayload {
  type: 'new_agent_registration'
  agent: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
    agency_name: string | null
    country: string | null
    city: string | null
    phone: string | null
    website: string | null
    account_type: string | null
    created_at: string
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function buildNewAgentRegistrationEmail(agent: AgentRegistrationPayload['agent']): { subject: string; html: string } {
  const agentName = [agent.first_name, agent.last_name].filter(Boolean).join(' ') || 'New Agent'
  const registeredDate = new Date(agent.created_at).toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  })

  return {
    subject: `New Agent Registration — ${agentName}${agent.agency_name ? ` (${agent.agency_name})` : ''} — Action Required`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header with Branding -->
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3A4391 100%); border-radius: 20px 20px 0 0; padding: 40px 36px; text-align: center;">
      <div style="margin-bottom: 16px;">
        <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 16px; line-height: 56px; text-align: center;">
          <span style="font-size: 28px; color: white;">AD</span>
        </div>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
        Admission Desk
      </h1>
      <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 13px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">
        Contract Management Team
      </p>
    </div>

    <!-- Main Content -->
    <div style="background: white; padding: 40px 36px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">

      <!-- Alert Banner -->
      <div style="background: linear-gradient(135deg, #dbeafe, #ede9fe); border-radius: 14px; padding: 20px 24px; margin-bottom: 28px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; background: #3A4391; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="color: white; font-size: 20px; font-weight: 800;">!</span>
        </div>
        <div>
          <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #1e293b;">New Agent Registration</h2>
          <p style="margin: 4px 0 0; font-size: 13px; color: #475569;">A new agent has registered on the Admission Desk platform and requires contract verification.</p>
        </div>
      </div>

      <!-- Agent Profile Card -->
      <div style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin-bottom: 28px;">
        <div style="background: #f8fafc; padding: 20px 24px; border-bottom: 1px solid #e2e8f0;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px;">
            Agent Profile
          </h3>
        </div>
        <div style="padding: 24px;">
          <!-- Agent Name & Avatar -->
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #3A4391, #00CCA0); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; flex-shrink: 0;">
              ${(agent.first_name?.[0] || agent.email[0]).toUpperCase()}
            </div>
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">${agentName}</h3>
              ${agent.agency_name ? `<p style="margin: 4px 0 0; font-size: 14px; color: #3A4391; font-weight: 600;">${agent.agency_name}</p>` : ''}
            </div>
          </div>

          <!-- Profile Details Table -->
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #64748b; width: 140px; font-weight: 600; vertical-align: top;">Email</td>
              <td style="padding: 10px 0; color: #0f172a; font-weight: 600;">
                <a href="mailto:${agent.email}" style="color: #3A4391; text-decoration: none;">${agent.email}</a>
              </td>
            </tr>
            ${agent.phone ? `
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Phone</td>
              <td style="padding: 10px 0; color: #0f172a;">${agent.phone}</td>
            </tr>` : ''}
            ${agent.country ? `
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Location</td>
              <td style="padding: 10px 0; color: #0f172a;">${agent.city ? `${agent.city}, ` : ''}${agent.country}</td>
            </tr>` : ''}
            ${agent.website ? `
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Website</td>
              <td style="padding: 10px 0;">
                <a href="${agent.website}" style="color: #3A4391; text-decoration: none; font-weight: 600;">${agent.website}</a>
              </td>
            </tr>` : ''}
            ${agent.account_type ? `
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Account Type</td>
              <td style="padding: 10px 0; color: #0f172a;">${agent.account_type}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Registered</td>
              <td style="padding: 10px 0; color: #0f172a;">${registeredDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-weight: 600; vertical-align: top;">Agent ID</td>
              <td style="padding: 10px 0;">
                <code style="font-size: 12px; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; color: #475569; font-family: 'SF Mono', monospace;">${agent.id}</code>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Required Actions -->
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
          Required Actions
        </h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #f59e0b; color: white; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; flex-shrink: 0;">1</span>
            <span style="font-size: 13px; color: #78350f; line-height: 1.5;">Contact agent to verify submitted information and business credentials</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #f59e0b; color: white; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; flex-shrink: 0;">2</span>
            <span style="font-size: 13px; color: #78350f; line-height: 1.5;">Request and review business documents (registration, license, etc.)</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #f59e0b; color: white; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; flex-shrink: 0;">3</span>
            <span style="font-size: 13px; color: #78350f; line-height: 1.5;">Verify compliance with Admission Desk ethics and policies</span>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="display: inline-block; width: 22px; height: 22px; background: #f59e0b; color: white; border-radius: 50%; text-align: center; line-height: 22px; font-size: 12px; font-weight: 700; flex-shrink: 0;">4</span>
            <span style="font-size: 13px; color: #78350f; line-height: 1.5;">Classify agent category and approve or reject the registration</span>
          </div>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 8px;">
        <a href="https://admissiondesk.online/admin/contracts" style="display: inline-block; background: linear-gradient(135deg, #3A4391, #4f46e5); color: white; padding: 14px 36px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none; letter-spacing: 0.3px;">
          Open Contract Management Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-radius: 0 0 20px 20px; padding: 28px 36px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 12px; color: #64748b; margin: 0 0 8px; font-weight: 600;">
        Admission Desk — Contract Management System
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        This is an automated notification. Please do not reply to this email.
      </p>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
          &copy; ${new Date().getFullYear()} Admission Desk. All rights reserved. Enterprise-grade education management.
        </p>
      </div>
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
    const payload: AgentRegistrationPayload = await req.json()

    if (payload.type !== 'new_agent_registration') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailContent = buildNewAgentRegistrationEmail(payload.agent)

    // Send via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [CONTRACT_TEAM_EMAIL],
        subject: emailContent.subject,
        html: emailContent.html,
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
