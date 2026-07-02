import type { FolderColor } from './localWorkspace'

// Visual definition for each folder color in the "Bright & Delightful" palette.
// `back`/`front` are the two gradient layers of a folder card, `glyph` is the
// deep accent used for icons, and `halo` tints the hover shadow + delete chip.
export interface FolderSwatch {
  label: string
  swatch: string
  back: string
  front: string
  glyph: string
  halo: string
  // soft ~12% tint of the swatch — used for chips, focus rings, hover washes
  tint: string
}

// A 10-stop palette spaced evenly around the wheel so no two swatches read as "the same
// color" — in particular green (olivine) and cyan (maize) are now clearly distinct hues.
export const FOLDER_SWATCHES: Record<FolderColor, FolderSwatch> = {
  violet: {
    label: 'Violet',
    swatch: '#8B5CF6',
    back: 'linear-gradient(to bottom right, #C4B5FD, #8B5CF6)',
    front: 'linear-gradient(to top, #8B5CF6, #A78BFA, #C4B5FD)',
    glyph: '#5B21B6',
    halo: 'rgba(139,92,246,0.30)',
    tint: 'rgba(139,92,246,0.12)',
  },
  coral: {
    label: 'Coral',
    swatch: '#F43F5E',
    back: 'linear-gradient(to bottom right, #FDA4AF, #F43F5E)',
    front: 'linear-gradient(to top, #F43F5E, #FB7185, #FDA4AF)',
    glyph: '#9F1239',
    halo: 'rgba(244,63,94,0.30)',
    tint: 'rgba(244,63,94,0.12)',
  },
  sky: {
    label: 'Sky',
    swatch: '#3B82F6',
    back: 'linear-gradient(to bottom right, #93C5FD, #3B82F6)',
    front: 'linear-gradient(to top, #3B82F6, #60A5FA, #93C5FD)',
    glyph: '#1E3A8A',
    halo: 'rgba(59,130,246,0.30)',
    tint: 'rgba(59,130,246,0.12)',
  },
  olivine: {
    label: 'Green',
    swatch: '#22C55E',
    back: 'linear-gradient(to bottom right, #86EFAC, #22C55E)',
    front: 'linear-gradient(to top, #22C55E, #4ADE80, #86EFAC)',
    glyph: '#15803D',
    halo: 'rgba(34,197,94,0.30)',
    tint: 'rgba(34,197,94,0.12)',
  },
  honey: {
    label: 'Amber',
    swatch: '#F59E0B',
    back: 'linear-gradient(to bottom right, #FCD34D, #F59E0B)',
    front: 'linear-gradient(to top, #F59E0B, #FBBF24, #FCD34D)',
    glyph: '#92400E',
    halo: 'rgba(245,158,11,0.35)',
    tint: 'rgba(245,158,11,0.14)',
  },
  rose: {
    label: 'Fuchsia',
    swatch: '#D946EF',
    back: 'linear-gradient(to bottom right, #F0ABFC, #D946EF)',
    front: 'linear-gradient(to top, #D946EF, #E879F9, #F0ABFC)',
    glyph: '#86198F',
    halo: 'rgba(217,70,239,0.30)',
    tint: 'rgba(217,70,239,0.12)',
  },
  indigo: {
    label: 'Indigo',
    swatch: '#6366F1',
    back: 'linear-gradient(to bottom right, #A5B4FC, #6366F1)',
    front: 'linear-gradient(to top, #6366F1, #818CF8, #A5B4FC)',
    glyph: '#312E81',
    halo: 'rgba(99,102,241,0.30)',
    tint: 'rgba(99,102,241,0.12)',
  },
  fawn: {
    label: 'Tangerine',
    swatch: '#F97316',
    back: 'linear-gradient(to bottom right, #FDBA74, #F97316)',
    front: 'linear-gradient(to top, #F97316, #FB923C, #FDBA74)',
    glyph: '#9A3412',
    halo: 'rgba(249,115,22,0.30)',
    tint: 'rgba(249,115,22,0.12)',
  },
  maize: {
    label: 'Cyan',
    swatch: '#06B6D4',
    back: 'linear-gradient(to bottom right, #67E8F9, #06B6D4)',
    front: 'linear-gradient(to top, #06B6D4, #22D3EE, #67E8F9)',
    glyph: '#155E75',
    halo: 'rgba(6,182,212,0.30)',
    tint: 'rgba(6,182,212,0.14)',
  },
  cerise: {
    label: 'Pink',
    swatch: '#EC4899',
    back: 'linear-gradient(to bottom right, #F9A8D4, #EC4899)',
    front: 'linear-gradient(to top, #EC4899, #F472B6, #F9A8D4)',
    glyph: '#9D174D',
    halo: 'rgba(236,72,153,0.30)',
    tint: 'rgba(236,72,153,0.12)',
  },
}

// Order the swatches appear in the color picker (matches the design mock).
export const COLOR_ORDER: FolderColor[] = [
  'violet', 'coral', 'sky', 'olivine', 'honey', 'rose', 'indigo', 'fawn', 'maize', 'cerise',
]

export function getSwatch(color: FolderColor): FolderSwatch {
  return FOLDER_SWATCHES[color] ?? FOLDER_SWATCHES.violet
}
