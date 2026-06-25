import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from '../components/icons'
import {
  AuthLayout,
  AuthSuccess,
  authInputClass,
  AuthDivider,
  CheckSquare,
  EyeIcon,
  FormCard,
  FormHead,
  SocialRow,
} from '../components/auth'
import { saveAuth } from '../lib/authToken'
import { API_BASE } from '../lib/api'

function pwdStrength(p: string) {
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s // 0..4
}

const STRENGTH = [
  { label: '—', color: '#CFC5D8' },
  { label: 'Weak', color: '#DB3E8C' },
  { label: 'Okay', color: '#F6C45C' },
  { label: 'Good', color: '#82BA88' },
  { label: 'Strong', color: '#7758A3' },
]

export function SignupPage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const strength = pwdStrength(pwd)
  const meetsMin = pwd.length >= 8
  const canSubmit = Boolean(nickname && email && meetsMin && agree)

  // Keep the "8+ characters" requirement visible until it's actually met, so the
  // disabled button never looks unexplained. Only show a strength word past 8 chars.
  const strengthText = meetsMin ? STRENGTH[strength].label : '8+ characters'
  const strengthColor = pwd.length === 0 ? '#CFC5D8' : meetsMin ? STRENGTH[strength].color : '#DB3E8C'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || loading) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), email: email.trim(), password: pwd }),
      })

      if (!res.ok) {
        // FastAPI puts our explicit 400 message in `detail` (a string); validation
        // errors (422) arrive as an array — fall back to a generic message there.
        const data = await res.json().catch(() => null)
        const detail = data?.detail
        setError(typeof detail === 'string' ? detail : 'Could not create your account. Please try again.')
        setLoading(false)
        return
      }

      const data = await res.json()
      // A new account is kept signed in across restarts by default.
      saveAuth(data.access_token, data.user, true)
      // A fresh account simply has no folders on the backend yet, so the dashboard loads
      // empty on its own — no local wipe needed (and none that could clobber another
      // account's data on this browser).
      setLoading(false)
      setSubmitted(true)
    } catch {
      setError('Cannot reach the server. Is the backend running?')
      setLoading(false)
    }
  }

  // After the welcome state shows, continue into the workspace.
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => navigate('/dashboard'), 1100)
    return () => clearTimeout(timer)
  }, [submitted, navigate])

  return (
    <AuthLayout cta={{ label: 'Log in', to: '/login' }} columnWidth={460}>
      <FormCard>
        {!submitted ? (
          <>
            <FormHead title="Create your space" subtitle="A bright, sorted home for everything you keep." titleSize={30} />
            <SocialRow />
            <AuthDivider />

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">Nickname</span>
                <input
                  type="text"
                  placeholder="ada"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  className={authInputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={authInputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-[13px] font-semibold">
                  Password
                  <span
                    className="text-[12px] font-semibold uppercase tracking-[0.06em]"
                    style={{ color: strengthColor }}
                  >
                    {strengthText}
                  </span>
                </span>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    required
                    minLength={8}
                    className={`${authInputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 grid -translate-y-1/2 cursor-pointer place-items-center rounded-md bg-transparent p-1.5 text-[#6E5F7B] hover:text-[#7758A3]"
                  >
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
                <div className="mt-0.5 grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-1 rounded-full transition-colors"
                      style={{ background: meetsMin && strength >= i ? STRENGTH[strength].color : 'rgba(119,88,163,0.12)' }}
                    />
                  ))}
                </div>
              </label>

              <label className="mt-1 flex cursor-pointer select-none items-start gap-2.5 text-[13px] leading-relaxed text-[#6E5F7B]">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required className="sr-only" />
                <span className="mt-px">
                  <CheckSquare checked={agree} />
                </span>
                <span className="pt-px">
                  I agree to the{' '}
                  <a className="font-semibold text-[#7758A3] hover:underline">Terms</a> and{' '}
                  <a className="font-semibold text-[#7758A3] hover:underline">Privacy Policy</a>.
                </span>
              </label>

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#DB3E8C]/25 bg-[#DB3E8C]/[0.07] px-3.5 py-2.5 text-[13px] font-medium text-[#B91C57]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="mt-2 inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[#1B1326] px-[22px] py-4 text-[15px] font-semibold text-[#FBF7F2] shadow-[0_12px_28px_-14px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-white/25 border-t-white" />
                ) : (
                  <>
                    Create account
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F6C45C]">
                      <ArrowRight size={13} color="#1B1326" />
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-[22px] text-center text-sm text-[#6E5F7B]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#F99A00] no-underline hover:underline">
                Log in →
              </Link>
            </div>
          </>
        ) : (
          <AuthSuccess title={`Welcome, ${nickname.trim() || 'there'}.`} subtitle="We're setting up your space…" />
        )}
      </FormCard>

      <div className="text-center text-[12px] text-[#6E5F7B]">We'll never share your email. Cancel any time.</div>
    </AuthLayout>
  )
}
