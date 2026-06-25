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

export const FOLDER_SWATCHES: Record<FolderColor, FolderSwatch> = {
  violet: {
    label: 'Lavender',
    swatch: '#8B5CF6',
    back: 'linear-gradient(to bottom right, #C4B5FD, #8B5CF6)',
    front: 'linear-gradient(to top, #8B5CF6, #A78BFA, #C4B5FD)',
    glyph: '#5B21B6',
    halo: 'rgba(139,92,246,0.30)',
    tint: 'rgba(139,92,246,0.12)',
  },
  coral: {
    label: 'Coral',
    swatch: '#FA7268',
    back: 'linear-gradient(to bottom right, #FFB3A7, #FA7268)',
    front: 'linear-gradient(to top, #FA7268, #FC8B82, #FFB3A7)',
    glyph: '#9B2C2C',
    halo: 'rgba(250,114,104,0.30)',
    tint: 'rgba(250,114,104,0.12)',
  },
  sky: {
    label: 'Ocean',
    swatch: '#3B82F6',
    back: 'linear-gradient(to bottom right, #93C5FD, #3B82F6)',
    front: 'linear-gradient(to top, #3B82F6, #60A5FA, #93C5FD)',
    glyph: '#1E3A8A',
    halo: 'rgba(59,130,246,0.30)',
    tint: 'rgba(59,130,246,0.12)',
  },
  olivine: {
    label: 'Mint',
    swatch: '#10B981',
    back: 'linear-gradient(to bottom right, #6EE7B7, #10B981)',
    front: 'linear-gradient(to top, #10B981, #34D399, #6EE7B7)',
    glyph: '#065F46',
    halo: 'rgba(16,185,129,0.30)',
    tint: 'rgba(16,185,129,0.12)',
  },
  honey: {
    label: 'Sunshine',
    swatch: '#F59E0B',
    back: 'linear-gradient(to bottom right, #FCD34D, #F59E0B)',
    front: 'linear-gradient(to top, #F59E0B, #FBBF24, #FCD34D)',
    glyph: '#92400E',
    halo: 'rgba(245,158,11,0.35)',
    tint: 'rgba(245,158,11,0.14)',
  },
  rose: {
    label: 'Berry',
    swatch: '#D946EF',
    back: 'linear-gradient(to bottom right, #F5D0FE, #D946EF)',
    front: 'linear-gradient(to top, #D946EF, #E879F9, #F5D0FE)',
    glyph: '#86198F',
    halo: 'rgba(217,70,239,0.30)',
    tint: 'rgba(217,70,239,0.12)',
  },
  indigo: {
    label: 'Indigo',
    swatch: '#4F46E5',
    back: 'linear-gradient(to bottom right, #A5B4FC, #4F46E5)',
    front: 'linear-gradient(to top, #4F46E5, #818CF8, #A5B4FC)',
    glyph: '#312E81',
    halo: 'rgba(79,70,229,0.30)',
    tint: 'rgba(79,70,229,0.12)',
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
    label: 'Teal',
    swatch: '#14B8A6',
    back: 'linear-gradient(to bottom right, #5EEAD4, #14B8A6)',
    front: 'linear-gradient(to top, #14B8A6, #2DD4BF, #5EEAD4)',
    glyph: '#115E59',
    halo: 'rgba(20,184,166,0.30)',
    tint: 'rgba(20,184,166,0.14)',
  },
  cerise: {
    label: 'Flamingo',
    swatch: '#EC4899',
    back: 'linear-gradient(to bottom right, #FBCFE8, #EC4899)',
    front: 'linear-gradient(to top, #EC4899, #F472B6, #FBCFE8)',
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
