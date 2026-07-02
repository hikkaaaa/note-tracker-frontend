import { useTheme } from '../lib/themeContext'

/* The hixie brand mark. The source PNGs are full-color octopus glyphs on a transparent
   canvas with generous built-in padding. We scale up modestly to crop some of that padding
   so the octopus sits optically centered in its footprint without losing its tentacles.
   The dark-theme variant (logo_hixie_dark.png) swaps in automatically so the glyph stays
   legible on the dark background. Sized via the `size` prop (px). */
export function BrandLogo({ size = 44, className = '' }: { size?: number; className?: string }) {
  const { theme } = useTheme()
  const src = theme === 'dark' ? '/logo_hixie_dark.png' : '/logo_hixie.png'
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={src} alt="hixie logo" className="h-full w-full scale-[0.92] object-contain" />
    </span>
  )
}
