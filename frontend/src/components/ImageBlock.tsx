import { useRef, useState } from 'react'
import { ImagePlus, Upload, X } from 'lucide-react'

interface ImageData {
  src: string
}

// Read a File into a data URL so the image survives reloads and the local-only
// workspace (no upload server) — it's stored inline in the section content.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ImageBlock({ content, onChange }: { content: string, onChange: (c: string) => void }) {
  let data: ImageData = { src: '' }
  try {
    const parsed = JSON.parse(content || '{}')
    if (typeof parsed.src === 'string') data = parsed
  } catch {}

  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const setSrc = (src: string) => onChange(JSON.stringify({ src }))

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setSrc(await fileToDataUrl(file))
  }

  if (data.src) {
    return (
      <div className="group/img relative w-full">
        <img
          src={data.src}
          alt=""
          className="w-full rounded-xl border border-[var(--border-subtle)] object-contain"
        />
        <button
          onClick={() => setSrc('')}
          title="Remove image"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface)]/90 text-[var(--text-secondary)] opacity-0 shadow-sm backdrop-blur transition-all hover:text-[var(--danger-text)] group-hover/img:opacity-100 print:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files) }}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all print:hidden ${
        isDragOver ? 'border-[var(--accent)] bg-[var(--accent-tint)]' : 'border-[var(--text-primary)]/15 hover:border-[var(--text-primary)]/30 hover:bg-[var(--text-primary)]/[0.02]'
      }`}
    >
      <span className="grid h-12 w-12 place-items-center rounded-[14px]" style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}>
        {isDragOver ? <Upload className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-bold text-[var(--text-primary)]">
          {isDragOver ? 'Drop to add image' : 'Drag & drop an image'}
        </span>
        <span className="text-[12px] text-[var(--text-secondary)]">or click to browse files</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
