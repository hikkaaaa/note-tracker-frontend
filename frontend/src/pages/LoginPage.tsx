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
import { saveAuth, getAuthToken } from '../lib/authToken'
import { API_BASE } from '../lib/api'

export function LoginPage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!nickname || !pwd || loading) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim(), password: pwd, remember }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const detail = data?.detail
        setError(typeof detail === 'string' ? detail : 'Could not log you in. Please try again.')
        setLoading(false)
        return
      }
      const data = await res.json()
      saveAuth(data.access_token, data.user, remember)
      setLoading(false)
      setSubmitted(true)
    } catch {
      setError('Cannot reach the server. Is the backend running?')
      setLoading(false)
    }
  }

  // Already signed in (a remembered 30-day session, or an active tab session)?
  // Bypass the login screen and drop straight into the workspace.
  useEffect(() => {
    if (getAuthToken()) navigate('/dashboard', { replace: true })
  }, [navigate])

  // After the success state shows, continue into the workspace.
  useEffect(() => {
    if (!submitted) return
    const timer = setTimeout(() => navigate('/dashboard'), 1100)
    return () => clearTimeout(timer)
  }, [submitted, navigate])

  return (
    <AuthLayout cta={{ label: 'Back home', to: '/' }}>
      <FormCard>
        {!submitted ? (
          <>
            <FormHead title="Log in" subtitle="Enter your details to continue to your folders." />
            <SocialRow />
            <AuthDivider />

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold">Nickname</span>
                <input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="yourname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  className={authInputClass}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="flex items-baseline justify-between text-[13px] font-semibold">
                  Password
                  <button type="button" className="cursor-pointer bg-transparent text-[12px] font-medium text-[#4F46E5] hover:underline">
                    Forgot?
                  </button>
                </span>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    required
                    className={`${authInputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 top-1/2 grid -translate-y-1/2 cursor-pointer place-items-center rounded-md bg-transparent p-1.5 text-[#6E5F7B] hover:text-[#4F46E5]"
                  >
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </label>

              <div className="mt-0.5 flex items-center justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="sr-only" />
                  <CheckSquare checked={remember} />
                  <span>Remember me</span>
                </label>
              </div>

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
                disabled={loading}
                className="mt-2 inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[#1B1326] px-[22px] py-4 text-[15px] font-semibold text-[#FBF7F2] shadow-[0_12px_28px_-14px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px disabled:cursor-wait disabled:opacity-80"
              >
                {loading ? (
                  <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-white/25 border-t-white" />
                ) : (
                  <>
                    Log in
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      <ArrowRight size={13} color="#FFFFFF" />
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-[22px] text-center text-sm text-[#6E5F7B]">
              New here?{' '}
              <Link to="/signup" className="font-semibold text-[#4F46E5] no-underline hover:underline">
                Create an account →
              </Link>
            </div>
          </>
        ) : (
          <AuthSuccess title="You're in." subtitle="Loading your space…" />
        )}
      </FormCard>

      <div className="text-center text-[12px] text-[#6E5F7B]">
        By logging in you agree to our{' '}
        <a className="cursor-pointer text-[#4F46E5] hover:underline">Terms</a> and{' '}
        <a className="cursor-pointer text-[#4F46E5] hover:underline">Privacy Policy</a>.
      </div>
    </AuthLayout>
  )
}
