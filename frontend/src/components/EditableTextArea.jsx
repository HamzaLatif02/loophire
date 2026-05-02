import { useEffect, useState } from 'react'
import CopyButton from './CopyButton'
import Spinner from './Spinner'

export default function EditableTextArea({ value, onSave, exportUrl, exportFilename, emptyMsg }) {
  const [editing, setEditing]     = useState(false)
  const [draft, setDraft]         = useState('')
  const [modified, setModified]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [savedMsg, setSavedMsg]   = useState(false)
  const [exporting, setExporting] = useState(false)

  // Warn before browser-level navigation when there are unsaved changes
  useEffect(() => {
    if (!modified) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [modified])

  function startEdit() {
    setDraft(value || '')
    setModified(false)
    setEditing(true)
  }

  function cancelEdit() {
    if (modified && !window.confirm('You have unsaved changes. Discard?')) return
    setEditing(false)
    setDraft('')
    setModified(false)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave(draft)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
      setEditing(false)
      setDraft('')
      setModified(false)
    } catch { } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (!exportUrl || exporting) return
    setExporting(true)
    try {
      const base = import.meta.env.VITE_API_URL ?? ''
      const res = await fetch(`${base}${exportUrl}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = exportFilename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch { } finally {
      setExporting(false)
    }
  }

  if (!value) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
        <p className="text-sm text-[var(--color-muted)]">{emptyMsg}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

      {/* toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-muted)]">
          {!editing && `${value.length.toLocaleString()} characters · ${value.split('\n').length} lines`}
        </span>
        <div className="flex items-center gap-3">
          {savedMsg && <span className="text-xs text-green-500">Saved!</span>}
          {!editing ? (
            <>
              <CopyButton text={value} />
              {exportUrl && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <Spinner size={13} />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  Export PDF
                </button>
              )}
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Spinner size={12} />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* body */}
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setModified(true) }}
          className="w-full p-5 text-sm text-[var(--color-text)] font-mono leading-relaxed bg-[var(--color-surface)] outline-none resize-none min-h-[400px] max-h-[65vh] overflow-y-auto block"
        />
      ) : (
        <pre className="p-5 text-sm text-[var(--color-text)] font-mono leading-relaxed whitespace-pre-wrap break-words overflow-y-auto max-h-[65vh]">
          {value}
        </pre>
      )}

    </div>
  )
}
