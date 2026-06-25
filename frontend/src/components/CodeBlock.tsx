import { useEffect, useRef, useState } from 'react'
import DefaultEditor from 'react-simple-code-editor'
const Editor: any = (DefaultEditor as any).default || DefaultEditor
import Prism from 'prismjs'

import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-markdown'

// Dark theme to match screenshot
import 'prismjs/themes/prism-tomorrow.css'

import { Copy, Check } from 'lucide-react'

interface CodeData {
  language: string
  code: string
}

export function CodeBlock({ content, onChange }: { content: string, onChange: (c: string) => void }) {
  let data: CodeData = { language: '', code: '' }
  try {
    const parsed = JSON.parse(content || '{}')
    if (parsed.language !== undefined) data = parsed
  } catch {}

  const [copied, setCopied] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)

  // Grow the title to fit its content so long titles wrap and stay fully visible.
  const autosizeTitle = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }
  useEffect(() => { autosizeTitle(titleRef.current) }, [data.language])

  const update = (newLang: string, newCode: string) => {
    onChange(JSON.stringify({ language: newLang, code: newCode }))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(data.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const highlight = (code: string) => {
    const langKey = data.language.toLowerCase().trim()
    const grammer = Prism.languages[langKey] || Prism.languages.javascript
    return Prism.highlight(code, grammer, langKey || 'javascript')
  }

  return (
    <div className="w-full flex justify-center items-center py-2">
      <div className="w-full bg-[#1e1e1e] rounded-xl overflow-hidden shadow-sm flex flex-col font-mono text-sm border border-black/10">

        <div className="flex items-start justify-between gap-2 px-4 py-2.5 bg-[#2d2d2d] border-b border-white/5 text-slate-300">
          <textarea
            ref={titleRef}
            rows={1}
            value={data.language}
            onChange={(e) => { update(e.target.value, data.code); autosizeTitle(e.target) }}
            placeholder="Title or Language..."
            className="flex-1 resize-none overflow-hidden break-words bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[13px] font-semibold tracking-wide leading-snug text-slate-300 placeholder:text-slate-500"
          />

          <button
            onClick={handleCopy}
            className="mt-0.5 flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors text-slate-400 hover:text-white"
            title="Copy Code"
          >
            {copied ? <Check className="w-[15px] h-[15px] text-emerald-400" /> : <Copy className="w-[15px] h-[15px] opacity-80" />}
          </button>
        </div>

        <div className="p-4 pt-3 overflow-x-auto min-h-[5rem]">
          <Editor
            value={data.code}
            onValueChange={(code: string) => update(data.language, code)}
            highlight={highlight}
            padding={0}
            style={{
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontSize: '14px',
              backgroundColor: 'transparent',
              outline: 'none',
              color: '#d4d4d4',
            }}
            textareaClassName="focus:outline-none placeholder:text-slate-600"
            className="w-full h-full"
            placeholder="// Write code here..."
          />
        </div>
      </div>
    </div>
  )
}
