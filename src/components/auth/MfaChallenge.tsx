import { useEffect, useMemo, useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { ArrowLeft, Check, Fingerprint, KeyRound, Loader2, LockKeyhole, ShieldCheck, Smartphone, TimerReset } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase, type MfaChallenge as MfaChallengeData, type Session } from '../../lib/supabase'
import './MfaChallenge.css'

type Method = 'totp' | 'passkey' | 'recovery'

async function authenticateWithPasskey(ticket?: string): Promise<Session> {
  const { data: options, error: optionsError } = await supabase.auth.passkeys.authenticateOptions(ticket)
  if (optionsError || !options) throw new Error(optionsError?.message || 'Unable to start passkey authentication')
  const { challenge_ticket: challengeTicket, ...optionsJSON } = options
  const response = await startAuthentication({ optionsJSON })
  const { data, error } = await supabase.auth.passkeys.verifyAuthentication({ ticket: challengeTicket, response })
  if (error || !data?.access_token) throw new Error(error?.message || 'Passkey authentication failed')
  return data as Session
}

function friendlyPasskeyError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'The passkey prompt was cancelled or timed out. You can try again.'
  if (error instanceof DOMException && error.name === 'SecurityError') return 'Passkeys require a secure browser context and a trusted domain.'
  return error instanceof Error ? error.message : 'Passkey authentication failed'
}

export function PasskeySignInButton({ onSuccess, admin = false }: { onSuccess: (session: Session) => void | Promise<void>; admin?: boolean }) {
  const [loading, setLoading] = useState(false)
  const handleClick = async () => {
    setLoading(true)
    try {
      await onSuccess(await authenticateWithPasskey())
    } catch (error) {
      toast.error(friendlyPasskeyError(error))
    } finally {
      setLoading(false)
    }
  }
  return (
    <button type="button" className="passkey-signin-button" onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 size={18} className="mfa-spin" /> : <Fingerprint size={19} />}
      <span>{loading ? 'Waiting for your passkey…' : 'Continue with a passkey'}</span>
      {!loading && <span className="passkey-signin-badge">{admin ? 'STAFF' : 'FAST & SECURE'}</span>}
    </button>
  )
}

export default function MfaChallenge({
  challenge,
  onSuccess,
  onCancel,
  firstStep = 'password',
}: {
  challenge: MfaChallengeData
  onSuccess: (session: Session) => void | Promise<void>
  onCancel: () => void
  firstStep?: 'password' | 'email'
}) {
  const initialMethod = useMemo<Method>(() => {
    if (challenge.mfa_methods.totp.length > 0) return 'totp'
    if (challenge.mfa_methods.passkey) return 'passkey'
    return 'recovery'
  }, [challenge])
  const [method, setMethod] = useState<Method>(initialMethod)
  const [factorId, setFactorId] = useState(challenge.mfa_methods.totp[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, challenge.mfa_expires_at - Math.floor(Date.now() / 1000)))

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft(Math.max(0, challenge.mfa_expires_at - Math.floor(Date.now() / 1000))), 1000)
    return () => window.clearInterval(timer)
  }, [challenge.mfa_expires_at])

  const selectMethod = (next: Method) => {
    setMethod(next)
    setCode('')
    setError('')
  }

  const submitCode = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (loading || secondsLeft === 0 || method === 'passkey') return
    setLoading(true)
    setError('')
    try {
      const { data, error: verifyError } = await supabase.auth.mfa.verifyLogin({
        ticket: challenge.mfa_ticket,
        code: code.trim(),
        factorId: method === 'totp' ? factorId : undefined,
        method,
      })
      if (verifyError || !data?.access_token) throw new Error(verifyError?.message || 'Verification failed')
      await onSuccess(data as Session)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Verification failed')
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  const usePasskey = async () => {
    setLoading(true)
    setError('')
    try {
      await onSuccess(await authenticateWithPasskey(challenge.mfa_ticket))
    } catch (caught) {
      setError(friendlyPasskeyError(caught))
    } finally {
      setLoading(false)
    }
  }

  const available = [
    ...(challenge.mfa_methods.totp.length ? [{ id: 'totp' as const, label: 'Authenticator', icon: Smartphone }] : []),
    ...(challenge.mfa_methods.passkey ? [{ id: 'passkey' as const, label: 'Passkey', icon: Fingerprint }] : []),
    ...(challenge.mfa_methods.recovery ? [{ id: 'recovery' as const, label: 'Recovery code', icon: KeyRound }] : []),
  ]

  return (
    <section className="mfa-checkpoint" aria-labelledby="mfa-checkpoint-title">
      <div className="mfa-checkpoint-glow" />
      <div className="mfa-progress" aria-label="Authentication progress">
        <span className="mfa-progress-step complete"><Check size={13} /> {firstStep === 'email' ? 'Email' : 'Password'}</span>
        <span className="mfa-progress-line" />
        <span className="mfa-progress-step active"><ShieldCheck size={13} /> Verification</span>
      </div>

      <div className="mfa-shield-mark"><LockKeyhole size={28} strokeWidth={1.7} /></div>
      <p className="mfa-eyebrow">SECURITY CHECKPOINT</p>
      <h2 id="mfa-checkpoint-title" className="mfa-title">It’s good to see you.<br />Let’s make sure it’s you.</h2>
      <p className="mfa-subtitle">{firstStep === 'email' ? 'Your email link is verified.' : 'Your password is verified.'} Complete one more step to securely open your workspace.</p>

      {available.length > 1 && (
        <div className="mfa-method-switch" role="tablist" aria-label="Verification methods">
          {available.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={method === item.id} className={method === item.id ? 'active' : ''} onClick={() => selectMethod(item.id)}>
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </div>
      )}

      <div className="mfa-method-panel">
        {method === 'totp' && (
          <form onSubmit={submitCode}>
            <div className="mfa-method-heading">
              <Smartphone size={20} />
              <div><strong>Authenticator app</strong><span>Google, Microsoft, Authy or any TOTP app</span></div>
            </div>
            {challenge.mfa_methods.totp.length > 1 && (
              <label className="mfa-field-label">Choose an authenticator
                <select value={factorId} onChange={(event) => setFactorId(event.target.value)}>
                  {challenge.mfa_methods.totp.map((factor) => <option key={factor.id} value={factor.id}>{factor.friendly_name}</option>)}
                </select>
              </label>
            )}
            <label className="mfa-field-label" htmlFor="mfa-code">Six-digit verification code</label>
            <input
              id="mfa-code"
              className="mfa-code-input"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              aria-describedby="mfa-code-help"
              autoFocus
            />
            <p id="mfa-code-help" className="mfa-help">A fresh code is generated every 30 seconds.</p>
            <button className="mfa-primary-action" type="submit" disabled={code.length !== 6 || loading || secondsLeft === 0}>
              {loading ? <Loader2 size={18} className="mfa-spin" /> : <ShieldCheck size={18} />}
              {loading ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>
        )}

        {method === 'passkey' && (
          <div className="mfa-passkey-panel">
            <div className="mfa-passkey-orbit"><Fingerprint size={42} strokeWidth={1.4} /></div>
            <h3>Use your passkey</h3>
            <p>Confirm with your fingerprint, face, device PIN or hardware security key. Your biometric data never leaves your device.</p>
            <button className="mfa-primary-action" type="button" onClick={usePasskey} disabled={loading || secondsLeft === 0}>
              {loading ? <Loader2 size={18} className="mfa-spin" /> : <Fingerprint size={18} />}
              {loading ? 'Follow your device prompt…' : 'Authenticate with passkey'}
            </button>
          </div>
        )}

        {method === 'recovery' && (
          <form onSubmit={submitCode}>
            <div className="mfa-method-heading">
              <KeyRound size={20} />
              <div><strong>Recovery code</strong><span>Regain access without your usual device</span></div>
            </div>
            <label className="mfa-field-label" htmlFor="recovery-code">Enter one unused recovery code</label>
            <input
              id="recovery-code"
              className="mfa-code-input recovery"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 14))}
              autoComplete="off"
              placeholder="XXXX-XXXX-XXXX"
              autoFocus
            />
            <p className="mfa-help">Each code works once. We’ll mark it as used after sign-in.</p>
            <button className="mfa-primary-action" type="submit" disabled={code.replace(/-/g, '').length !== 12 || loading || secondsLeft === 0}>
              {loading ? <Loader2 size={18} className="mfa-spin" /> : <KeyRound size={18} />}
              {loading ? 'Checking code…' : 'Use recovery code'}
            </button>
          </form>
        )}
      </div>

      <div className="mfa-status-row">
        <span className={secondsLeft < 60 ? 'expiring' : ''}><TimerReset size={14} /> {secondsLeft > 0 ? `Session expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : 'Session expired'}</span>
        <span><ShieldCheck size={14} /> End-to-end verified</span>
      </div>
      {error && <div className="mfa-error" role="alert">{error}</div>}
      <button type="button" className="mfa-back" onClick={onCancel} disabled={loading}><ArrowLeft size={15} /> Back to sign in</button>
    </section>
  )
}
