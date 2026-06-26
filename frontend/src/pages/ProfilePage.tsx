import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BrandLogo } from '../components/BrandLogo'
import { CursorField } from '../components/CursorField'
import { authInputClass } from '../components/auth'
import { clearAuth, getAuthToken, getAuthUser, updateAuthUser } from '../lib/authToken'
import {
  ACCEPTED_AVATAR_TYPES,
  emptyProfile,
  fetchProfile,
  readAvatarFile,
  saveProfile,
  type Gender,
  type Profile,
} from '../lib/profile'
import { useTheme, type Theme } from '../lib/themeContext'

const bricolage = "'Quicksand', sans-serif"
const geist = "'Poppins', ui-sans-serif, sans-serif"

const GENDERS: { value: Gender; label: string }[] = [
  { value: '', label: 'Prefer to leave blank' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'prefer-not', label: 'Prefer not to say' },
]

const THEME_CARDS: { value: Theme; label: string; hint: string; swatch: string }[] = [
  { value: 'light', label: 'Light', hint: 'Clean copybook grid', swatch: '#FBF7F2' },
  { value: 'dark', label: 'Dark', hint: 'Soft near-black', swatch: '#14151A' },
  { value: 'pink', label: 'Pink', hint: 'Soft pastel hue', swatch: '#FBE3EE' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ProfilePage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const authUser = getAuthUser()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile>(emptyProfile)
  const [avatarError, setAvatarError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // Gate behind a session, like the rest of the workspace.
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true })
  }, [navigate])

  // Load the profile from the backend once the session is confirmed.
  useEffect(() => {
    if (!getAuthToken()) return
    let cancelled = false
    fetchProfile()
      .then((p) => { if (!cancelled) setProfile(p) })
      .catch(() => { if (!cancelled) setSaveError('Could not load your profile.') })
    return () => { cancelled = true }
  }, [])

  const initial = (authUser?.nickname?.[0] ?? 'H').toUpperCase()

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }))
    setSaved(false)
  }

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return
    setAvatarError('')
    try {
      const dataUrl = await readAvatarFile(file)
      const next = { ...profile, avatar: dataUrl }
      setProfile(next)
      // Persist immediately so the header pill updates even before "Save changes".
      await saveProfile(next)
    } catch (err) {
      setAvatarError((err as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeAvatar = async () => {
    setAvatarError('')
    const next = { ...profile, avatar: '' }
    setProfile(next)
    try {
      await saveProfile(next)
    } catch (err) {
      setAvatarError((err as Error).message)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveError('')
    const email = profile.email.trim()
    if (email && !EMAIL_RE.test(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    const next: Profile = {
      ...profile,
      firstName: profile.firstName.trim(),
      lastName: profile.lastName.trim(),
      email,
    }
    try {
      const saved = await saveProfile(next)
      setProfile(saved)
      // Keep the cached auth user (greeting UI) in sync with an edited email.
      if (saved.email && saved.email !== authUser?.email) updateAuthUser({ email: saved.email })
      setSaved(true)
    } catch (err) {
      // The backend rejects a duplicate email here; surface it on the email field.
      const message = (err as Error).message
      if (/email/i.test(message)) setEmailError(message)
      else setSaveError(message)
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased"
      style={{ fontFamily: geist }}
    >
      {/* background halos + grid (matches the dashboard canvas) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 600, height: 600, top: -140, left: -180, background: 'rgba(219,62,140,0.08)', filter: 'blur(90px)' }} />
        <div className="absolute rounded-full" style={{ width: 640, height: 640, bottom: -200, right: -200, background: 'rgba(119,88,163,0.10)', filter: 'blur(90px)' }} />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 75%)',
            opacity: 0.5,
          }}
        />
      </div>
      <CursorField />

      <div className="relative z-[1] mx-auto max-w-[760px] px-5 pb-20 pt-5 sm:px-8 sm:pt-7">
        <header className="mb-9 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline text-[var(--text-primary)]">
            <BrandLogo size={44} />
            <span className="text-[18px] font-bold leading-none tracking-[-0.01em]">
              hixie<span style={{ color: '#F99A00' }}>.</span>
            </span>
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-[18px] py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline shadow-[0_8px_22px_-16px_rgba(27,19,38,0.2)] transition-transform hover:-translate-y-px"
          >
            ← Back to folders
          </Link>
        </header>

        <motion.main
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-[2] flex flex-col gap-5"
        >
          <div>
            <h1 className="m-0 font-extrabold leading-[1.05] tracking-[-0.03em]" style={{ fontFamily: bricolage, fontSize: 'clamp(34px, 5vw, 52px)' }}>
              Profile
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(120deg, #FFC24B, #F99A00, #F26A1B)' }}>.</span>
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Manage your avatar, details, and the look of your space.</p>
          </div>

          <SettingsCard title="Avatar" subtitle="PNG or JPG, up to 2 MB.">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Your avatar" className="h-[88px] w-[88px] flex-shrink-0 rounded-full object-cover shadow-[0_8px_22px_-12px_rgba(27,19,38,0.4)]" />
              ) : (
                <span
                  className="grid h-[88px] w-[88px] flex-shrink-0 place-items-center rounded-full text-[34px] font-extrabold text-white shadow-[0_8px_22px_-12px_rgba(119,88,163,0.6)]"
                  style={{ background: 'linear-gradient(135deg, #FFC24B, #F99A00)', fontFamily: bricolage }}
                >
                  {initial}
                </span>
              )}

              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--btn-primary-text)] transition-transform hover:-translate-y-px"
                  >
                    Upload image
                  </button>
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={!profile.avatar}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Removing resets to the gradient placeholder.</p>
                {avatarError && <p role="alert" className="text-xs font-medium text-[#B91C57]">{avatarError}</p>}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_AVATAR_TYPES.join(',')}
                className="hidden"
                onChange={(e) => onPickAvatar(e.target.files?.[0])}
              />
            </div>
          </SettingsCard>

          <form onSubmit={handleSubmit}>
            <SettingsCard title="Your details" subtitle="Tell us how to address you.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name">
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    placeholder="Jane"
                    className={authInputClass}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    placeholder="Doe"
                    className={authInputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => { update('email', e.target.value); setEmailError('') }}
                    placeholder="you@example.com"
                    className={authInputClass}
                  />
                  {emailError && <span role="alert" className="mt-1 text-xs font-medium text-[#B91C57]">{emailError}</span>}
                </Field>
                <Field label="Gender">
                  <select
                    value={profile.gender}
                    onChange={(e) => update('gender', e.target.value as Gender)}
                    className={`${authInputClass} cursor-pointer appearance-none bg-[length:18px] bg-[right_1rem_center] bg-no-repeat pr-10`}
                    style={{
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236E5F7B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                    }}
                  >
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-5 py-3 text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_12px_28px_-14px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px"
                >
                  Save changes
                </button>
                {saved && <span className="text-sm font-medium text-[#7758A3]">Saved ✓</span>}
                {saveError && <span className="text-sm font-medium text-[#E5484D]">{saveError}</span>}
              </div>
            </SettingsCard>
          </form>

          <SettingsCard title="Theme" subtitle="Set the look of your whole space.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEME_CARDS.map((t) => {
                const active = theme === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left transition-all ${
                      active
                        ? 'border-[#8B5CF6] bg-[#7758A3]/[0.12] ring-4 ring-[#7758A3]/[0.12]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[#8B5CF6]/50'
                    }`}
                  >
                    <span
                      className="h-10 w-10 flex-shrink-0 rounded-full border border-[var(--border-subtle)]"
                      style={{ background: t.swatch }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: bricolage }}>{t.label}</span>
                      <span className="block truncate text-xs text-[var(--text-secondary)]">{t.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </SettingsCard>

          <SettingsCard title="Session" subtitle="Sign out on this device.">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-3 text-sm font-semibold text-[var(--danger-text)] transition-colors hover:brightness-110"
            >
              Log out
            </button>
          </SettingsCard>
        </motion.main>
      </div>
    </div>
  )
}

/** White settings card matching the dashboard surface treatment. */
function SettingsCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[0_18px_40px_-26px_rgba(27,19,38,0.22)]">
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]" style={{ fontFamily: bricolage }}>{title}</h2>
      <p className="mt-0.5 mb-4 text-[13px] text-[var(--text-secondary)]">{subtitle}</p>
      {children}
    </section>
  )
}

/** Labelled form field column. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</span>
      {children}
    </label>
  )
}
