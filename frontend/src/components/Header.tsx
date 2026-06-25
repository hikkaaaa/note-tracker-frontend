import { Plus, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface HeaderProps {
  onActionClick: () => void
  actionLabel?: string
  title?: string
  showBackButton?: boolean
  backTo?: string
}

export function Header({ 
  onActionClick, 
  actionLabel = 'New Folder', 
  title = 'Home', 
  showBackButton = false,
  backTo = '/dashboard',
}: HeaderProps) {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm"
    >
      <div className="flex items-center gap-2.5">
        {showBackButton ? (
          <Link
            to={backTo}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-150"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        ) : (
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 shadow-sm shadow-blue-200">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
        )}
        <h1 className="text-lg font-semibold text-slate-800 tracking-tight">{title}</h1>
      </div>

      <button
        id="header-action-btn"
        onClick={onActionClick}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors duration-150 shadow-sm shadow-blue-200"
      >
        <Plus className="w-4 h-4" />
        <span>{actionLabel}</span>
      </button>
    </header>
  )
}
