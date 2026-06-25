import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, X } from 'lucide-react'

const mono = "'Geist Mono', monospace"
const MAX_SECONDS = 99 * 3600 + 59 * 60 + 59

// Format seconds as M:SS, or H:MM:SS once we cross an hour.
function fmt(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Google-style entry: a string of up to 6 digits read right-to-left as HH MM SS.
// e.g. "130" -> 00:01:30 -> 90s.
function digitsToSeconds(d: string): number {
  const padded = d.padStart(6, '0')
  const hh = parseInt(padded.slice(0, 2), 10)
  const mm = parseInt(padded.slice(2, 4), 10)
  const ss = parseInt(padded.slice(4, 6), 10)
  return hh * 3600 + mm * 60 + ss
}

function secondsToDigits(total: number): string {
  const s = Math.max(0, Math.min(Math.floor(total), MAX_SECONDS))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}${String(ss).padStart(2, '0')}`.replace(/^0+/, '')
}

/**
 * A small, self-contained countdown timer. Type a duration (digits shift in from the
 * right like the Google timer), press play, and a gentle chime plays when it reaches
 * zero. The chime is synthesized with the Web Audio API so there's no audio asset to
 * ship — the AudioContext is created on the play tap (a user gesture) so the end-of-
 * countdown sound is allowed to play even though it fires later.
 */
// Read a persisted duration (seconds) out of a block's content JSON, if any.
function secondsFromContent(content?: string): number {
  if (!content) return 0
  try {
    const n = Number(JSON.parse(content)?.seconds)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function NoteTimer({
  accent,
  accentTint,
  onClose,
  content,
  onChange,
}: {
  accent: string
  accentTint: string
  // Optional: when omitted (e.g. embedded as a note block, deleted via the block menu)
  // the close button is hidden.
  onClose?: () => void
  // Optional persistence hooks. As a note block, the configured duration is seeded from
  // `content` and written back through `onChange` so it survives reloads. Each block
  // instance owns its own React state, so multiple timers never share a countdown.
  content?: string
  onChange?: (content: string) => void
}) {
  const [digits, setDigits] = useState(() => {
    const secs = secondsFromContent(content)
    return secs > 0 ? secondsToDigits(secs) : '500' // default 5:00
  })

  // Persist a committed duration (in seconds) back to the block content, if wired up.
  const persistSeconds = (secs: number) => onChange?.(JSON.stringify({ seconds: secs }))
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [editing, setEditing] = useState(true)
  const [finished, setFinished] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const endAtRef = useRef(0)

  const seconds = editing ? digitsToSeconds(digits) : remaining

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      if (Ctx) audioCtxRef.current = new Ctx()
    }
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }, [])

  // A soft ascending three-note arpeggio (A major-ish). Quiet, sine, quick decay —
  // pleasant rather than jarring.
  const playChime = useCallback(() => {
    const ctx = ensureAudio()
    if (!ctx) return
    const now = ctx.currentTime
    ;[880, 1108.73, 1318.51].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = now + i * 0.18
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.16, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.9)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 1)
    })
  }, [ensureAudio])

  // The ticking loop. Anchored to a wall-clock end time so it stays accurate even if the
  // tab throttles the interval. Depends only on `running` so it isn't torn down each tick.
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const left = Math.round((endAtRef.current - Date.now()) / 1000)
      if (left <= 0) {
        setRemaining(0)
        setRunning(false)
        setFinished(true)
        playChime()
      } else {
        setRemaining(left)
      }
    }, 250)
    return () => clearInterval(id)
  }, [running, playChime])

  useEffect(() => {
    return () => { audioCtxRef.current?.close().catch(() => {}) }
  }, [])

  const start = () => {
    const secs = editing ? digitsToSeconds(digits) : remaining
    if (secs <= 0) return
    persistSeconds(secs)
    ensureAudio() // unlock audio within this user gesture
    setRemaining(secs)
    endAtRef.current = Date.now() + secs * 1000
    setEditing(false)
    setFinished(false)
    setRunning(true)
  }

  const pause = () => {
    setRunning(false)
  }

  const reset = () => {
    setRunning(false)
    setFinished(false)
    setEditing(true)
    setRemaining(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const bump = (delta: number) => {
    const base = editing ? digitsToSeconds(digits) : remaining
    persistSeconds(base + delta)
    setDigits(secondsToDigits(base + delta))
    setRunning(false)
    setFinished(false)
    setEditing(true)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (running) return
    // Let browser/OS shortcuts and focus navigation through untouched.
    if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Tab') return
    // Everything else is handled manually so the native field never inserts text — that's
    // what gives the Google-style "digits shift in from the right" behaviour.
    e.preventDefault()
    if (e.key >= '0' && e.key <= '9') {
      setEditing(true)
      setFinished(false)
      setDigits((prev) => (prev + e.key).replace(/^0+/, '').slice(-6))
    } else if (e.key === 'Backspace') {
      setEditing(true)
      setDigits((prev) => prev.slice(0, -1))
    } else if (e.key === 'Enter') {
      start()
    }
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div
      className={`inline-flex select-none items-center gap-1.5 rounded-2xl border bg-[var(--surface)] py-1.5 pl-3 pr-1.5 shadow-[0_8px_22px_-14px_rgba(27,19,38,0.3)] transition-shadow ${finished ? 'animate-pulse' : ''}`}
      style={{ borderColor: finished ? accent : 'rgba(27,19,38,0.1)' }}
    >
      <input
        ref={inputRef}
        inputMode="numeric"
        value={fmt(seconds)}
        onChange={() => { /* value is driven by onKeyDown digit handling */ }}
        onKeyDown={onKeyDown}
        onFocus={() => {
          if (running) return
          // Seed the digit buffer from a paused value so editing continues from where it
          // stopped rather than snapping back to the originally-entered duration.
          if (!editing && remaining > 0) setDigits(secondsToDigits(remaining))
          setEditing(true)
          inputRef.current?.select()
        }}
        disabled={running}
        aria-label="Timer duration"
        className="w-[88px] cursor-text bg-transparent text-center text-[19px] font-bold tracking-[0.02em] outline-none disabled:cursor-default"
        style={{
          fontFamily: mono,
          color: finished ? accent : 'var(--text-primary)',
          caretColor: accent,
        }}
      />

      {running ? (
        <button
          onClick={pause}
          aria-label="Pause"
          className="grid h-8 w-8 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px"
          style={{ background: accent }}
        >
          <Pause className="h-4 w-4" fill="currentColor" />
        </button>
      ) : (
        <button
          onClick={start}
          aria-label="Start"
          disabled={seconds <= 0}
          className="grid h-8 w-8 place-items-center rounded-xl text-white transition-transform hover:-translate-y-px disabled:opacity-40"
          style={{ background: accent }}
        >
          <Play className="h-4 w-4 translate-x-px" fill="currentColor" />
        </button>
      )}

      <button
        onClick={reset}
        aria-label="Reset"
        className="grid h-8 w-8 place-items-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
      >
        <RotateCcw className="h-[15px] w-[15px]" />
      </button>

      {/* Quick-add chips, only useful while setting up */}
      {!running && (
        <div className="flex items-center gap-1 pl-0.5">
          {[
            { label: '+1', delta: 60 },
            { label: '+5', delta: 300 },
          ].map((q) => (
            <button
              key={q.label}
              onClick={() => bump(q.delta)}
              className="rounded-lg px-2 py-1.5 text-[12px] font-bold transition-colors hover:opacity-80"
              style={{ background: accentTint, color: accent }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close timer"
          className="ml-0.5 grid h-8 w-8 place-items-center rounded-xl text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
        >
          <X className="h-[15px] w-[15px]" />
        </button>
      )}
    </div>
  )
}
