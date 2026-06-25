import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Deletion", 
  message = "Are you sure you want to delete it?" 
}: ConfirmationModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => { 
        e.stopPropagation()
        if (e.target === e.currentTarget) onClose() 
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm bg-[var(--surface)] rounded-2xl shadow-xl ring-1 ring-[var(--border-subtle)] p-6 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{message}</p>
        
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--text-primary)]/[0.06] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfirm()
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 active:bg-red-700 transition-colors shadow-sm shadow-red-200 focus:ring-2 focus:ring-red-200 outline-none"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
