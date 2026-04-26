import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

const steps = [
  { n: '01', title: 'Upload your CV', body: 'Drop in your base CV once. Loophire remembers it for every application.' },
  { n: '02', title: 'Paste a job description', body: 'Copy any JD from LinkedIn, Greenhouse, or wherever you found the role.' },
  { n: '03', title: 'Get tailored documents', body: 'A rewritten CV and personalised cover letter — ready in seconds.' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  function handleFile(f) {
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }
    setError('')
    setFile(f)
  }

  async function uploadCV() {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/cv/upload?user_id=${USER_ID}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploaded(true)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="space-y-20">

      {/* Hero */}
      <section className="pt-12 pb-4 text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          AI-powered job applications
        </div>
        <h1 className="text-5xl font-black tracking-tight leading-tight text-[var(--color-text)]">
          Land more interviews.<br />
          <span className="text-[var(--color-accent)]">Faster.</span>
        </h1>
        <p className="text-lg text-[var(--color-muted)] max-w-xl mx-auto leading-relaxed">
          Loophire tailors your CV and writes a personalised cover letter for every role —
          matched to the job description using AI.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate('/apply')}
            className="px-6 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold text-sm transition-colors"
          >
            Start an application →
          </button>
          <button
            onClick={() => navigate('/applications')}
            className="px-6 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-muted)] text-[var(--color-muted)] hover:text-[var(--color-text)] font-semibold text-sm transition-colors"
          >
            View dashboard
          </button>
        </div>
      </section>

      {/* CV Upload */}
      <section className="max-w-xl mx-auto">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold text-[var(--color-text)]">Upload your base CV</h2>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              PDF only · max 10 MB · stored securely
            </p>
          </div>

          <div className="p-6 space-y-4">
            {uploaded ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-success)]/30">
                <span className="text-[var(--color-success)] text-lg">✓</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">CV uploaded successfully</p>
                  <p className="text-xs text-[var(--color-muted)]">{file.name}</p>
                </div>
                <button
                  onClick={() => { setUploaded(false); setFile(null) }}
                  className="ml-auto text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
                <p className="text-2xl mb-2">📄</p>
                {file ? (
                  <p className="text-sm text-[var(--color-text)] font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-[var(--color-text)] font-medium">Drop your CV here</p>
                    <p className="text-xs text-[var(--color-muted)] mt-1">or click to browse</p>
                  </>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-[var(--color-danger)]">{error}</p>
            )}

            {!uploaded && (
              <button
                onClick={uploadCV}
                disabled={!file || uploading}
                className="w-full py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {uploading ? 'Uploading…' : 'Upload CV'}
              </button>
            )}

            {uploaded && (
              <button
                onClick={() => navigate('/apply')}
                className="w-full py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold text-sm transition-colors"
              >
                Start an application →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="pb-12">
        <h2 className="text-center text-sm font-semibold text-[var(--color-muted)] uppercase tracking-widest mb-8">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map(({ n, title, body }) => (
            <div key={n} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3">
              <span className="text-xs font-bold text-[var(--color-accent)] font-mono">{n}</span>
              <h3 className="font-semibold text-[var(--color-text)]">{title}</h3>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
