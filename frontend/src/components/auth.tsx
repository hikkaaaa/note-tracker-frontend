import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { SiteHeader } from './SiteHeader'
import { PageBackdrop } from './PageBackdrop'

/* Shared building blocks for the Bloom-palette auth pages (Log In / Sign Up). */

export function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.6 6.2 29 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.6 15.3 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C33.6 6.2 29 4 24 4 16.3 4 9.7 8.3 6.3 14.1z" />
      <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5.1l-6-5.1c-2 1.5-4.4 2.3-7 2.3-5.3 0-9.7-3.3-11.3-8L6.2 32.8C9.5 39.5 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6 5.1c-.4.4 6.7-4.9 6.7-14.4 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function AppleG() {
  return (
    <svg width="16" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 0c.1 1.2-.4 2.4-1.1 3.3-.8.9-2 1.6-3.2 1.5-.1-1.2.5-2.4 1.2-3.2C14.2.7 15.4.1 16.5 0zm4 17.5c-.5 1.1-.7 1.6-1.4 2.6-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9s-2.4.9-3.7.9c-1.6 0-2.8-1.6-3.7-3C2 16.7 1.7 11.7 4 9c.9-1.1 2.2-1.7 3.5-1.7 1.4 0 2.3.8 3.5.8 1.1 0 1.8-.8 3.5-.8 1.3 0 2.6.7 3.5 1.8-3.1 1.7-2.6 6.2.5 8.4z" />
    </svg>
  )
}

function GitHubG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.2 1.9 1.2 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.9 1.2 1.9 1.2 3.2 0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  )
}

/** Shared input styling for the auth form fields. */
export const authInputClass =
  'w-full rounded-xl border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface-input)] px-4 py-3.5 text-[15px] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-secondary)]/60 focus:border-[#4F46E5] focus:bg-[var(--surface-input-focus)] focus:ring-4 focus:ring-[#4F46E5]/15'

interface AuthLayoutProps {
  /** Right-hand header pill. */
  cta: { label: string; to: string }
  /** Max width of the centered form column. */
  columnWidth?: number
  children: ReactNode
}

/** Page shell: warm backdrop, shared header, and a centered animated form column. */
export function AuthLayout({ cta, columnWidth = 440, children }: AuthLayoutProps) {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased"
      style={{ fontFamily: "'Poppins', ui-sans-serif, sans-serif" }}
    >
      <PageBackdrop />

      <div className="relative mx-auto max-w-[1440px] px-5 pb-[50px] pt-7 sm:px-10">
        <SiteHeader cta={cta} />

        <motion.main
          className="relative z-[2] flex flex-col items-center px-0 pb-[60px] pt-5"
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex w-full flex-col items-stretch gap-[18px]" style={{ maxWidth: columnWidth }}>
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  )
}

/** White form card with the soft gradient glow. */
export function FormCard({ children }: { children: ReactNode }) {
  return (
    <div
      data-cursor-block
      className="relative rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface)] p-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_30px_60px_-28px_rgba(79,70,229,0.35),0_8px_20px_-10px_rgba(27,19,38,0.12)]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-[-1px] -z-10 rounded-[25px] opacity-60 blur-[12px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(79,70,229,0.28), transparent 40%, rgba(67,56,202,0.20))',
        }}
      />
      {children}
    </div>
  )
}

/** Centered title + subtitle at the top of a form card. */
export function FormHead({ title, subtitle, titleSize = 32 }: { title: string; subtitle: string; titleSize?: number }) {
  return (
    <div className="mb-6 text-center">
      <h2
        className="m-0 mb-1.5 font-extrabold leading-tight tracking-[-0.03em]"
        style={{ fontFamily: "'Quicksand', sans-serif", fontSize: titleSize }}
      >
        {title}
      </h2>
      <p className="m-0 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  )
}

/** Google / Apple / GitHub buttons (decorative). */
export function SocialRow() {
  const socials = [
    { label: 'Google', icon: <GoogleG /> },
    { label: 'Apple', icon: <AppleG /> },
    { label: 'GitHub', icon: <GitHubG /> },
  ]
  return (
    <div className="mb-5 grid grid-cols-3 gap-2">
      {socials.map((s) => (
        <button
          key={s.label}
          type="button"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-input)] px-2 py-3 text-[13px] font-semibold text-[var(--text-primary)] transition-all hover:-translate-y-px hover:bg-[var(--surface)]"
        >
          {s.icon} <span>{s.label}</span>
        </button>
      ))}
    </div>
  )
}

export function AuthDivider() {
  return (
    <div
      className="mb-[18px] mt-1 flex items-center gap-3 text-[12px] uppercase tracking-[0.1em] text-[var(--text-secondary)]"
         >
      <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      or with email
      <span className="h-px flex-1 bg-[var(--border-subtle)]" />
    </div>
  )
}

/** Custom checkbox visual (the controlling <input> lives in the caller's <label>). */
export function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      className={`grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-all ${
        checked ? 'border-[#4F46E5] bg-[#4F46E5]' : 'border-[var(--border-subtle)] bg-[var(--surface)]'
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={checked ? '' : 'opacity-0'}
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  )
}

/** Post-submit success state with the pop-in ring and "loading" bar. */
export function AuthSuccess({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 py-[30px] text-center">
      <motion.div
        className="grid h-[72px] w-[72px] place-items-center rounded-full bg-[#4F46E5] shadow-[0_0_0_8px_rgba(79,70,229,0.16)]"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>
      <h3
        className="m-0 mt-1 text-[28px] font-extrabold tracking-[-0.02em]"
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        {title}
      </h3>
      <p className="m-0 text-sm text-[var(--text-secondary)]">{subtitle}</p>
      <div className="mt-3 h-1 w-[200px] overflow-hidden rounded-full bg-[#4F46E5]/10">
        <span
          className="block h-full w-1/2 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #6366F1, #4F46E5, #4338CA)',
            animation: 'loadbar 1.4s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  )
}
