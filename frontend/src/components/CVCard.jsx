import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../utils/api'
import { KEYS } from '../hooks/useApplications'
import usePdfAction from '../hooks/usePdfAction'
import useDemoGuard from '../hooks/useDemoGuard'
import DemoBlockedMessage from './DemoBlockedMessage'

const TEMPLATE_OPTIONS = [
  { id: 'auto',       name: 'Auto',       desc: 'Auto-detect best match' },
  { id: 'classic',    name: 'Classic',    desc: 'Traditional single-column' },
  { id: 'minimal',    name: 'Minimal',    desc: 'Clean, whitespace-focused' },
  { id: 'two_column', name: 'Two Column', desc: 'Sidebar + main layout' },
  { id: 'compact',    name: 'Compact',    desc: 'Dense, space-efficient' },
]

export default function CVCard({ cv, isSelected, compact, onView, onSelect }) {
  const queryClient = useQueryClient()
  const dropdownRef = useRef(null)

  const [deleting, setDeleting]         = useState(false)
  const [confirmDel, setConfirmDel]     = useState(false)
  const [settingDefault, setSettingDefault] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [updating, setUpdating]         = useState(false)

  const { loading: previewing, openInNewTab: previewPdf } = usePdfAction()
  const { loading: downloading, download: downloadPdf }   = usePdfAction()
  const { isDemo, guard: guardCard, visible: cardBlocked } = useDemoGuard()

  useEffect(() => {
    if (!showDropdown) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const handleTemplateChange = async (newId) => {
    setUpdating(true)
    try {
      await api.patch(`/cvs/${cv.id}/template`, null, { params: { template_id: newId } })
      queryClient.invalidateQueries({ queryKey: KEYS.cvVersions })
      setShowDropdown(false)
    } finally {
      setUpdating(false)
    }
  }

  const handleSetDefault = (e) => {
    e.stopPropagation()
    guardCard(async () => {
      setSettingDefault(true)
      try {
        await api.patch(`/cvs/${cv.id}/set-default`)
        queryClient.invalidateQueries({ queryKey: KEYS.cvVersions })
      } finally {
        setSettingDefault(false)
      }
    })
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    guardCard(() => {
      if (!confirmDel) {
        setConfirmDel(true)
        setTimeout(() => setConfirmDel(false), 3000)
        return
      }
      setDeleting(true)
      api.delete(`/cvs/${cv.id}`)
        .then(() => queryClient.invalidateQueries({ queryKey: KEYS.cvVersions }))
        .finally(() => { setDeleting(false); setConfirmDel(false) })
    })
  }

  const handlePreviewPdf = (e) => {
    e.stopPropagation()
    previewPdf(`/cvs/${cv.id}/preview-pdf`)
  }

  const handleDownloadPdf = (e) => {
    e.stopPropagation()
    const safeName = `${cv.name}_${cv.template_id || 'classic'}.pdf`
    downloadPdf(`/cvs/${cv.id}/download-pdf`, safeName)
  }

  const wordCount = cv.word_count || (cv.cv_text || '').split(/\s+/).filter(Boolean).length
  const uploadDate = new Date(cv.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const currentTemplate = TEMPLATE_OPTIONS.find(t => t.id === cv.template_id) || TEMPLATE_OPTIONS[1]

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

        {!isDemo && (
          <button
            onClick={handlePreviewPdf}
            disabled={previewing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-50"
          >
            {previewing ? 'Opening…' : 'Preview PDF'}
          </button>
        )}

        {!isDemo && (
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors disabled:opacity-50"
          >
            {downloading ? 'Downloading…' : 'Download PDF'}
          </button>
        )}

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

      <DemoBlockedMessage visible={cardBlocked} />

      {/* Template dropdown — hidden in demo */}
      {!isDemo && (
        <div
          ref={dropdownRef}
          className="mt-2 pt-2 border-t border-[var(--color-border)] relative"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setShowDropdown(v => !v)}
            disabled={updating}
            className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <span>Template:</span>
            <span className="text-[var(--color-text)]">{currentTemplate.name}</span>
            <span className="text-[var(--color-muted)] ml-0.5">{showDropdown ? '▲' : '▼'}</span>
          </button>

          {showDropdown && (
            <div className="absolute left-0 top-full mt-1 z-20 w-52 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden">
              {TEMPLATE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  disabled={updating}
                  className={`w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors ${
                    cv.template_id === t.id || (t.id === 'classic' && !cv.template_id)
                      ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                      : 'text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                  }`}
                >
                  <span className="text-xs font-medium">{t.name}</span>
                  <span className="text-xs text-[var(--color-muted)]">{t.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
