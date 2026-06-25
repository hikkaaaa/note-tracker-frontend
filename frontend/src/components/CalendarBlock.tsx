import { useState } from 'react'
import { CalendarDays, CalendarRange, CalendarClock, LayoutGrid, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'

/* ------------------------------------------------------------------ *
 * CalendarBlock — a polymorphic planning widget dropped from the Tools
 * panel. A freshly-dropped block has no view yet and shows a selector;
 * picking Day / Week / Month / Year mutates it into that planner. ALL
 * state (chosen view, target dates, every typed value) lives in the
 * block's own content JSON, so each instance is isolated and survives
 * reloads via the standard onChange persistence hook. Widths are fluid
 * (flex-wrap + overflow-x-auto) so a calendar dropped into a multi-
 * column row scales down instead of breaking the grid.
 * ------------------------------------------------------------------ */

export type CalView = 'day' | 'week' | 'month' | 'year'

interface CalState {
  view: CalView | null
  day: { date: string; slots: Record<string, string> }        // key: hour "0".."23"
  week: { start: string; span: number; from: number; to: number; slots: Record<string, string> } // key `${iso}@${hour}`
  month: { y: number; m: number; cells: Record<string, string> } // key: ISO date
  year: { y: number; notes: Record<string, string> }            // key: month index "0".."11"
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1) }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const startOfWeek = (d: Date) => addDays(d, -d.getDay())
const hourLabel = (h: number) => `${pad(h)}:00`
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
// Leading-blank-padded list of day numbers (null = blank) for a month grid.
const monthCells = (y: number, m: number) => {
  const lead = new Date(y, m, 1).getDay()
  const out: (number | null)[] = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= daysInMonth(y, m); d++) out.push(d)
  return out
}

function defaultState(): CalState {
  const now = new Date()
  return {
    view: null,
    day: { date: toISO(now), slots: {} },
    week: { start: toISO(startOfWeek(now)), span: 7, from: 8, to: 20, slots: {} },
    month: { y: now.getFullYear(), m: now.getMonth(), cells: {} },
    year: { y: now.getFullYear(), notes: {} },
  }
}

// Parse persisted content, deep-merging over defaults so older/partial blobs never crash.
function parse(content?: string): CalState {
  const base = defaultState()
  if (!content) return base
  try {
    const p = JSON.parse(content)
    return {
      view: p.view ?? null,
      day: { ...base.day, ...p.day, slots: { ...(p.day?.slots ?? {}) } },
      week: { ...base.week, ...p.week, slots: { ...(p.week?.slots ?? {}) } },
      month: { ...base.month, ...p.month, cells: { ...(p.month?.cells ?? {}) } },
      year: { ...base.year, notes: { ...(p.year?.notes ?? {}) } },
    }
  } catch {
    return base
  }
}

const VIEW_DEFS: { view: CalView; title: string; blurb: string; icon: React.ElementType }[] = [
  { view: 'day', title: 'Day Planner', blurb: 'A 24-hour schedule, split AM / PM', icon: CalendarClock },
  { view: 'week', title: 'Week Planner', blurb: 'A multi-day grid with hourly slots', icon: CalendarRange },
  { view: 'month', title: 'Month Planner', blurb: 'A 7-column grid you can write into', icon: CalendarDays },
  { view: 'year', title: 'Year Planner', blurb: '12 mini-months + milestone pins', icon: LayoutGrid },
]

export function CalendarBlock({
  accent,
  accentTint,
  content,
  onChange,
}: {
  accent: string
  accentTint: string
  content?: string
  onChange?: (content: string) => void
}) {
  const [state, setState] = useState<CalState>(() => parse(content))
  const commit = (next: CalState) => { setState(next); onChange?.(JSON.stringify(next)) }
  const todayISO = toISO(new Date())

  const fieldCls = 'w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50'
  const chip = 'inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-input)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-primary)]'

  /* ---- config selector (no view chosen yet) ---- */
  if (!state.view) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-4" style={{ background: accentTint }}>
        <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)]">
          <CalendarDays className="h-4 w-4" style={{ color: accent }} />
          Pick a planner layout
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {VIEW_DEFS.map((v) => (
            <button
              key={v.view}
              type="button"
              onClick={() => commit({ ...state, view: v.view })}
              className="group/cv flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-3 text-left transition-all hover:-translate-y-px"
              style={{ ['--cv' as string]: accent } as React.CSSProperties}
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px]" style={{ background: accentTint, color: accent }}>
                <v.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-[var(--text-primary)]">{v.title}</span>
                <span className="block text-[11px] leading-tight text-[var(--text-secondary)]">{v.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ---- shared header (current view + reconfigure) ---- */
  const header = (extra?: React.ReactNode) => (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold" style={{ background: accentTint, color: accent }}>
        <CalendarDays className="h-3.5 w-3.5" />
        {VIEW_DEFS.find((v) => v.view === state.view)?.title}
      </span>
      {extra}
      <button
        type="button"
        onClick={() => commit({ ...state, view: null })}
        title="Change planner type"
        className="note-ghost-btn ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)]"
      >
        <Settings2 className="h-3.5 w-3.5" /> Change
      </button>
    </div>
  )

  /* =================================================================== *
   *  DAY VIEW — 24h split into AM (0–11) and PM (12–23) columns.
   * =================================================================== */
  if (state.view === 'day') {
    const { day } = state
    const setSlot = (h: number, v: string) => commit({ ...state, day: { ...day, slots: { ...day.slots, [h]: v } } })
    const col = (label: string, hours: number[]) => (
      <div className="min-w-[220px] flex-1">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>{label}</div>
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)]">
          {hours.map((h, i) => (
            <div key={h} className={`flex items-center gap-2 px-2.5 py-1 ${i ? 'border-t border-[var(--border-subtle)]' : ''}`}>
              <span className="w-[44px] flex-shrink-0 text-[11px] font-semibold tabular-nums text-[var(--text-secondary)]">{hourLabel(h)}</span>
              <input value={day.slots[h] ?? ''} onChange={(e) => setSlot(h, e.target.value)} placeholder="—" className={fieldCls} />
            </div>
          ))}
        </div>
      </div>
    )
    return (
      <div>
        {header(
          <label className={chip}>
            <CalendarClock className="h-3.5 w-3.5" style={{ color: accent }} />
            <input
              type="date"
              value={day.date}
              onChange={(e) => commit({ ...state, day: { ...day, date: e.target.value } })}
              className="bg-transparent text-[12px] font-semibold text-[var(--text-primary)] outline-none [color-scheme:light] dark:[color-scheme:dark]"
            />
            <span className="text-[var(--text-secondary)]">{WEEKDAYS[fromISO(day.date).getDay()]}</span>
          </label>,
        )}
        <div className="flex flex-wrap gap-4">
          {col('Morning · AM', Array.from({ length: 12 }, (_, i) => i))}
          {col('Afternoon · PM', Array.from({ length: 12 }, (_, i) => i + 12))}
        </div>
      </div>
    )
  }

  /* =================================================================== *
   *  WEEK VIEW — N consecutive days × an hour range, as one aligned grid.
   * =================================================================== */
  if (state.view === 'week') {
    const { week } = state
    const days = Array.from({ length: week.span }, (_, i) => addDays(fromISO(week.start), i))
    const hours = Array.from({ length: Math.max(0, week.to - week.from + 1) }, (_, i) => week.from + i)
    const setSlot = (iso: string, h: number, v: string) =>
      commit({ ...state, week: { ...week, slots: { ...week.slots, [`${iso}@${h}`]: v } } })
    return (
      <div>
        {header(
          <>
            <label className={chip}>
              Start
              <input type="date" value={week.start} onChange={(e) => commit({ ...state, week: { ...week, start: e.target.value } })}
                className="bg-transparent text-[12px] font-semibold text-[var(--text-primary)] outline-none [color-scheme:light] dark:[color-scheme:dark]" />
            </label>
            <label className={chip}>
              Days
              <input type="range" min={1} max={7} value={week.span} onChange={(e) => commit({ ...state, week: { ...week, span: Number(e.target.value) } })} style={{ accentColor: accent }} />
              <span className="w-3 tabular-nums" style={{ color: accent }}>{week.span}</span>
            </label>
            <label className={chip}>
              Hours
              <input type="number" min={0} max={23} value={week.from} onChange={(e) => commit({ ...state, week: { ...week, from: Math.min(23, Math.max(0, Number(e.target.value))) } })} className="w-9 bg-transparent text-center outline-none" />
              <span className="text-[var(--text-secondary)]">–</span>
              <input type="number" min={0} max={23} value={week.to} onChange={(e) => commit({ ...state, week: { ...week, to: Math.min(23, Math.max(0, Number(e.target.value))) } })} className="w-9 bg-transparent text-center outline-none" />
            </label>
          </>,
        )}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <div className="grid" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(120px, 1fr))`, minWidth: 52 + days.length * 120 }}>
            <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-input)]" />
            {days.map((d) => {
              const isToday = toISO(d) === todayISO
              return (
                <div key={toISO(d)} className="border-b border-l border-[var(--border-subtle)] bg-[var(--surface-input)] px-2 py-1.5 text-center">
                  <div className="text-[11px] font-bold" style={isToday ? { color: accent } : { color: 'var(--text-primary)' }}>{WEEKDAYS[d.getDay()]}</div>
                  <div className="text-[10px] text-[var(--text-secondary)]">{d.getMonth() + 1}/{d.getDate()}</div>
                </div>
              )
            })}
            {hours.map((h) => (
              <Row key={h} hour={h} days={days} week={week} setSlot={setSlot} />
            ))}
          </div>
        </div>
        {hours.length === 0 && <p className="mt-2 text-[12px] text-[var(--text-secondary)]">Set the start hour below the end hour to show time slots.</p>}
      </div>
    )
  }

  /* =================================================================== *
   *  MONTH VIEW — classic 7-column grid; type reminders into any cell.
   * =================================================================== */
  if (state.view === 'month') {
    const { month } = state
    const step = (delta: number) => {
      let m = month.m + delta, y = month.y
      if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
      commit({ ...state, month: { ...month, y, m } })
    }
    const setCell = (iso: string, v: string) => commit({ ...state, month: { ...month, cells: { ...month.cells, [iso]: v } } })
    return (
      <div>
        {header(
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-0.5">
            <button type="button" onClick={() => step(-1)} className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ChevronLeft className="h-4 w-4" /></button>
            <span className="px-1.5 text-[12px] font-bold text-[var(--text-primary)]">{MONTHS[month.m]} {month.y}</span>
            <button type="button" onClick={() => step(1)} className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ChevronRight className="h-4 w-4" /></button>
          </span>,
        )}
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((w) => (
                <div key={w} className="px-2 py-1 text-center text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)]">{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-[var(--border-subtle)]">
              {monthCells(month.y, month.m).map((d, i) => {
                const iso = d ? `${month.y}-${pad(month.m + 1)}-${pad(d)}` : ''
                const isToday = iso === todayISO
                return (
                  <div key={i} className="min-h-[68px] border-b border-l border-[var(--border-subtle)] p-1 first:border-l-0 [&:nth-child(7n+1)]:border-l-0" style={d ? undefined : { background: 'var(--surface-input)' }}>
                    {d && (
                      <>
                        <div className="mb-0.5 flex justify-end">
                          <span className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1 text-[11px] font-bold ${isToday ? 'text-white' : 'text-[var(--text-secondary)]'}`} style={isToday ? { background: accent } : undefined}>{d}</span>
                        </div>
                        <textarea
                          value={month.cells[iso] ?? ''}
                          onChange={(e) => setCell(iso, e.target.value)}
                          rows={2}
                          placeholder="…"
                          className="w-full resize-none bg-transparent text-[11px] leading-snug text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/40"
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* =================================================================== *
   *  YEAR VIEW — 12 mini-month thumbnails, each with a milestone pin.
   * =================================================================== */
  const { year } = state
  const stepY = (delta: number) => commit({ ...state, year: { ...year, y: year.y + delta } })
  const setNote = (m: number, v: string) => commit({ ...state, year: { ...year, notes: { ...year.notes, [m]: v } } })
  return (
    <div>
      {header(
        <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-0.5">
          <button type="button" onClick={() => stepY(-1)} className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ChevronLeft className="h-4 w-4" /></button>
          <span className="px-1.5 text-[12px] font-bold text-[var(--text-primary)]">{year.y}</span>
          <button type="button" onClick={() => stepY(1)} className="grid h-6 w-6 place-items-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ChevronRight className="h-4 w-4" /></button>
        </span>,
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {MONTHS.map((name, m) => (
          <div key={m} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
            <div className="mb-1.5 text-[12px] font-bold text-[var(--text-primary)]">{name}</div>
            {/* non-interactive mini month */}
            <div className="grid grid-cols-7 gap-[1px]">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[8px] font-semibold text-[var(--text-secondary)]/70">{w[0]}</div>
              ))}
              {monthCells(year.y, m).map((d, i) => {
                const isToday = d != null && `${year.y}-${pad(m + 1)}-${pad(d)}` === todayISO
                return (
                  <div key={i} className="grid aspect-square place-items-center text-[8px] tabular-nums" style={isToday ? { background: accent, color: '#fff', borderRadius: 3 } : { color: d ? 'var(--text-secondary)' : 'transparent' }}>
                    {d ?? '·'}
                  </div>
                )
              })}
            </div>
            <input
              value={year.notes[m] ?? ''}
              onChange={(e) => setNote(m, e.target.value)}
              placeholder="Pin a goal…"
              className="mt-2 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-input)] px-2 py-1 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/50 focus:border-[color:var(--cal-accent)]"
              style={{ ['--cal-accent' as string]: accent } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* One hour-row of the week grid: a time label + one input per day. Split out so each
   row stays light and the typed value reads from the parent's slots map. */
function Row({ hour, days, week, setSlot }: { hour: number; days: Date[]; week: CalState['week']; setSlot: (iso: string, h: number, v: string) => void }) {
  return (
    <>
      <div className="flex items-start justify-end border-t border-[var(--border-subtle)] px-1.5 py-1 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)]">{hourLabel(hour)}</div>
      {days.map((d) => {
        const iso = toISO(d)
        return (
          <input
            key={iso}
            value={week.slots[`${iso}@${hour}`] ?? ''}
            onChange={(e) => setSlot(iso, hour, e.target.value)}
            placeholder="—"
            className="border-l border-t border-[var(--border-subtle)] bg-transparent px-1.5 py-1 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/30 focus:bg-[var(--surface-input)]"
          />
        )
      })}
    </>
  )
}
