import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import { splitBlock } from '@tiptap/pm/commands'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const COLORS = ['#0f172a', '#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  onEnter?: () => void
  onArrowDown?: () => boolean | void
  onArrowUp?: () => boolean | void
}

function focusAdjacentEditor(currentEl: HTMLElement, direction: 1 | -1): boolean {
  const fields = Array.from(document.querySelectorAll<HTMLElement>('.ProseMirror'))
  const idx = fields.indexOf(currentEl)
  if (idx === -1) return false
  const next = fields[idx + direction]
  if (!next) return false
  next.focus()
  try {
    const sel = window.getSelection()
    const range = document.createRange()
    if (direction === 1) {
      range.setStart(next, 0)
    } else {
      range.selectNodeContents(next)
      range.collapse(false)
    }
    range.collapse(direction === 1)
    sel?.removeAllRanges()
    sel?.addRange(range)
  } catch {}
  return true
}

// Whether there is another textblock (line/paragraph/list item) before/after the one
// the cursor sits in. Because each visual line is its own <p> (see splitHardBreaks),
// ProseMirror's endOfTextblock() is true on nearly every line — so on its own it would
// make Arrow Up/Down jump to a different note block instead of moving one line. We only
// hand off to the adjacent editor when the cursor is on the very first/last line of the
// whole editor; otherwise ProseMirror moves the caret normally between lines.
function hasTextblockBeyond(state: any, direction: 1 | -1): boolean {
  const $head = state.selection.$head
  let found = false
  if (direction === -1) {
    const start = $head.start($head.depth)
    if (start <= 1) return false
    state.doc.nodesBetween(0, start - 1, (node: any) => {
      if (node.isTextblock) found = true
    })
  } else {
    const end = $head.end($head.depth)
    if (end >= state.doc.content.size - 1) return false
    state.doc.nodesBetween(end + 1, state.doc.content.size, (node: any) => {
      if (node.isTextblock) found = true
    })
  }
  return found
}

/**
 * Convert <br> hard breaks inside block elements into separate paragraphs, so each
 * visual line is its own node. Without this, several lines share one <p> and
 * block-level formatting like text-align applies to the whole paragraph (i.e. all
 * lines) instead of just the selected line. Tailwind's preflight zeroes <p> margins,
 * so the result looks identical to the old hard-break lines.
 */
function splitHardBreaks(html: string): string {
  if (!html || !html.includes('<br')) return html
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  tpl.content.querySelectorAll('p, h3, h4, h5, h6').forEach((block) => {
    if (!block.querySelector('br')) return
    const frag = document.createDocumentFragment()
    let line = block.cloneNode(false) as HTMLElement
    Array.from(block.childNodes).forEach((node) => {
      if (node.nodeName === 'BR') {
        frag.appendChild(line)
        line = block.cloneNode(false) as HTMLElement
      } else {
        line.appendChild(node)
      }
    })
    frag.appendChild(line)
    block.replaceWith(frag)
  })
  return tpl.innerHTML
}

export function RichTextEditor({ content, onChange, placeholder, className = '', onEnter, onArrowDown, onArrowUp }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [toolbarPos, setToolbarPos] = useState<{ top: number, left: number }>({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [3, 4, 5, 6]
        },
        bulletList: false,
        orderedList: false,
        horizontalRule: false,
        blockquote: false,
        codeBlock: false,
        dropcursor: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content: splitHardBreaks(content),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => {
      setTimeout(() => {
        setIsFocused(false)
        setShowColorPicker(false)
      }, 250)
    },
    editorProps: {
      attributes: {
        class: `focus:outline-none min-h-[1.5em] ${className}`,
        placeholder: placeholder || '',
      },
      handleKeyDown: (view, event) => {
        // Shift+Enter adds a new line as its own paragraph (not a <br>), so each
        // line can be aligned/formatted independently.
        if (event.key === 'Enter' && event.shiftKey) {
          return splitBlock(view.state, view.dispatch)
        }
        if (event.key === 'Enter' && !event.shiftKey && onEnter) {
          const { state } = view
          const { selection } = state
          if (selection.empty && selection.$head.pos === state.doc.content.size - 1) {
            onEnter()
            return true
          }
        }
        if (event.key === 'ArrowDown' && !event.shiftKey && view.endOfTextblock('down') && !hasTextblockBeyond(view.state, 1)) {
          const handled = onArrowDown ? onArrowDown() : false
          if (handled === true) return true
          if (focusAdjacentEditor(view.dom as HTMLElement, 1)) return true
        }
        if (event.key === 'ArrowUp' && !event.shiftKey && view.endOfTextblock('up') && !hasTextblockBeyond(view.state, -1)) {
          const handled = onArrowUp ? onArrowUp() : false
          if (handled === true) return true
          if (focusAdjacentEditor(view.dom as HTMLElement, -1)) return true
        }
        return false
      }
    },
  })

  // Prevent internal state updates causing re-renders that reset cursor
  useEffect(() => {
    if (!editor) return
    const normalized = splitHardBreaks(content)
    if (editor.getHTML() !== normalized && !editor.isFocused) {
      editor.commands.setContent(normalized)
    }
  }, [content, editor])

  // Track cursor/selection position so the toolbar appears above the active text
  useEffect(() => {
    if (!editor) return
    const updatePos = () => {
      if (!containerRef.current) return
      try {
        const { from, empty } = editor.state.selection
        setHasSelection(!empty)
        const coords = editor.view.coordsAtPos(from)
        const rect = containerRef.current.getBoundingClientRect()
        setToolbarPos({
          top: coords.top - rect.top,
          left: Math.max(0, coords.left - rect.left),
        })
      } catch {}
    }
    updatePos()
    editor.on('selectionUpdate', updatePos)
    editor.on('transaction', updatePos)
    editor.on('focus', updatePos)
    return () => {
      editor.off('selectionUpdate', updatePos)
      editor.off('transaction', updatePos)
      editor.off('focus', updatePos)
    }
  }, [editor])

  return (
    <div ref={containerRef} className="relative w-full border border-transparent hover:border-[var(--border-subtle)] rounded-lg group transition-colors">
      {editor && isFocused && (hasSelection || showColorPicker) ? (
        <div
          style={{ top: toolbarPos.top, left: 0, transform: 'translateY(calc(-100% - 8px))' }}
          className="absolute flex flex-wrap items-center gap-1 bg-slate-800 text-white p-1 rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity max-w-full"
        >
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
            className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive('bold') ? 'bg-slate-700 text-blue-400' : ''}`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
            className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive('italic') ? 'bg-slate-700 text-blue-400' : ''}`}
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              const { state, view } = editor
              const { selection, tr } = state
              const { from, to } = selection

              if (selection.empty) return

              let nodes: Array<{ node: any, pos: number }> = []
              state.doc.nodesBetween(from, to, (node, pos) => {
                if (node.isText) {
                  nodes.push({ node, pos })
                }
              })

              if (nodes.length === 0) return

              const fullText = state.doc.textBetween(from, to, ' ')
              const isUpper = fullText === fullText.toUpperCase()
              const isLower = fullText === fullText.toLowerCase()

              for (let i = nodes.length - 1; i >= 0; i--) {
                const { node, pos } = nodes[i]
                const start = Math.max(pos, from)
                const end = Math.min(pos + node.nodeSize, to)
                const text = node.text!.slice(start - pos, end - pos)

                let newText = text
                if (isUpper) {
                  newText = text.toLowerCase()
                } else if (isLower) {
                  newText = text.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase())
                } else {
                  newText = text.toUpperCase()
                }

                const newNode = state.schema.text(newText, node.marks)
                tr.replaceWith(start, end, newNode)
              }
              view.dispatch(tr)
            }}
            className="px-2 py-1.5 rounded hover:bg-slate-700 font-semibold text-sm leading-none flex items-center justify-center transition-colors"
            title="Toggle Case"
          >
            aA
          </button>

          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run() }}
            className={`px-2 py-1.5 rounded hover:bg-slate-700 font-bold text-sm leading-none flex items-center justify-center transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-700 text-blue-400' : ''}`}
            title="Heading 3"
          >
            H3
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 4 }).run() }}
            className={`px-2 py-1.5 rounded hover:bg-slate-700 font-bold text-sm leading-none flex items-center justify-center transition-colors ${editor.isActive('heading', { level: 4 }) ? 'bg-slate-700 text-blue-400' : ''}`}
            title="Heading 4"
          >
            H4
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 5 }).run() }}
            className={`px-2 py-1.5 rounded hover:bg-slate-700 font-bold text-sm leading-none flex items-center justify-center transition-colors ${editor.isActive('heading', { level: 5 }) ? 'bg-slate-700 text-blue-400' : ''}`}
            title="Heading 5"
          >
            H5
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 6 }).run() }}
            className={`px-2 py-1.5 rounded hover:bg-slate-700 font-bold text-sm leading-none flex items-center justify-center transition-colors ${editor.isActive('heading', { level: 6 }) ? 'bg-slate-700 text-blue-400' : ''}`}
            title="Heading 6"
          >
            H6
          </button>
          
          <div className="w-px h-5 bg-slate-600 mx-1" />
          
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run() }}
            className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-700 text-blue-400' : ''}`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run() }}
            className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-700 text-blue-400' : ''}`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run() }}
            className={`p-1.5 rounded hover:bg-slate-700 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-700 text-blue-400' : ''}`}
          >
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-600 mx-1" />

          <div className="relative">
            <button
              onMouseDown={(e) => { 
                e.preventDefault()
                setShowColorPicker(!showColorPicker)
              }}
              className={`p-1.5 rounded hover:bg-slate-700 ${showColorPicker ? 'bg-slate-700 text-blue-400' : ''}`}
            >
              <Palette className="w-4 h-4" />
            </button>
            
            {showColorPicker && (
              <div
                className="absolute top-full right-0 mt-2 flex w-[140px] flex-wrap justify-center gap-1.5 bg-slate-800 p-2 rounded-lg shadow-2xl z-30"
                onMouseDown={(e) => e.preventDefault()}
              >
                {COLORS.map(color => (
                  <button
                    key={color}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      editor.chain().focus().setColor(color).run()
                      setShowColorPicker(false)
                    }}
                    className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={`Set color ${color}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
      <div className="p-1">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
