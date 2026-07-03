import { Link } from 'react-router-dom'
import { ArrowUpRight } from './icons'
import { BrandLogo } from './BrandLogo'

interface SiteHeaderProps {
  /** Right-hand pill CTA. */
  cta: { label: string; to: string }
  /** Render the "Home" nav item as the active (filled) pill. */
  homeActive?: boolean
}

const navLink =
  'inline-flex items-center gap-1.5 rounded-full px-[18px] py-2.5 text-sm font-medium text-[var(--text-primary)] no-underline transition-colors hover:bg-[#4F46E5]/[0.08]'

export function SiteHeader({ cta, homeActive = false }: SiteHeaderProps) {
  return (
    <header className="relative z-[5] mb-[60px] grid grid-cols-[1fr_auto_1fr] items-center gap-6">
      <Link to="/" className="flex items-center gap-2 text-[var(--text-primary)] no-underline">
        <BrandLogo size={44} />
        <span className="text-[18px] font-bold leading-none tracking-[-0.01em]">
          hixie<span className="text-[#F97316]">.</span>
        </span>
      </Link>

      <nav
        data-cursor-block
        // Temporarily hidden: "Home" is the only nav item for now. visibility:hidden keeps
        // the element (and its center grid column) in place so nothing shifts — remove this
        // style to bring the nav back once there are more buttons to show.
        style={{ visibility: 'hidden' }}
        className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] p-1.5 shadow-[0_12px_30px_-18px_rgba(27,19,38,0.18)] lg:flex lg:gap-0.5"
      >
        {homeActive ? (
          <span className="cursor-default rounded-full bg-[var(--btn-primary-bg)] px-[18px] py-2.5 text-sm font-medium text-[var(--btn-primary-text)]">
            Home
          </span>
        ) : (
          <Link to="/" className={navLink}>
            Home
          </Link>
        )}
      </nav>

      <Link
        to={cta.to}
        className="inline-flex items-center gap-2 justify-self-end rounded-full bg-[var(--btn-primary-bg)] px-[22px] py-3.5 text-sm font-semibold text-[var(--btn-primary-text)] no-underline transition-transform hover:-translate-y-px"
      >
        {cta.label} <ArrowUpRight size={14} />
      </Link>
    </header>
  )
}
