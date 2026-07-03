import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronRight, FileText, FolderOpen, HardDrive } from 'lucide-react'
import { BrandLogo } from '../components/BrandLogo'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { authInputClass } from '../components/auth'
import { clearAuth, getAuthToken, getAuthUser, updateAuthUser } from '../lib/authToken'
import {
  ACCEPTED_AVATAR_TYPES,
  deriveNames,
  emptyProfile,
  fetchProfile,
  fetchProfileStats,
  formatBytes,
  MAX_NAME_LENGTH,
  patchProfile,
  readAvatarFile,
  type FolderStat,
  type Gender,
  type Profile,
  type ProfileStats,
} from '../lib/profile'
import { useProfile } from '../lib/profileContext'
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
  { value: 'light', label: 'Light', hint: 'Cool slate-white', swatch: '#F4F5FB' },
  { value: 'dark', label: 'Dark', hint: 'Deep midnight', swatch: '#15161F' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Modal =
  | { kind: 'removeAvatar' }
  | { kind: 'logout' }
  | { kind: 'theme'; theme: Theme }
  | null

// Fields the "Your details" form owns; used for the dirty check.
const DETAIL_KEYS: (keyof Profile)[] = ['firstName', 'lastName', 'email', 'gender']

export function ProfilePage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { profile: ctxProfile, setProfile: setCtxProfile } = useProfile()
  const authUser = getAuthUser()
  const fileRef = useRef<HTMLInputElement>(null)

  // `form` is the working copy; `baseline` is the last-saved snapshot the dirty checks
  // compare against. The avatar draft is held apart so it only persists on its own save.
  const [form, setForm] = useState<Profile>(emptyProfile)
  const [baseline, setBaseline] = useState<Profile>(emptyProfile)
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null)
  const hydrated = useRef(false)

  const [avatarError, setAvatarError] = useState('')
  const [firstNameError, setFirstNameError] = useState('')
  const [lastNameError, setLastNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [savedDetails, setSavedDetails] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)

  const [prefError, setPrefError] = useState('')
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [modal, setModal] = useState<Modal>(null)

  // Gate behind a session.
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true })
  }, [navigate])

  // Fill in derived names when the account has none stored yet, so the user never
  // has to type them.
  const applyDerived = (p: Profile): Profile => {
    const { firstName, lastName } = deriveNames(authUser?.nickname)
    return {
      ...p,
      firstName: p.firstName || firstName,
      lastName: p.lastName || lastName,
    }
  }

  const hydrate = (p: Profile) => {
    const withNames = applyDerived(p)
    setForm(withNames)
    setBaseline(withNames)
    hydrated.current = true
  }

  // Hydrate from the shared profile as soon as it lands (once).
  useEffect(() => {
    if (!hydrated.current && ctxProfile) hydrate(ctxProfile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxProfile])

  // Load a fresh copy + the account stats directly.
  useEffect(() => {
    if (!getAuthToken()) return
    let cancelled = false
    fetchProfile()
      .then((p) => {
        if (cancelled) return
        hydrate(p)
        setCtxProfile(applyDerived(p))
      })
      .catch(() => { if (!cancelled) setSaveError('Could not load your profile.') })
    fetchProfileStats()
      .then((s) => { if (!cancelled) setStats(s) })
      .catch(() => { /* stats are non-essential */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCtxProfile])

  const initial = (form.firstName?.[0] ?? authUser?.nickname?.[0] ?? 'H').toUpperCase()

  const shownAvatar = avatarDraft !== null ? avatarDraft : form.avatar
  const avatarDirty = avatarDraft !== null && avatarDraft !== form.avatar
  const detailsDirty = DETAIL_KEYS.some((k) => String(form[k]).trim() !== String(baseline[k]).trim())

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setForm((p) => ({ ...p, [key]: value }))
    setSavedDetails(false)
  }

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return
    setAvatarError('')
    try {
      setAvatarDraft(await readAvatarFile(file))
    } catch (err) {
      setAvatarError((err as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const saveAvatar = async () => {
    if (!avatarDirty) return
    setSavingAvatar(true)
    setAvatarError('')
    try {
      const saved = await patchProfile({ avatar: shownAvatar })
      setForm((f) => ({ ...f, avatar: saved.avatar }))
      setBaseline((b) => ({ ...b, avatar: saved.avatar }))
      setCtxProfile(applyDerived(saved))
      setAvatarDraft(null)
    } catch (err) {
      setAvatarError((err as Error).message)
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleSubmitDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!detailsDirty) return
    setSaveError('')
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim()

    let bad = false
    if (firstName.length > MAX_NAME_LENGTH) { setFirstNameError(`Keep it under ${MAX_NAME_LENGTH} characters.`); bad = true } else setFirstNameError('')
    if (lastName.length > MAX_NAME_LENGTH) { setLastNameError(`Keep it under ${MAX_NAME_LENGTH} characters.`); bad = true } else setLastNameError('')
    if (email && !EMAIL_RE.test(email)) { setEmailError('Please enter a valid email address.'); bad = true } else setEmailError('')
    if (bad) return

    setSavingDetails(true)
    try {
      const saved = await patchProfile({ firstName, lastName, email, gender: form.gender })
      const merged = applyDerived(saved)
      setForm((f) => ({ ...f, ...merged }))
      setBaseline((b) => ({ ...b, ...merged }))
      setCtxProfile(merged)
      if (saved.email && saved.email !== authUser?.email) updateAuthUser({ email: saved.email })
      setSavedDetails(true)
    } catch (err) {
      const message = (err as Error).message
      if (/email/i.test(message)) setEmailError(message)
      else setSaveError(message)
    } finally {
      setSavingDetails(false)
    }
  }

  // Notification preferences persist the moment they change (optimistic).
  const savePref = async (patch: Partial<Profile>) => {
    setPrefError('')
    const optimistic = { ...form, ...patch }
    setForm(optimistic)
    setBaseline((b) => ({ ...b, ...patch }))
    setCtxProfile(applyDerived(optimistic))
    try {
      await patchProfile(patch)
    } catch {
      setPrefError('Could not save that preference. Please try again.')
      try {
        const fresh = await fetchProfile()
        hydrate(fresh)
      } catch { /* leave the optimistic value */ }
    }
  }

  const handleLogout = () => {
    clearAuth()
    setCtxProfile(null)
    navigate('/login', { replace: true })
  }

  const onModalConfirm = () => {
    if (!modal) return
    if (modal.kind === 'removeAvatar') { setAvatarError(''); setAvatarDraft('') }
    else if (modal.kind === 'logout') handleLogout()
    else if (modal.kind === 'theme') setTheme(modal.theme)
  }

  const modalCopy: Record<Exclude<Modal, null>['kind'], { title: string; message: string }> = {
    removeAvatar: { title: 'Remove avatar?', message: 'This resets your avatar to the default gradient placeholder.' },
    logout: { title: 'Log out?', message: 'Are you sure you want to log out of this device?' },
    theme: { title: 'Change theme?', message: 'Are you sure you want to change the look of your whole space?' },
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased"
      style={{ fontFamily: geist }}
    >
      {/* background halos + grid (matches the dashboard canvas) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 600, height: 600, top: -140, left: -180, background: 'rgba(99,102,241,0.08)', filter: 'blur(90px)' }} />
        <div className="absolute rounded-full" style={{ width: 640, height: 640, bottom: -200, right: -200, background: 'rgba(79,70,229,0.10)', filter: 'blur(90px)' }} />
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

      <div className="relative z-[1] mx-auto max-w-[760px] px-5 pb-20 pt-5 sm:px-8 sm:pt-7">
        <header className="mb-9 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 no-underline text-[var(--text-primary)]">
            <BrandLogo size={44} />
            <span className="text-[18px] font-bold leading-none tracking-[-0.01em]">
              hixie<span style={{ color: '#F97316' }}>.</span>
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
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(120deg, #6366F1, #4F46E5, #4338CA)' }}>.</span>
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Manage your avatar, details, and the look of your space.</p>
          </div>

          {/* AVATAR --------------------------------------------------------------- */}
          <SettingsCard title="Avatar" subtitle="PNG or JPG, up to 2 MB.">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              {shownAvatar ? (
                <img src={shownAvatar} alt="Your avatar" className="h-[88px] w-[88px] flex-shrink-0 rounded-full object-cover shadow-[0_8px_22px_-12px_rgba(27,19,38,0.4)]" />
              ) : (
                <span
                  className="grid h-[88px] w-[88px] flex-shrink-0 place-items-center rounded-full text-[34px] font-extrabold text-white shadow-[0_8px_22px_-12px_rgba(79,70,229,0.6)]"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontFamily: bricolage }}
                >
                  {initial}
                </span>
              )}

              <div className="flex flex-1 flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--btn-primary-text)] transition-transform hover:-translate-y-px"
                  >
                    Upload image
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: 'removeAvatar' })}
                    disabled={!shownAvatar}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--danger-text)] transition-colors hover:border-[#DC2626] hover:bg-[#DC2626] hover:text-white disabled:cursor-not-allowed disabled:border-[var(--border-subtle)] disabled:bg-[var(--surface)] disabled:text-[var(--danger-text)] disabled:opacity-40"
                  >
                    Remove
                  </button>

                  {/* Dedicated avatar save — only present when the avatar actually changed. */}
                  {avatarDirty && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAvatarDraft(null)}
                        className="rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveAvatar}
                        disabled={savingAvatar}
                        className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-4 py-2.5 text-[13px] font-semibold text-[var(--btn-primary-text)] transition-transform hover:-translate-y-px disabled:cursor-wait disabled:opacity-80"
                      >
                        {savingAvatar ? <Spinner /> : 'Save changes'}
                      </button>
                    </div>
                  )}
                </div>
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

          {/* DETAILS -------------------------------------------------------------- */}
          <form onSubmit={handleSubmitDetails}>
            <SettingsCard title="Your details" subtitle="Tell us how to address you.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="First name" error={firstNameError}>
                  <input
                    type="text"
                    value={form.firstName}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(e) => { update('firstName', e.target.value); setFirstNameError('') }}
                    placeholder="Jane"
                    className={authInputClass}
                  />
                </Field>
                <Field label="Last name" error={lastNameError}>
                  <input
                    type="text"
                    value={form.lastName}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(e) => { update('lastName', e.target.value); setLastNameError('') }}
                    placeholder="Doe"
                    className={authInputClass}
                  />
                </Field>
                <Field label="Email" error={emailError}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => { update('email', e.target.value); setEmailError('') }}
                    placeholder="you@example.com"
                    className={authInputClass}
                  />
                </Field>
                <Field label="Gender">
                  <select
                    value={form.gender}
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
                  disabled={!detailsDirty || savingDetails}
                  className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-5 py-3 text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_12px_28px_-14px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                >
                  {savingDetails ? <Spinner /> : 'Save changes'}
                </button>
                {savedDetails && !detailsDirty && <span className="text-sm font-medium text-[#4F46E5]">Saved ✓</span>}
                {saveError && <span className="text-sm font-medium text-[#E5484D]">{saveError}</span>}
              </div>
            </SettingsCard>
          </form>

          {/* CONNECTED ACCOUNTS --------------------------------------------------- */}
          <SettingsCard title="Connected accounts" subtitle="Link your Google or GitHub account.">
            <div className="flex flex-col gap-2.5">
              <ConnectedAccountRow provider="Google" icon={<span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-input)] text-sm font-bold text-[#4285F4]">G</span>} />
              <ConnectedAccountRow provider="GitHub" icon={<span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-input)] text-xs font-bold text-[var(--text-primary)]">GH</span>} />
            </div>
          </SettingsCard>

          {/* PREFERENCES ---------------------------------------------------------- */}
          <SettingsCard title="Preferences" subtitle="Choose which emails we send you.">
            <div className="flex flex-col gap-2.5">
              <Toggle
                label="Weekly summaries"
                hint="Receive a weekly email digest of your notes."
                checked={form.notifyWeeklySummary}
                onChange={(v) => savePref({ notifyWeeklySummary: v })}
              />
              <Toggle
                label="Shared folder alerts"
                hint="Notify me when a folder is shared with me."
                checked={form.notifyFolderShared}
                onChange={(v) => savePref({ notifyFolderShared: v })}
              />
            </div>
            {prefError && <p role="alert" className="mt-3 text-xs font-medium text-[#B91C57]">{prefError}</p>}
          </SettingsCard>

          {/* ACCOUNT -------------------------------------------------------------- */}
          <SettingsCard title="Account" subtitle="A snapshot of your space.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon={<CalendarDays size={15} />} label="Created" value={stats?.createdAt ? fmtDate(stats.createdAt) : '—'} />
              <StatTile icon={<FolderOpen size={15} />} label="Folders" value={stats ? String(stats.totalFolders) : '—'} />
              <StatTile icon={<FileText size={15} />} label="Notes" value={stats ? String(stats.totalNotes) : '—'} />
              <StatTile icon={<HardDrive size={15} />} label="Storage used" value={stats ? formatBytes(stats.storageBytes) : '—'} />
            </div>
            {stats && stats.folders.length > 0 && <AccountDirectory folders={stats.folders} />}
          </SettingsCard>

          {/* THEME ---------------------------------------------------------------- */}
          <SettingsCard title="Theme" subtitle="Set the look of your whole space.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEME_CARDS.map((t) => {
                const active = theme === t.value
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { if (!active) setModal({ kind: 'theme', theme: t.value }) }}
                    aria-pressed={active}
                    className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-3.5 text-left transition-all ${
                      active
                        ? 'border-[#4F46E5] bg-[#4F46E5]/[0.12] ring-4 ring-[#4F46E5]/[0.12]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[#4F46E5]/50'
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

          {/* SESSION -------------------------------------------------------------- */}
          <SettingsCard title="Session" subtitle="Sign out on this device.">
            <button
              type="button"
              onClick={() => setModal({ kind: 'logout' })}
              className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[var(--danger-border)] bg-[var(--danger-bg)] px-5 py-3 text-sm font-semibold text-[var(--danger-text)] transition-colors hover:border-[#DC2626] hover:bg-[#DC2626] hover:text-white"
            >
              Log out
            </button>
          </SettingsCard>
        </motion.main>
      </div>

      <ConfirmationModal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        onConfirm={onModalConfirm}
        title={modal ? modalCopy[modal.kind].title : ''}
        message={modal ? modalCopy[modal.kind].message : ''}
      />
    </div>
  )
}

/** The folder → note directory: aligned rows of name / created / notes / storage. */
function AccountDirectory({ folders }: { folders: FolderStat[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const cols = 'grid grid-cols-[minmax(0,1fr)_92px_58px_84px] items-center gap-2'
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
      <div className={`${cols} bg-[var(--surface-input)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]`}>
        <span>Name</span>
        <span>Created</span>
        <span className="text-right">Notes</span>
        <span className="text-right">Storage</span>
      </div>
      {folders.map((f) => {
        const expandable = f.notes.length > 0
        const isOpen = !!open[f.id]
        return (
          <div key={f.id} className="border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => expandable && setOpen((o) => ({ ...o, [f.id]: !o[f.id] }))}
              className={`${cols} w-full px-4 py-3 text-left transition-colors ${expandable ? 'cursor-pointer hover:bg-[var(--text-primary)]/[0.03]' : 'cursor-default'}`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {expandable ? (
                  <ChevronRight size={14} className={`flex-shrink-0 text-[var(--text-secondary)] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                ) : (
                  <span className="w-[14px] flex-shrink-0" />
                )}
                <FolderOpen size={14} className="flex-shrink-0 text-[var(--text-secondary)]" />
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">{f.name}</span>
              </span>
              <span className="text-xs text-[var(--text-secondary)]">{fmtDate(f.createdAt)}</span>
              <span className="text-right text-xs text-[var(--text-secondary)]">{f.noteCount}</span>
              <span className="text-right text-xs font-medium text-[var(--text-primary)]">{formatBytes(f.storageBytes)}</span>
            </button>
            {isOpen && f.notes.map((n) => (
              <div key={n.id} className={`${cols} border-t border-[var(--border-subtle)] bg-[var(--surface-input)]/50 px-4 py-2.5`}>
                <span className="flex min-w-0 items-center gap-1.5 pl-[26px]">
                  <FileText size={13} className="flex-shrink-0 text-[var(--text-secondary)]" />
                  <span className="truncate text-[13px] text-[var(--text-primary)]">{n.title}</span>
                </span>
                <span className="text-xs text-[var(--text-secondary)]">{fmtDate(n.createdAt)}</span>
                <span className="text-right text-xs text-[var(--text-secondary)]">—</span>
                <span className="text-right text-xs text-[var(--text-secondary)]">{formatBytes(n.storageBytes)}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function ConnectedAccountRow({ provider, icon }: { provider: string; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-input)] px-4 py-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{provider}</p>
          <p className="text-xs text-[var(--text-secondary)]">Not connected</p>
        </div>
      </div>
      <button
        type="button"
        disabled
        title="Coming soon"
        className="cursor-not-allowed rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] opacity-70"
      >
        Soon
      </button>
    </div>
  )
}

/** Toggle switch row used for the notification preferences. */
function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-input)] px-4 py-3 text-left transition-colors hover:border-[#4F46E5]/40"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${checked ? 'bg-[#4F46E5]' : 'bg-[var(--border-subtle)]'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

/** Read-only stat tile for the account snapshot. */
function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-input)] p-4">
      <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-1.5 text-lg font-extrabold text-[var(--text-primary)]" style={{ fontFamily: bricolage }}>{value}</div>
    </div>
  )
}

function Spinner() {
  return <span className="h-[18px] w-[18px] animate-spin rounded-full border-[2.5px] border-white/30 border-t-white" />
}

/** White settings card matching the dashboard surface treatment. */
function SettingsCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface)] p-6 shadow-[0_18px_40px_-26px_rgba(27,19,38,0.22)]">
      <h2 className="m-0 text-[19px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]" style={{ fontFamily: bricolage }}>{title}</h2>
      <p className="mt-0.5 mb-4 text-[13px] text-[var(--text-secondary)]">{subtitle}</p>
      {children}
    </section>
  )
}

/** Labelled form field column with an optional inline error. */
function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</span>
      {children}
      {error && <span role="alert" className="text-xs font-medium text-[#B91C57]">{error}</span>}
    </label>
  )
}

// Short, human date for the account overview; '—' when unknown.
function fmtDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
