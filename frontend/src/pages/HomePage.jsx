import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

export default function HomePage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)

  const [file, setFile]         = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]   = useState(null)   // first 300 chars of parsed text
  const [fileName, setFileName] = useState('')
  const [charCount, setCharCount] = useState(0)
  const [error, setError]       = useState('')

  // ── file selection ──────────────────────────────────────────────────────────

  function pickFile(f) {
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted.')
      return
    }
    setError('')
    setFile(f)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    pickFile(e.dataTransfer.files[0])
  }

  // ── upload ──────────────────────────────────────────────────────────────────

  async function upload() {
    if (!file || uploading) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post(`/cv/upload?user_id=${USER_ID}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const text = res.data.cv_text ?? ''
      setPreview(text.slice(0, 300))
      setCharCount(res.data.characters)
      setFileName(file.name)
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.detail ?? 'Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setFileName('')
    setCharCount(0)
    setError('')
  }

  const cvReady = preview !== null

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-12 pt-8 pb-16">

      {/* ── Hero ── */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
          Powered by Claude
        </div>

        <h1 className="text-5xl font-black tracking-tight text-[var(--color-text)] leading-tight">
          Loop<span className="text-[var(--color-accent)]">hire</span>
        </h1>

        <p className="text-xl font-semibold text-[var(--color-text)]">
          Your AI-powered job application agent
        </p>

        <p className="text-base text-[var(--color-muted)] leading-relaxed max-w-lg mx-auto">
          Upload your CV once. Paste any job description. Loophire tailors your
          CV, researches the company, and writes a personalised cover letter —
          in seconds.
        </p>
      </section>

      {/* ── CV Upload card ── */}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

        {/* card header */}
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[var(--color-text)]">Upload your base CV</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">PDF only · max 10 MB</p>
          </div>
          {cvReady && (
            <button
              onClick={reset}
              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Replace
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">

          {/* ── success state ── */}
          {cvReady ? (
            <div className="space-y-4">
              {/* confirmation banner */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--color-success)]/5 border border-[var(--color-success)]/25">
                <svg className="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-success)]">CV parsed successfully</p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate">
                    {fileName} · {charCount.toLocaleString()} characters extracted
                  </p>
                </div>
              </div>

              {/* text preview */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] overflow-hidden">
                <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-muted)]">Parsed text preview</span>
                  <span className="text-xs text-[var(--color-muted)]">first 300 chars</span>
                </div>
                <pre className="px-4 py-3 text-xs text-[var(--color-muted)] font-mono leading-relaxed whitespace-pre-wrap break-words">
                  {preview}{charCount > 300 ? '…' : ''}
                </pre>
              </div>

              {/* CTA */}
              <button
                onClick={() => navigate('/apply')}
                className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold text-sm transition-colors"
              >
                Start a New Application →
              </button>
            </div>
          ) : (
            /* ── upload state ── */
            <div className="space-y-4">
              {/* drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => !uploading && inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                  uploading
                    ? 'border-[var(--color-border)] cursor-default'
                    : dragging
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 cursor-copy'
                    : 'border-[var(--color-border)] hover:border-[var(--color-muted)] cursor-pointer'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files[0])}
                />

                {uploading ? (
                  /* spinner while parsing */
                  <div className="flex flex-col items-center gap-3">
                    <Spinner size={28} />
                    <p className="text-sm text-[var(--color-muted)]">Uploading and parsing your CV…</p>
                  </div>
                ) : file ? (
                  /* file selected, not yet uploaded */
                  <div className="flex flex-col items-center gap-2">
                    <PdfIcon />
                    <p className="text-sm font-medium text-[var(--color-text)]">{file.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {(file.size / 1024).toFixed(0)} KB · click to change
                    </p>
                  </div>
                ) : (
                  /* idle */
                  <div className="flex flex-col items-center gap-2">
                    <PdfIcon muted />
                    <p className="text-sm font-medium text-[var(--color-text)]">Drop your CV here</p>
                    <p className="text-xs text-[var(--color-muted)]">or click to browse files</p>
                  </div>
                )}
              </div>

              <ErrorBanner message={error} onDismiss={() => setError('')} />

              {/* upload button */}
              <button
                onClick={upload}
                disabled={!file || uploading}
                className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Spinner size={16} />
                    Parsing…
                  </>
                ) : 'Upload CV'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── standalone CTA (shown even before upload) ── */}
      {!cvReady && (
        <div className="text-center">
          <p className="text-sm text-[var(--color-muted)] mb-3">Already uploaded your CV?</p>
          <button
            onClick={() => navigate('/apply')}
            className="px-6 py-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] text-[var(--color-muted)] hover:text-[var(--color-accent)] font-semibold text-sm transition-colors"
          >
            Start a New Application →
          </button>
        </div>
      )}

    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

function PdfIcon({ muted = false }) {
  return (
    <svg
      className={`w-10 h-10 ${muted ? 'text-[var(--color-border)]' : 'text-[var(--color-accent)]'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
