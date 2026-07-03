// Folder/note/section *data* now lives in the backend (see lib/workspace.ts), scoped to
// the authenticated user. What remains here is browser-local, per-user state: the note
// editor's offline section buffer and the cross-note block clipboard, plus the shared
// folder-color types. Nothing in this module is a source of truth for your notes, so it
// can never silently lose them the way the old localStorage workspace could.
import { currentUserScope } from './authToken'

// "Bright & Delightful" palette from the Bloom Folders design.
export type FolderColor =
  | 'violet'
  | 'coral'
  | 'sky'
  | 'olivine'
  | 'honey'
  | 'rose'
  | 'indigo'
  | 'fawn'
  | 'maize'
  | 'cerise'

// Older saved folders (and the backend's first rows) used a 5-color palette. Map those
// to the closest new hue so existing data keeps rendering after the redesign.
const LEGACY_COLOR_MAP: Record<string, FolderColor> = {
  purple: 'violet',
  pink: 'cerise',
  blue: 'sky',
  red: 'coral',
  green: 'olivine',
}

const VALID_COLORS: FolderColor[] = [
  'violet', 'coral', 'sky', 'olivine', 'honey', 'rose', 'indigo', 'fawn', 'maize', 'cerise',
]

export function normalizeFolderColor(value: string | undefined): FolderColor {
  if (value && (VALID_COLORS as string[]).includes(value)) return value as FolderColor
  if (value && LEGACY_COLOR_MAP[value]) return LEGACY_COLOR_MAP[value]
  return 'violet'
}

export interface LocalNote {
  id: number
  title: string
  purpose?: string
  created_at: string
  // ISO timestamp of the last edit (title/purpose/flags or any block change). Empty when
  // the backend has no value. Drives the folder-detail "Recent" filter.
  updated_at: string
  // Two independent organizational marks (see backend Note model).
  starred: boolean
  pinned: boolean
  // True when reached through an accepted share — the note renders read-only. Optional so
  // owned notes (the common case) omit it.
  readOnly?: boolean
  // Notes have no color of their own — they always inherit their parent folder's color.
}

export interface LocalFolder {
  id: number
  name: string
  purpose: string
  color: FolderColor
  pinned: boolean
  archived: boolean
  // Newest activity across the folder + its notes (ISO). Drives the dashboard "Recent"
  // filter. Empty when unknown.
  lastActivity: string
  notes: LocalNote[]
  // Set on folders reached through an accepted share: read-only browse, plus who shared it.
  readOnly?: boolean
  sharedBy?: string
  shareId?: number
}

export interface LocalSection {
  id: number
  type: 'text' | 'checklist' | 'tickbox' | 'list' | 'table' | 'code' | 'image' | 'timer' | 'calendar'
  content: string
  title?: string | null
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const stored = window.localStorage.getItem(key)
  if (!stored) return fallback
  try {
    return JSON.parse(stored) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

// --- NOTE EDITOR OFFLINE SECTION BUFFER ---
// The editor mirrors section edits here so an in-progress note survives a reload even if
// a save hasn't reached the backend yet. Keyed by user scope + note id so accounts can't
// see each other's buffered content on a shared browser.
function sectionsKeyFor(noteId: number) {
  return `note-tracker.${currentUserScope()}.local-sections.${noteId}`
}

export function getLocalSections(noteId: number): LocalSection[] {
  return readJson<LocalSection[]>(sectionsKeyFor(noteId), [])
}

export function saveLocalSections(noteId: number, sections: LocalSection[]) {
  writeJson(sectionsKeyFor(noteId), sections)
}

// --- BLOCK CLIPBOARD ---
// A copied block is kept in localStorage (not just React state) so it can be pasted into
// any note, and survives navigation and page reloads. User-scoped so a copied block from
// one account isn't pasteable by another on the same browser. The key is exported (as a
// getter) so the editor can react to cross-tab `storage` events.
export function clipboardKeyFor(): string {
  return `note-tracker.${currentUserScope()}.clipboard`
}

export interface CopiedBlock {
  type: 'text' | 'checklist' | 'tickbox' | 'list' | 'table' | 'code' | 'image' | 'timer' | 'calendar'
  content: string
  title?: string | null
}

export function getCopiedBlock(): CopiedBlock | null {
  return readJson<CopiedBlock | null>(clipboardKeyFor(), null)
}

export function saveCopiedBlock(block: CopiedBlock) {
  writeJson(clipboardKeyFor(), block)
}
