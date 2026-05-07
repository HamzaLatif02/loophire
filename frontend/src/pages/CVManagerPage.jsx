import { useEffect, useRef, useState } from 'react'
import Spinner from '../components/Spinner'
import api from '../utils/api'


function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatSize(chars) {
  if (chars >= 1000) return `${(chars / 1000).toFixed(1)}k chars`
  return `${chars} chars`
}

export default function CVManagerPage() {
  const [versions, setVersions]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  // upload form state
  const [name, setName]           = useState('')
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const fileRef = useRef(null)

  async function fetchVersions() {
    try {
      const res = await api.get('/cvs')
      setVersions(res.data)
    } catch {
      setError('Failed to load CV versions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVersions() }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!name.trim()) { setUploadError('Please enter a name for this CV.'); return }
    if (!file)        { setUploadError('Please select a PDF file.'); return }

    setUploading(true)
    setUploadError('')
    setUploadSuccess('')

    const form = new FormData()
    form.append('file', file)

    try {
      await api.post(`/cvs/upload?name=${encodeURIComponent(name.trim())}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadSuccess(`"${name.trim()}" uploaded successfully.`)
      setName('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await fetchVersions()
    } catch (err) {
      setUploadError(err.response?.data?.detail ?? 'Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSetDefault(id) {
    try {
      await api.patch(`/cvs/${id}/set-default`)
      await fetchVersions()
    } catch {
      setError('Failed to set default.')
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/cvs/${id}`)
      await fetchVersions()
    } catch {
      setError('Failed to delete CV version.')
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
    'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
    'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">

      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">CV Manager</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Store multiple CV versions and pick the right one per application.
        </p>
      </div>

      {/* ── upload form ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Upload a new CV</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setUploadError(''); setUploadSuccess('') }}
            placeholder="CV name — e.g. Software Engineer, Data Analyst"
            className={inputCls}
            disabled={uploading}
          />
          <div className="flex items-center gap-3">
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
                onChange={e => { setFile(e.target.files[0] || null); setUploadError(''); setUploadSuccess('') }}
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
          {uploadSuccess && (
            <p className="text-xs text-[var(--color-success)] flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {uploadSuccess}
            </p>
          )}
        </form>
      </div>

      {/* ── version list ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Stored versions</h2>

        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size={20} />
          </div>
        ) : versions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] py-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">No CV versions yet — upload one above.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {versions.map(cv => (
              <li
                key={cv.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  cv.is_default
                    ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                {/* icon */}
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  cv.is_default ? 'bg-[var(--color-accent)]/15' : 'bg-[var(--color-surface-2)]'
                }`}>
                  <svg className={`w-4 h-4 ${cv.is_default ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">{cv.name}</p>
                    {cv.is_default && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {formatSize(cv.characters)} · uploaded {formatDate(cv.created_at)}
                  </p>
                </div>

                {/* actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {!cv.is_default && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(cv.id)}
                      className="text-xs px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
                    >
                      Set default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(cv.id, cv.name)}
                    className="text-xs px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
