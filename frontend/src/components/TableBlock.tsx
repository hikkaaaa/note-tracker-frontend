import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Plus, Minus, Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const COLORS = ['#0f172a', '#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']

export function TableBlock({ content, onChange }: { content: string, onChange: (c: string) => void }) {
  const defaultHtml = `<table style="width:100%"><tbody>
    <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
    <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
    <tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>
  </tbody></table>`

  const [isFocused, setIsFocused] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [toolbarPos, setToolbarPos] = useState<{ top: number, left: number }>({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4, 5, 6] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
    ],
    content: content || defaultHtml,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onFocus: () => setIsFocused(true),
    onBlur: () => {
      setTimeout(() => {
        setIsFocused(false)
        setShowColorPicker(false)
      }, 250)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none outline-none',
      },
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== content && !editor.isFocused && content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

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

  if (!editor) return null

  return (
    <div ref={containerRef} className="relative group/table w-full overflow-visible pb-5 pr-5 mt-2 transition-all">
      {editor && isFocused && (hasSelection || showColorPicker) && (
        <div
          style={{ top: toolbarPos.top, left: toolbarPos.left, transform: 'translateY(calc(-100% - 8px))' }}
          className="absolute flex flex-wrap items-center gap-1 bg-slate-800 text-white p-1 rounded-lg shadow-xl z-50 w-max max-w-full print:hidden"
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
          {[3, 4, 5, 6].map(level => (
            <button
              key={level}
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: level as 3 | 4 | 5 | 6 }).run() }}
              className={`px-2 py-1.5 rounded hover:bg-slate-700 font-bold text-sm leading-none flex items-center justify-center transition-colors ${editor.isActive('heading', { level }) ? 'bg-slate-700 text-blue-400' : ''}`}
              title={`Heading ${level}`}
            >
              H{level}
            </button>
          ))}
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
              onMouseDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker) }}
              className={`p-1.5 rounded hover:bg-slate-700 ${showColorPicker ? 'bg-slate-700 text-blue-400' : ''}`}
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPicker && (
              <div
                className="absolute top-full left-0 mt-2 flex gap-1.5 bg-slate-800 p-2 rounded-lg shadow-2xl z-30"
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
      )}
      <div className="overflow-x-auto w-full bg-[var(--surface)]">
        <EditorContent editor={editor} className="tiptap-table min-w-full outline-none [&_p]:m-0 focus:outline-none" />
      </div>
      
      <div className="absolute top-1/2 -translate-y-1/2 -right-3 flex flex-col gap-1 opacity-0 group-hover/table:opacity-100 transition-all z-10 print:hidden">
        <button 
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          className="w-6 h-6 bg-[var(--surface)] text-indigo-500 border border-[var(--border-subtle)] rounded-full flex items-center justify-center hover:scale-110 hover:bg-[var(--text-primary)]/[0.06] shadow shadow-slate-200/50"
          title="Add Column"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => editor.chain().focus().deleteColumn().run()}
          className="w-6 h-6 bg-[var(--surface)] text-red-400 border border-[var(--border-subtle)] rounded-full flex items-center justify-center hover:scale-110 hover:bg-red-50 shadow shadow-slate-200/50"
          title="Delete Column"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover/table:opacity-100 transition-all z-10 print:hidden">
        <button 
          onClick={() => editor.chain().focus().addRowAfter().run()}
          className="w-6 h-6 bg-[var(--surface)] text-indigo-500 border border-[var(--border-subtle)] rounded-full flex items-center justify-center hover:scale-110 hover:bg-[var(--text-primary)]/[0.06] shadow shadow-slate-200/50"
          title="Add Row"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => editor.chain().focus().deleteRow().run()}
          className="w-6 h-6 bg-[var(--surface)] text-red-400 border border-[var(--border-subtle)] rounded-full flex items-center justify-center hover:scale-110 hover:bg-red-50 shadow shadow-slate-200/50"
          title="Delete Row"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
