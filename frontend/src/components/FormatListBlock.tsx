import { Plus, List as ListIcon, ChevronDown } from 'lucide-react'
import { RichTextEditor } from './RichTextEditor'
import { useState } from 'react'

interface ListData {
  style: string
  items: Array<{id: string, text: string}>
}

export function FormatListBlock({ content, onChange }: { content: string, onChange: (c: string) => void }) {
  let data: ListData = { style: '1.', items: [] }
  try {
     const parsed = JSON.parse(content || '{}')
     if (parsed.items) data = parsed
  } catch {}

  const { style, items } = data
  const [showMenu, setShowMenu] = useState(false)

  const update = (newStyle: string, newItems: any[]) => {
    onChange(JSON.stringify({ style: newStyle, items: newItems }))
  }

  const handleAdd = (indexAfter?: number) => {
    const newItem = { id: Date.now().toString(), text: '' }
    if (typeof indexAfter === 'number') {
       const nextItems = [...items]
       nextItems.splice(indexAfter + 1, 0, newItem)
       update(style, nextItems)
    } else {
       update(style, [...items, newItem])
    }
  }

  const handleRemove = (id: string) => {
    update(style, items.filter(i => i.id !== id))
  }

  const handleTextChange = (id: string, newText: string) => {
    update(style, items.map(i => i.id === id ? { ...i, text: newText } : i))
  }

  const getPrefix = (index: number, listStyle: string) => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    if (listStyle === '1.') return `${index + 1}.`
    if (listStyle === '1)') return `${index + 1})`
    if (listStyle === 'a.') return `${letters[index % 26] || 'z'}.`
    if (listStyle === 'a)') return `${letters[index % 26] || 'z'})`
    return '•'
  }

  if (items.length === 0) {
    handleAdd()
    return null
  }

  const styles = ['1.', '1)', 'a.', 'a)', 'bullet']

  return (
    <div className="w-full relative group/list block">
      <div className="absolute -left-11 -top-8 opacity-0 group-hover/list:opacity-100 transition-opacity print:hidden">
        <button 
          onClick={() => setShowMenu(!showMenu)} 
          className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06] flex items-center bg-[var(--surface)] shadow-sm border border-[var(--border-subtle)]"
          title="Change List Style"
        >
          <ListIcon className="w-3.5 h-3.5" />
          <ChevronDown className="w-3 h-3 ml-0.5" />
        </button>
        {showMenu && (
          <div className="absolute top-full -left-2 mt-1 bg-[var(--surface)] border border-[var(--border-subtle)] shadow-lg rounded-lg py-1 z-30 w-32" onMouseLeave={() => setShowMenu(false)}>
            {styles.map(s => (
              <button 
                key={s} 
                onClick={() => { update(s, items); setShowMenu(false) }} 
                className="w-full px-3 py-1.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06] flex items-center"
              >
                {s === '1.' ? '1. 2. 3.' : 
                 s === '1)' ? '1) 2) 3)' : 
                 s === 'a.' ? 'a. b. c.' : 
                 s === 'a)' ? 'a) b) c)' : '• Bullets'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-start gap-2 group/item">
            <span className="mt-1 min-w-[1.5rem] font-medium text-[var(--text-secondary)] text-sm text-right shrink-0">
              {getPrefix(index, style)}
            </span>
            <div className="flex-1">
              <RichTextEditor 
                content={item.text} 
                onChange={(html) => handleTextChange(item.id, html)} 
                onEnter={() => handleAdd(index)}
                placeholder="List item..."
                className="text-[var(--text-primary)] leading-relaxed"
              />
            </div>
            <button 
              onClick={() => handleRemove(item.id)}
              className="opacity-0 group-hover/item:opacity-100 p-1 text-[var(--text-secondary)] hover:text-red-400 transition-opacity print:hidden"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={() => handleAdd()}
        className="mt-3 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors pl-8 print:hidden"
      >
        <Plus className="w-3 h-3" />
        Add Item
      </button>
    </div>
  )
}
