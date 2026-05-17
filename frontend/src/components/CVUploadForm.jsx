import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Spinner from './Spinner'
import api from '../utils/api'
import { KEYS } from '../hooks/useApplications'

export default function CVUploadForm({ onSuccess }) {
  const queryClient = useQueryClient()
  const [name, setName]           = useState('')
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  async function handleUpload(e) {
    e.preventDefault()
    if (!name.trim()) { setUploadError('Please enter a name for this CV.'); return }
    if (!file)        { setUploadError('Please select a PDF file.'); return }

    setUploading(true)
    setUploadError('')

    const form = new FormData()
    form.append('file', file)

    try {
      await api.post(`/cvs/upload?name=${encodeURIComponent(name.trim())}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: KEYS.cvVersions })
      setName('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess?.()
    } catch (err) {
      setUploadError(err.userMessage ?? err.response?.data?.detail ?? 'Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
    'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
    'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

  return (
    <form onSubmit={handleUpload} className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={e => { setName(e.target.value); setUploadError('') }}
        placeholder="CV name — e.g. Software Engineer, Data Analyst"
        className={inputCls}
        disabled={uploading}
      />
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <label className="flex-1 cursor-pointer">
          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-dashed text-sm transition-colors ${
            file
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
          }`}>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{file ? file.name : 'Choose PDF'}</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={e => { setFile(e.target.files[0] || null); setUploadError('') }}
            disabled={uploading}
          />
        </label>
        <button
          type="submit"
          disabled={uploading}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {uploading ? <><Spinner size={13} /> Uploading…</> : 'Upload'}
        </button>
      </div>
      {uploadError && <p className="text-xs text-[var(--color-danger)]">{uploadError}</p>}
    </form>
  )
}
