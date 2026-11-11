import nodemailer from 'nodemailer'
import { config, isProd } from '../config.js'

const transporter = config.SMTP_HOST
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    })
  : null

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!transporter) {
    if (isProd) throw new Error('SMTP not configured in production')
    const links = Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1])
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
    console.log(`[email:dev] to=${to} subject=${subject}\n${text}${links.length ? `\nLINKS:\n${links.join('\n')}` : ''}`)
    return
  }
  await transporter.sendMail({ from: config.EMAIL_FROM, to, subject, html })
}

export function emailLayout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f6fb;font-family:Segoe UI,Arial,sans-serif">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e9f2">
    <div style="background:#0f2b5b;padding:24px 32px;color:#fff">
      <h1 style="margin:0;font-size:20px">Admission Desk</h1>
      <p style="margin:4px 0 0;color:#b9c8e8;font-size:13px">${title}</p>
    </div>
    <div style="padding:32px;color:#22304a;font-size:14px;line-height:1.6">${body}</div>
    <div style="padding:16px 32px;background:#f8fafd;color:#7a8aa8;font-size:12px">
      &copy; ${new Date().getFullYear()} Admission Desk &middot; go2skul
    </div>
  </div></body></html>`
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${config.APP_URL}/auth/email-verified?token_hash=${token}&type=signup`
  await sendEmail(
    email,
    'Verify your email — Admission Desk',
    emailLayout('Email verification', `<p>Welcome to Admission Desk!</p>
      <p>Confirm your email address to activate your account:</p>
      <p><a href="${link}" style="background:#0f2b5b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Verify email</a></p>
      <p style="color:#7a8aa8;font-size:12px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>`),
  )
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${config.APP_URL}/auth/reset-password?token_hash=${token}&type=recovery`
  await sendEmail(
    email,
    'Reset your password — Admission Desk',
    emailLayout('Password reset', `<p>We received a request to reset your password.</p>
      <p><a href="${link}" style="background:#0f2b5b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reset password</a></p>
      <p style="color:#7a8aa8;font-size:12px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`),
  )
}