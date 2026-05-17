import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import { KEYS } from '../hooks/useApplications'

export default function CVCard({ cv, isSelected, compact, onView, onSelect }) {
  const queryClient = useQueryClient()
  const [deleting, setDeleting]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)

  const handleSetDefault = async (e) => {
    e.stopPropagation()
    setSettingDefault(true)
    try {
      await api.patch(`/cvs/${cv.id}/set-default`)
      queryClient.invalidateQueries({ queryKey: KEYS.cvVersions })
    } finally {
      setSettingDefault(false)
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirmDel) {
      setConfirmDel(true)
      setTimeout(() => setConfirmDel(false), 3000)
      return
    }
    setDeleting(true)
    try {
      await api.delete(`/cvs/${cv.id}`)
      queryClient.invalidateQueries({ queryKey: KEYS.cvVersions })
    } finally {
      setDeleting(false)
      setConfirmDel(false)
    }
  }

  const wordCount = cv.word_count || (cv.cv_text || '').split(/\s+/).filter(Boolean).length
  const uploadDate = new Date(cv.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div
      onClick={onSelect}
      className={`bg-[var(--color-surface)] border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'border-[var(--color-accent)] shadow-sm shadow-[var(--color-accent)]/10'
          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[var(--color-text)] truncate">{cv.name}</h3>
            {cv.is_default && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] flex-shrink-0">
                Default
              </span>
            )}
            {isSelected && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-muted)] flex-shrink-0">
                Viewing
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            {wordCount.toLocaleString()} words · Uploaded {uploadDate}
          </p>
        </div>
      </div>

      {/* Text preview — hidden in compact mode */}
      {!compact && cv.cv_text && (
        <p className="text-xs text-[var(--color-muted)] line-clamp-2 mb-3 leading-relaxed opacity-70">
          {cv.cv_text.slice(0, 150)}…
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); onView() }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isSelected
              ? 'bg-[var(--color-accent)] text-white'
              : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]'
          }`}
        >
          {isSelected ? '👁 Viewing' : '👁 View'}
        </button>

        {!cv.is_default && (
          <button
            onClick={handleSetDefault}
            disabled={settingDefault}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50"
          >
            {settingDefault ? 'Setting…' : 'Set default'}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`ml-auto px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            confirmDel
              ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)] border border-[var(--color-danger)]/40'
              : 'text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
          }`}
        >
          {deleting ? 'Deleting…' : confirmDel ? 'Confirm ✓' : 'Delete'}
        </button>
      </div>
    </div>
  )
}
