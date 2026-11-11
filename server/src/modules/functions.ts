import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../plugins/auth.js'
import { sendEmail, emailLayout } from '../lib/email.js'
import { config } from '../config.js'

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export async function functionsRoutes(app: FastifyInstance) {
  app.post('/functions/v1/send-support-notification', { preHandler: requireAuth }, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, any>
    const type = String(body.type ?? '')
    if (!['new_ticket', 'new_message', 'status_update', 'ticket_assigned'].includes(type)) {
      return reply.code(400).send({ error: 'Unsupported notification type' })
    }
    const ticket = body.ticket ?? {}
    const user = body.user ?? {}
    const rows = [
      ['Type', type.replace(/_/g, ' ')],
      ['Ticket', ticket.ticket_number ?? ticket.id],
      ['Subject', ticket.subject],
      ['Category', ticket.category],
      ['Priority', ticket.priority],
      ['Status', ticket.status],
      ['From', `${user.first_name ?? ''} ${user.last_name ?? ''} <${user.email ?? ''}>`],
    ]
    const table = rows.map(([k, v]) => `<tr><td style="padding:6px 12px;color:#7a8aa8">${k}</td><td style="padding:6px 12px">${escapeHtml(v)}</td></tr>`).join('')
    const messageBlock = body.message ? `<p><strong>Message:</strong></p><p>${escapeHtml(body.message.message ?? body.message)}</p>` : ''
    const description = ticket.description ? `<p><strong>Description:</strong></p><p>${escapeHtml(ticket.description)}</p>` : ''
    await sendEmail(
      config.SUPPORT_EMAIL,
      `[Support] ${type.replace(/_/g, ' ')}: ${escapeHtml(ticket.subject ?? ticket.ticket_number ?? '')}`,
      emailLayout('Support notification', `<table style="border-collapse:collapse;width:100%">${table}</table>${description}${messageBlock}
        <p><a href="${config.APP_URL}/admin/support" style="color:#0f2b5b">Open Support Dashboard</a></p>`),
    )
    return { success: true }
  })

  app.post('/functions/v1/send-contract-notification', { preHandler: requireAuth }, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, any>
    if (body.type !== 'new_agent_registration') {
      return reply.code(400).send({ error: 'Unsupported notification type' })
    }
    const agent = body.agent ?? {}
    const rows = [
      ['Name', `${agent.first_name ?? ''} ${agent.last_name ?? ''}`],
      ['Email', agent.email],
      ['Agency', agent.agency_name],
      ['Country', agent.country],
      ['City', agent.city],
      ['Phone', agent.phone],
      ['Account type', agent.account_type],
    ]
    const table = rows.map(([k, v]) => `<tr><td style="padding:6px 12px;color:#7a8aa8">${k}</td><td style="padding:6px 12px">${escapeHtml(v)}</td></tr>`).join('')
    await sendEmail(
      config.PARTNERS_EMAIL,
      `[Contracts] New agent registration: ${escapeHtml(agent.agency_name ?? agent.email ?? '')}`,
      emailLayout('New agent registration', `<table style="border-collapse:collapse;width:100%">${table}</table>
        <p><a href="${config.APP_URL}/admin/contracts" style="background:#0f2b5b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Review in Contract Management</a></p>`),
    )
    return { success: true }
  })
}