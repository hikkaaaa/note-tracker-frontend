import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, Folder, FileText, X, Check, ChevronLeft,
  Type, ListTodo, Table as TableIcon, Code2, Timer as TimerIcon, CalendarDays, GripVertical,
} from 'lucide-react'
import { SiteHeader } from '../components/SiteHeader'
import { PageBackdrop } from '../components/PageBackdrop'

const bricolage = "'Quicksand', sans-serif"
const EASE = [0.22, 1, 0.36, 1] as const

/* The whole page is one local state machine — no routing, no scroll. The hero morphs
   in place into a 4-step tutorial and back. */
type Status = 'hero' | 'tutorial_step_1' | 'tutorial_step_2' | 'tutorial_step_3' | 'tutorial_step_4'
const STEP_ORDER: Status[] = ['tutorial_step_1', 'tutorial_step_2', 'tutorial_step_3', 'tutorial_step_4']

/* mock data for the hero folder→note preview */
const FOLDERS = [
  { id: 'fs', name: 'Fullstack', swatch: '#3B82F6', tint: 'rgba(59,130,246,0.12)', notes: [
    { t: 'REST vs GraphQL', s: 'API design notes' }, { t: 'Auth & JWT flows', s: 'Sessions, refresh' }, { t: 'Deploy checklist', s: 'CI/CD steps' },
  ] },
  { id: 'pj', name: 'Projects', swatch: '#10B981', tint: 'rgba(16,185,129,0.12)', notes: [
    { t: 'Face recognition', s: 'OpenCV + FastAPI' }, { t: 'Side-project ideas', s: 'Running backlog' },
  ] },
  { id: 'bt', name: 'Big Tech Prep', swatch: '#8B5CF6', tint: 'rgba(139,92,246,0.12)', notes: [
    { t: 'DSA patterns', s: 'Sliding window…' }, { t: 'System design', s: 'Scaling basics' }, { t: 'Behavioral', s: 'STAR stories' },
  ] },
]

const STEP_META = [
  { key: 'Folder', title: 'Spin up a folder', desc: 'Name it, pick a color — your workspace organizes itself.' },
  { key: 'Note', title: 'Drop in a note', desc: 'Create a note inside any folder in two clicks.' },
  { key: 'Blocks', title: 'Drag in blocks', desc: 'Build a page from text, lists, tables and more.' },
  { key: 'Tools', title: 'Add live tools', desc: 'Pull a Timer or Calendar straight into the canvas.' },
]

/* tiny typewriter for the mock form fields */
function useTypewriter(text: string, speed = 55) {
  const [out, setOut] = useState('')
  useEffect(() => {
    setOut('')
    let i = 0
    const id = setInterval(() => { i++; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(id) }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  return out
}

export function LandingPage() {
  const [status, setStatus] = useState<Status>('hero')
  const stepIndex = STEP_ORDER.indexOf(status)
  const inTutorial = stepIndex >= 0

  const goHero = () => setStatus('hero')
  const next = () => setStatus(STEP_ORDER[Math.min(stepIndex + 1, STEP_ORDER.length - 1)])
  const back = () => (stepIndex <= 0 ? goHero() : setStatus(STEP_ORDER[stepIndex - 1]))

  // Esc exits the tutorial
  useEffect(() => {
    if (!inTutorial) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') goHero() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inTutorial])

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased"
      style={{ fontFamily: "'Poppins', ui-sans-serif, sans-serif" }}
    >
      <PageBackdrop />

      <div className="relative z-[2] mx-auto flex h-full w-full max-w-[1440px] flex-col px-5 pt-6 sm:px-10">
        <div className="shrink-0">
          <SiteHeader homeActive cta={{ label: 'Log In', to: '/login' }} />
        </div>

        {/* the morphing stage */}
        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {!inTutorial ? (
              <motion.div
                key="hero"
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.97, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -10, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <Hero onLearnMore={() => setStatus('tutorial_step_1')} />
              </motion.div>
            ) : (
              <motion.div
                key="tutorial"
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.98, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10, filter: 'blur(6px)' }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <TutorialStage status={status} stepIndex={stepIndex} onNext={next} onBack={back} onSkip={goHero} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ============================ HERO ============================ */
function Hero({ onLearnMore }: { onLearnMore: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
     {/* centered in the stage, then nudged up ~half the header height so it reads as
         optically centered in the full viewport rather than sitting low. */}
     <div className="grid w-full max-w-[1240px] grid-cols-1 items-center gap-10 lg:-translate-y-[52px] lg:grid-cols-[1fr_540px] lg:gap-20">
      <div className="text-center lg:text-left">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--text-secondary)] shadow-[0_8px_22px_-16px_rgba(27,19,38,0.2)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Welcome to hixie — modular notes for fast minds
        </span>
        <h1
          className="mx-auto mt-5 max-w-[680px] text-[clamp(42px,5.8vw,82px)] font-extrabold leading-[0.98] tracking-[-0.035em] lg:mx-0"
          style={{ fontFamily: bricolage }}
        >
          Capture{' '}
          <span className="relative inline-block">
            <span aria-hidden className="absolute inset-x-[-4px] bottom-[0.08em] h-[0.32em] rounded bg-[#F6C45C] opacity-85" />
            <span className="relative">fast</span>
          </span>
          .<br />
          Stay{' '}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(120deg,#FFC24B,#F99A00,#F26A1B)' }}>structured</span>
          <span className="text-[#F99A00]">.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[480px] text-[17px] leading-[1.55] text-[var(--text-secondary)] lg:mx-0">
          Folders, notes, and drag-in tools — a clean, modular workspace that keeps up with your speed.
        </p>
        <div className="mt-7 flex justify-center gap-3 lg:justify-start">
          <button
            onClick={onLearnMore}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-[24px] py-3.5 text-[15px] font-semibold text-[var(--text-primary)] shadow-[0_8px_22px_-14px_rgba(27,19,38,0.2)] transition-transform hover:-translate-y-px"
          >
            Learn More
          </button>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-[24px] py-3.5 text-[15px] font-semibold text-[var(--btn-primary-text)] no-underline shadow-[0_12px_28px_-14px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px"
          >
            Get Started
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#F6C45C]"><ArrowRight size={13} color="#1B1326" /></span>
          </Link>
        </div>
      </div>

      {/* interactive preview — hidden on small screens to keep the 100vh promise */}
      <div className="hidden items-center justify-center lg:flex">
        <FolderNotePreview />
      </div>
     </div>
    </div>
  )
}

/* Hover (or auto-cycle) a folder → its notes expand & shimmer. Previews the
   folder→note hierarchy before the user signs up. */
function FolderNotePreview() {
  const [active, setActive] = useState(FOLDERS[0].id)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setActive((cur) => FOLDERS[(FOLDERS.findIndex((f) => f.id === cur) + 1) % FOLDERS.length].id)
    }, 2800)
    return () => clearInterval(id)
  }, [paused])

  const folder = FOLDERS.find((f) => f.id === active)!

  return (
    <div
      data-cursor-block
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="w-full max-w-[540px] overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_36px_80px_-30px_rgba(27,19,38,0.42)]"
    >
      {/* window bar */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 text-[12px] font-semibold text-[var(--text-secondary)]">hixie · Folders</span>
      </div>

      <div className="grid grid-cols-[160px_1fr]">
        {/* folder rail */}
        <div className="flex flex-col gap-1.5 border-r border-[var(--border-subtle)] p-2.5">
          {FOLDERS.map((f) => {
            const on = f.id === active
            return (
              <button
                key={f.id}
                onMouseEnter={() => setActive(f.id)}
                className="relative flex items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors"
                style={{ background: on ? f.tint : 'transparent' }}
              >
                {on && <motion.span layoutId="folder-rail" className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full" style={{ background: f.swatch }} />}
                <Folder className="h-[18px] w-[18px] flex-shrink-0" style={{ color: f.swatch }} fill={on ? f.swatch : 'transparent'} fillOpacity={on ? 0.18 : 0} />
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-bold" style={{ color: on ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f.name}</span>
                  <span className="block text-[10.5px] text-[var(--text-secondary)]">{f.notes.length} notes</span>
                </span>
              </button>
            )
          })}
        </div>

        {/* notes for the active folder */}
        <div className="min-h-[268px] p-3.5">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Notes</span>
            <span className="text-[10px] font-semibold" style={{ color: folder.swatch }}>{folder.name}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={folder.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-2"
            >
              {folder.notes.map((n, i) => (
                <motion.div
                  key={n.t}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.32, ease: EASE }}
                  className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-2.5 shadow-[0_8px_20px_-16px_rgba(27,19,38,0.3)]"
                >
                  <span className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: folder.swatch }} />
                  <div className="flex items-center gap-2.5 pl-1">
                    <FileText className="h-4 w-4 flex-shrink-0" style={{ color: folder.swatch }} />
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold text-[var(--text-primary)]">{n.t}</div>
                      <div className="truncate text-[11.5px] text-[var(--text-secondary)]">{n.s}</div>
                    </div>
                  </div>
                  {/* shimmer sweep */}
                  <motion.span
                    initial={{ x: '-120%' }}
                    animate={{ x: '160%' }}
                    transition={{ delay: 0.2 + i * 0.07, duration: 0.9, ease: 'easeInOut' }}
                    className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
                    style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)' }}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

/* ============================ TUTORIAL ============================ */
function TutorialStage({ status, stepIndex, onNext, onBack, onSkip }: {
  status: Status; stepIndex: number; onNext: () => void; onBack: () => void; onSkip: () => void
}) {
  const meta = STEP_META[stepIndex]
  const isLast = stepIndex === STEP_ORDER.length - 1

  return (
    /* the whole wizard is one centered unit — nudged up ~half the header height so it
       reads as optically centered in the viewport (matching the hero). */
    <div className="flex h-full flex-col items-center justify-center gap-3 lg:-translate-y-[34px]">
      {/* stepper */}
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
        {STEP_META.map((s, i) => {
          const done = i < stepIndex, on = i === stepIndex
          return (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors"
                style={{
                  borderColor: on ? '#8B5CF6' : 'var(--border-subtle)',
                  background: on ? 'rgba(139,92,246,0.1)' : done ? 'rgba(16,185,129,0.1)' : 'var(--surface)',
                  color: on ? '#8B5CF6' : done ? '#10B981' : 'var(--text-secondary)',
                }}
              >
                <span className="grid h-4 w-4 place-items-center rounded-full text-[10px] text-white" style={{ background: on ? '#8B5CF6' : done ? '#10B981' : 'var(--text-secondary)' }}>
                  {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </span>
                {s.key}
              </span>
              {i < STEP_META.length - 1 && <span className="h-px w-4 bg-[var(--border-subtle)]" />}
            </div>
          )
        })}
      </div>

      {/* caption */}
      <div className="shrink-0 text-center">
        <h2 className="text-[clamp(22px,3vw,32px)] font-extrabold tracking-[-0.03em]" style={{ fontFamily: bricolage }}>{meta.title}</h2>
        <p className="mx-auto mt-1 max-w-[460px] text-[13.5px] text-[var(--text-secondary)]">{meta.desc}</p>
      </div>

      {/* morphing mock — bounded height + clip so it never forces a scrollbar */}
      <div className="relative grid max-h-[46vh] w-full place-items-center overflow-hidden">
        <div className="origin-center scale-[0.8] sm:scale-90 lg:scale-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {status === 'tutorial_step_1' && <FolderModalMock />}
              {status === 'tutorial_step_2' && <NoteModalMock />}
              {status === 'tutorial_step_3' && <BlockDragMock />}
              {status === 'tutorial_step_4' && <ToolDragMock />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* controls */}
      <div className="flex shrink-0 items-center justify-center gap-3 pb-1">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onSkip} className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] underline-offset-4 transition-colors hover:text-[var(--text-primary)] hover:underline">
          Skip tour
        </button>
        {isLast ? (
          <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 py-2.5 text-[13px] font-bold text-[var(--btn-primary-text)] no-underline transition-transform hover:-translate-y-px">
            Get Started <ArrowUpRight size={14} />
          </Link>
        ) : (
          <button onClick={onNext} className="inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 py-2.5 text-[13px] font-bold text-[var(--btn-primary-text)] transition-transform hover:-translate-y-px">
            Next <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

const MOCK_W = 'w-[560px] max-w-[86vw]'

/* Step 1 — folder creation modal (mirrors CreateFolderModal tokens) */
function FolderModalMock() {
  const name = useTypewriter('Research Notes')
  const swatches = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#D946EF', '#FA7268']
  return (
    <div className={`${MOCK_W} overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)]`}>
      <div className="flex items-center gap-3.5 border-b border-[var(--border-subtle)] px-6 py-4">
        <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(236,72,153,0.10))' }}>
          <Folder className="h-[24px] w-[24px] text-[#8B5CF6]" />
        </span>
        <h3 className="text-[20px] font-extrabold tracking-[-0.025em]" style={{ fontFamily: bricolage }}>New Folder</h3>
        <span className="ml-auto grid h-9 w-9 place-items-center rounded-[10px] text-[var(--text-secondary)]"><X className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <div className="mb-1.5 text-[13px] font-bold">Folder Name <span className="text-[#F99A00]">*</span></div>
          <div className="flex items-center rounded-xl border-[1.5px] border-[#8B5CF6] bg-[var(--surface)] px-3.5 py-2.5 text-[14px] ring-4 ring-[#8B5CF6]/15">
            {name}<span className="ml-0.5 inline-block h-[16px] w-[2px] animate-pulse bg-[#8B5CF6]" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-bold">Folder Color</div>
          <div className="flex gap-2.5">
            {swatches.map((c, i) => (
              <span key={c} className="h-8 w-8 rounded-full border-[3px] border-white" style={{ background: c, outline: i === 0 ? `2px solid ${c}` : '2px solid transparent', outlineOffset: 2, boxShadow: i === 0 ? `0 4px 10px -2px ${c}` : '0 1px 3px rgba(15,23,42,0.10)' }} />
            ))}
          </div>
        </div>
        <div className="mt-1 flex justify-end gap-2.5">
          <span className="rounded-xl border-[1.5px] border-[var(--border-subtle)] px-5 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)]">Cancel</span>
          <motion.span
            animate={{ scale: [1, 0.95, 1], boxShadow: ['0 8px 16px -6px rgba(139,92,246,0.45)', '0 4px 10px -6px rgba(139,92,246,0.6)', '0 8px 16px -6px rgba(139,92,246,0.45)'] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
            className="rounded-xl bg-[#8B5CF6] px-5 py-2.5 text-[13px] font-bold text-white"
          >
            Create Folder
          </motion.span>
        </div>
      </div>
    </div>
  )
}

/* Step 2 — note creation modal (green accent, mirrors CreateNoteModal) */
function NoteModalMock() {
  const name = useTypewriter('Q1 Marketing Plan')
  return (
    <div className={`${MOCK_W} overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)]`}>
      <div className="flex items-center gap-3.5 border-b border-[var(--border-subtle)] px-6 py-4">
        <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(16,185,129,0.08))' }}>
          <FileText className="h-[23px] w-[23px] text-[#10B981]" />
        </span>
        <div>
          <h3 className="text-[20px] font-extrabold leading-none tracking-[-0.025em]" style={{ fontFamily: bricolage }}>New Note</h3>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
            in <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981' }}><span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />Projects</span>
          </div>
        </div>
        <span className="ml-auto grid h-9 w-9 place-items-center rounded-[10px] text-[var(--text-secondary)]"><X className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">
        <div>
          <div className="mb-1.5 text-[13px] font-bold">Note Name <span className="text-[#F99A00]">*</span></div>
          <div className="flex items-center rounded-xl border-[1.5px] border-[#10B981] bg-[var(--surface)] px-3.5 py-2.5 text-[14px] ring-4 ring-[#10B981]/15">
            {name}<span className="ml-0.5 inline-block h-[16px] w-[2px] animate-pulse bg-[#10B981]" />
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-bold">Purpose <span className="font-medium text-[var(--text-secondary)]">(optional)</span></div>
          <div className="min-h-[60px] rounded-xl border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface-input)] px-3.5 py-2.5 text-[13px] text-[var(--text-secondary)]">Brainstorm the new campaign</div>
        </div>
        <div className="mt-1 flex justify-end gap-2.5">
          <span className="rounded-xl border-[1.5px] border-[var(--border-subtle)] px-5 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)]">Cancel</span>
          <motion.span
            animate={{ scale: [1, 0.95, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 0.8 }}
            className="rounded-xl bg-[#10B981] px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_16px_-6px_rgba(16,185,129,0.5)]"
          >
            Create Note
          </motion.span>
        </div>
      </div>
    </div>
  )
}

/* Shared mini-editor chrome for the drag steps */
function MiniEditor({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[660px] max-w-[88vw] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_30px_70px_-28px_rgba(27,19,38,0.4)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-2 text-[11px] font-semibold text-[var(--text-secondary)]">hixie · Note editor</span>
      </div>
      {children}
    </div>
  )
}

const Tile = ({ icon: Icon, label, color, tint, ghost }: { icon: React.ElementType; label: string; color: string; tint: string; ghost?: boolean }) => (
  <div className={`flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-2 ${ghost ? 'shadow-[0_18px_40px_-16px_rgba(27,19,38,0.45)]' : ''}`}>
    <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: tint, color }}><Icon className="h-4 w-4" /></span>
    <span className="text-[11.5px] font-bold text-[var(--text-primary)]">{label}</span>
    {!ghost && <GripVertical className="ml-auto h-3.5 w-3.5 text-[var(--text-secondary)] opacity-50" />}
  </div>
)

/* Step 3 — drag a Text Block from the left "DRAG TO ADD" panel into the canvas */
function BlockDragMock() {
  return (
    <MiniEditor>
      <div className="relative grid grid-cols-[150px_1fr] gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">Drag to add</span>
          <Tile icon={Type} label="Text Block" color="#3B82F6" tint="rgba(59,130,246,0.12)" />
          <Tile icon={ListTodo} label="Checklist" color="#10B981" tint="rgba(16,185,129,0.12)" />
          <Tile icon={TableIcon} label="Table" color="#14B8A6" tint="rgba(20,184,166,0.14)" />
          <Tile icon={Code2} label="Code Block" color="#5B21B6" tint="rgba(91,33,182,0.12)" />
        </div>
        <div className="relative min-h-[230px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-input)] p-3">
          <div className="mb-2 h-2.5 w-1/2 rounded-full bg-[var(--text-primary)]/10" />
          <div className="mb-3 h-2 w-2/3 rounded-full bg-[var(--text-primary)]/[0.07]" />
          {/* drop zone that "receives" the block */}
          <motion.div
            className="mt-2 grid h-[84px] place-items-center rounded-xl border-2 border-dashed"
            animate={{ borderColor: ['rgba(59,130,246,0)', 'rgba(59,130,246,0.6)', 'rgba(59,130,246,0)'], background: ['rgba(59,130,246,0)', 'rgba(59,130,246,0.08)', 'rgba(59,130,246,0)'] }}
            transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 1], ease: 'easeInOut' }}
          >
            <span className="text-[11px] font-semibold text-[#3B82F6]">Drop a block here</span>
          </motion.div>
        </div>

        {/* the dragging ghost looping from panel → canvas */}
        <motion.div
          className="pointer-events-none absolute left-[12px] top-[34px] w-[130px]"
          animate={{ x: [0, 60, 250, 250], y: [0, -6, 96, 96], opacity: [0, 1, 1, 0], rotate: [0, -3, -3, -3] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.15, 0.7, 1], ease: 'easeInOut' }}
        >
          <Tile icon={Type} label="Text Block" color="#3B82F6" tint="rgba(59,130,246,0.12)" ghost />
        </motion.div>
      </div>
    </MiniEditor>
  )
}

/* Step 4 — drag a tool (Timer / Calendar) from the right "TOOLS" panel into the canvas */
function ToolDragMock() {
  return (
    <MiniEditor>
      <div className="relative grid grid-cols-[1fr_150px] gap-3 p-3">
        <div className="relative min-h-[230px] rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-input)] p-3">
          <div className="mb-2 h-2.5 w-1/2 rounded-full bg-[var(--text-primary)]/10" />
          <div className="mb-3 h-2 w-2/3 rounded-full bg-[var(--text-primary)]/[0.07]" />
          <motion.div
            className="mt-2 grid h-[84px] place-items-center rounded-xl border-2 border-dashed"
            animate={{ borderColor: ['rgba(139,92,246,0)', 'rgba(139,92,246,0.6)', 'rgba(139,92,246,0)'], background: ['rgba(139,92,246,0)', 'rgba(139,92,246,0.08)', 'rgba(139,92,246,0)'] }}
            transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.55, 1], ease: 'easeInOut' }}
          >
            <span className="text-[11px] font-semibold text-[#8B5CF6]">Drop a tool here</span>
          </motion.div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="px-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">Tools</span>
          <Tile icon={TimerIcon} label="Timer" color="#8B5CF6" tint="rgba(139,92,246,0.12)" />
          <Tile icon={CalendarDays} label="Calendar" color="#0EA5E9" tint="rgba(14,165,233,0.12)" />
        </div>

        {/* dragging ghost looping from right panel → canvas */}
        <motion.div
          className="pointer-events-none absolute right-[12px] top-[34px] w-[130px]"
          animate={{ x: [0, -60, -250, -250], y: [0, -6, 96, 96], opacity: [0, 1, 1, 0], rotate: [0, 3, 3, 3] }}
          transition={{ duration: 2.4, repeat: Infinity, times: [0, 0.15, 0.7, 1], ease: 'easeInOut' }}
        >
          <Tile icon={TimerIcon} label="Timer" color="#8B5CF6" tint="rgba(139,92,246,0.12)" ghost />
        </motion.div>
      </div>
    </MiniEditor>
  )
}
