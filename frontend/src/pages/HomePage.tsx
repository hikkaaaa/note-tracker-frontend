import { useEffect, useState, useCallback } from 'react'
import { Folder, Search, MoreHorizontal, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CreateFolderModal } from '../components/CreateFolderModal'
import { ConfirmationModal } from '../components/ConfirmationModal'
import { Header } from '../components/Header'
import { API_BASE } from '../lib/api'

interface FolderItem {
  id: number
  name: string
  purpose?: string
  color?: string
  created_at?: string
  notes?: any[]
}

export function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/folders/`)
      if (res.ok) {
        const data: FolderItem[] = await res.json()
        setFolders(data)
      }
    } catch {
      // Backend might not be reachable — show empty state gracefully
    } finally {
      setIsLoadingFolders(false)
    }
  }, [])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  const filteredFolders = folders.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.purpose ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleModalSuccess = () => {
    fetchFolders()
  }

  return (
    <div id="home-page" className="min-h-screen bg-[#f0f4f8]">
      <Header onActionClick={() => setIsModalOpen(true)} />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">My Folders</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {folders.length} folder{folders.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="folder-search"
              type="text"
              placeholder="Search folders…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm text-slate-700 placeholder-slate-400 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-150 w-56"
            />
          </div>
        </div>

        {isLoadingFolders ? (
          <LoadingGrid />
        ) : filteredFolders.length === 0 ? (
          <EmptyState
            hasSearch={searchQuery.length > 0}
            onCreateFolder={() => setIsModalOpen(true)}
          />
        ) : (
          <div
            id="folders-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredFolders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} onDeleteSuccess={fetchFolders} />
            ))}
          </div>
        )}
      </main>

      <CreateFolderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────── */

function FolderCard({ folder, onDeleteSuccess }: { folder: FolderItem, onDeleteSuccess: () => void }) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!showMenu) return
    const closeMenu = () => setShowMenu(false)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [showMenu])

  const handleDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/folders/${folder.id}`, { method: 'DELETE' })
      if (res.ok) onDeleteSuccess()
    } catch {
       // Ignore error
    }
  }
  const noteCount = folder.notes?.length || 0

  const maxPages = Math.min(noteCount, 3)

  const color = folder.color || 'blue'
  const isRed = color === 'red'
  const isGreen = color === 'green'

  const backGradients = isGreen ? 'from-emerald-400 to-emerald-500' : isRed ? 'from-red-400 to-red-500' : 'from-blue-400 to-blue-500'
  const frontGradients = isGreen ? 'from-emerald-500/95 to-emerald-400/60' : isRed ? 'from-red-500/95 to-red-400/60' : 'from-blue-500/95 to-blue-400/60'

  return (
    <article
      onClick={() => navigate(`/folders/${folder.id}`)}
      className="group relative w-full aspect-[5/4] sm:aspect-[4/3] block cursor-pointer hover:-translate-y-1.5 transition-transform duration-300 isolate"
    >
      {/* 1. Back Cover of Folder */}
      <div 
        className={`absolute inset-x-0 bottom-0 h-[88%] bg-gradient-to-br ${backGradients} rounded-3xl shadow-sm z-0`}
      />

      {/* 2. Stacked Pages */}
      <div className="absolute inset-x-0 bottom-[10%] top-6 flex items-end justify-center z-10 perspective pointer-events-none">
        {Array.from({ length: maxPages }).map((_, index) => {
          const depth = maxPages - 1 - index
          
          return (
            <div
              key={index}
              className={`absolute bottom-0 w-[84%] bg-white rounded-t-xl rounded-b-md shadow-[0_-2px_10px_rgba(0,0,0,0.06)] border border-slate-100 flex flex-col p-4 overflow-hidden origin-bottom transition-all duration-300`}
              style={{
                zIndex: index,
                height: '92%',
                transform: `translateY(-${depth * 10}px) scale(${1 - depth * 0.05})`,
              }}
            >
              <div className="space-y-2 mt-1" style={{ opacity: Math.max(0.1, 0.4 - depth * 0.15) }}>
                {depth === 0 ? (
                  <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 tracking-wide mb-1 opacity-90 truncate">The team can add texts and...</div>
                ) : null}
                <div className="h-1.5 sm:h-2 w-full bg-slate-200 rounded-full" />
                <div className="h-1.5 sm:h-2 w-[90%] bg-slate-200 rounded-full" />
                <div className="h-1.5 sm:h-2 w-3/4 bg-slate-200 rounded-full" />
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Front Glass Cover */}
      <div className="absolute bottom-0 left-0 w-full h-[65%] z-20 overflow-hidden rounded-b-3xl">
        <div 
          className={`absolute inset-0 bg-gradient-to-t ${frontGradients} backdrop-blur-md border-t border-white/30 border-r border-l shadow-[0_-4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)]`}
          style={{ clipPath: 'polygon(0 0, 40% 0%, 55% 15%, 100% 15%, 100% 100%, 0 100%)' }}
        />
        
        {/* Content overlaid on the glass */}
        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 opacity-100">
          <h3 className="font-bold text-white text-lg sm:text-xl tracking-tight drop-shadow-md truncate w-full">
            {folder.name}
          </h3>
          <p className="font-medium text-white/90 text-[13px] sm:text-sm mt-0.5 drop-shadow-sm">
            {noteCount} note{noteCount !== 1 ? 's' : ''}
          </p>
          
          <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-all border border-transparent hover:border-white/30 relative"
              aria-expanded={showMenu}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showMenu && (
              <div 
                className="absolute bottom-full right-0 mb-1 w-32 bg-white rounded-xl shadow-xl ring-1 ring-slate-100 py-1.5 z-50 animate-modal-in origin-bottom-right"
                onClick={(e) => { e.stopPropagation() }}
              >
                <button 
                  onClick={() => { setShowMenu(false); setShowConfirm(true) }}
                  className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={showConfirm} 
        onClose={() => setShowConfirm(false)} 
        onConfirm={handleDelete}
        title="Delete Folder"
        message={`Are you sure you want to delete "${folder.name}" and all its notes? This action cannot be undone.`}
      />
    </article>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
          <div className="h-20 rounded-xl bg-slate-100 mb-4" />
          <div className="h-4 rounded-lg bg-slate-100 mb-2 w-3/4" />
          <div className="h-3 rounded-lg bg-slate-50 w-1/2" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({
  hasSearch,
  onCreateFolder,
}: {
  hasSearch: boolean
  onCreateFolder: () => void
}) {
  return (
    <div
      id="empty-state"
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <span className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
        <Folder className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
      </span>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">
        {hasSearch ? 'No matching folders' : 'No folders yet'}
      </h3>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        {hasSearch
          ? 'Try a different search term.'
          : 'Create your first folder to start organising your notes.'}
      </p>
      {!hasSearch && (
        <button
          id="empty-create-folder-btn"
          onClick={onCreateFolder}
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 transition-colors duration-150 shadow-sm shadow-blue-200"
        >
          Create a Folder
        </button>
      )}
    </div>
  )
}
