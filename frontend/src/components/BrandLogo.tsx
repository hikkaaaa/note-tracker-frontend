/* The hixie brand mark. The source PNG (public/logo_hixie.png) is a full-color
   octopus glyph on a transparent canvas with generous built-in padding, so it renders
   with no background (per design) and is scaled up to crop that padding and fill the
   footprint. Sized via the `size` prop (px). */
export function BrandLogo({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <img src="/logo_hixie.png" alt="hixie logo" className="h-full w-full scale-[1.7] object-contain" />
    </span>
  )
}
