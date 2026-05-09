import { useCallback, useEffect, useRef, useState } from 'react'
import { useUpdateNotes } from '../hooks/useApplications'
import api from '../utils/api'

const MAX_CHARS = 5000

const STATUS_CONFIG = {
  saved:   { text: 'Saved',                       color: 'text-[var(--color-success)]' },
  unsaved: { text: 'Unsaved',                     color: 'text-[var(--color-accent)]' },
  saving:  { text: 'Saving…',                     color: 'text-[var(--color-muted)]' },
  error:   { text: 'Failed to save — will retry', color: 'text-[var(--color-danger)]' },
}

export default function NotesEditor({ applicationId, initialNotes }) {
  const [notes, setNotes]         = useState(initialNotes ?? '')
  const [saveStatus, setSaveStatus] = useState('saved')
  const debounceTimer = useRef(null)
  const lastSaved     = useRef(initialNotes ?? '')
  const updateNotes   = useUpdateNotes()

  const save = useCallback(async (text) => {
    if (text === lastSaved.current) return
    setSaveStatus('saving')
    try {
      await updateNotes.mutateAsync({ id: Number(applicationId), notes: text })
      lastSaved.current = text
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }, [applicationId, updateNotes])

  function handleChange(e) {
    const value = e.target.value
    setNotes(value)
    setSaveStatus('unsaved')
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => save(value), 1500)
  }

  function handleBlur() {
    clearTimeout(debounceTimer.current)
    save(notes)
  }

  // Fire-and-forget on unmount if unsaved changes remain
  useEffect(() => {
    return () => {
      clearTimeout(debounceTimer.current)
      if (notes !== lastSaved.current) {
        api.patch(`/applications/${applicationId}/notes`, { notes }).catch(() => {})
      }
    }
  }, [notes, applicationId]) // eslint-disable-line react-hooks/exhaustive-deps

  const status = STATUS_CONFIG[saveStatus]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--color-text)]">Notes</label>
        <span className={`text-xs flex items-center gap-1 ${status.color}`}>
          {saveStatus === 'saving' && (
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {saveStatus === 'saved' && (
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {status.text}
        </span>
      </div>

      <textarea
        value={notes}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={
          'Add notes about this application…\n\n' +
          'e.g. Recruiter: Sarah Jones · sarah@company.com\n' +
          'Salary discussed: £55,000\n' +
          'Interview format: 2 rounds — technical + values\n' +
          'Feedback: Strong on system design, brush up on SQL'
        }
        rows={8}
        maxLength={MAX_CHARS}
        className={
          'w-full bg-[var(--color-surface-2)] border rounded-lg px-4 py-3 ' +
          'text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
          'resize-y min-h-[140px] focus:outline-none transition-colors ' +
          'focus:border-[var(--color-accent)] ' +
          (saveStatus === 'error'
            ? 'border-[var(--color-danger)]'
            : 'border-[var(--color-border)]')
        }
      />

      <div className="flex justify-end">
        <span className={`text-xs ${notes.length > MAX_CHARS - 500 ? 'text-[var(--color-accent)]' : 'text-[var(--color-border)]'}`}>
          {notes.length} / {MAX_CHARS}
        </span>
      </div>
    </div>
  )
}
