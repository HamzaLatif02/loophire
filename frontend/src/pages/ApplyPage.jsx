import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

const STEPS = [
  { icon: '🔍', text: 'Researching company…' },
  { icon: '📊', text: 'Scoring your fit…' },
  { icon: '✍️',  text: 'Tailoring your CV…' },
  { icon: '💌', text: 'Writing cover letter…' },
]

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
  'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
  'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

export default function ApplyPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ job_title: '', company_name: '', job_description: '' })
  const [loading, setLoading] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [error, setError] = useState('')
  const intervalRef = useRef(null)

  const [importUrl, setImportUrl]       = useState('')
  const [importing, setImporting]       = useState(false)
  const [importError, setImportError]   = useState('')
  const [importedUrl, setImportedUrl]   = useState('')
  const jdRef = useRef(null)

  useEffect(() => {
    if (loading) {
      setStepIdx(0)
      intervalRef.current = setInterval(() => {
        setStepIdx((i) => (i + 1) % STEPS.length)
      }, 3000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [loading])

  async function importJob() {
    const url = importUrl.trim()
    if (!url) return
    setImporting(true)
    setImportError('')
    setImportedUrl('')
    try {
      const res = await api.post('/applications/scrape-job', { url })
      setForm({
        job_title: res.data.job_title || '',
        company_name: res.data.company_name || '',
        job_description: res.data.job_description || '',
      })
      setImportedUrl(url)
    } catch (err) {
      const status = err.response?.status
      const detail = err.response?.data?.detail ?? 'Could not import this URL — please paste the job description manually.'
      setImportError(detail)
      // For blocked sites (422) or timeouts (408), focus the JD field so the user can paste
      if (status === 422 || status === 408) {
        setTimeout(() => jdRef.current?.focus(), 50)
      }
    } finally {
      setImporting(false)
    }
  }

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function generate(e) {
    e.preventDefault()
    if (!form.job_title || !form.company_name || !form.job_description) {
      setError('Please fill in all three fields before generating.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/applications/generate', { ...form, user_id: USER_ID })
      navigate(`/applications/${res.data.id}`)
    } catch (err) {
      const detail = err.response?.data?.error ?? err.response?.data?.detail ?? 'Generation failed — please try again.'
      setError(detail)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">New Application</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Paste the job description and Loophire handles the rest.
        </p>
      </div>

      {/* ── URL importer ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">Import from URL</p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">Paste a LinkedIn or Indeed job listing URL to auto-fill the form.</p>
        </div>

        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => { setImportUrl(e.target.value); setImportError('') }}
            onKeyDown={(e) => e.key === 'Enter' && importJob()}
            placeholder="https://www.linkedin.com/jobs/view/…"
            disabled={importing || loading}
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={importJob}
            disabled={importing || loading || !importUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {importing ? <><Spinner size={13} /> Importing…</> : 'Import'}
          </button>
        </div>

        {importError && (
          <p className="text-xs text-[var(--color-danger)]">{importError}</p>
        )}
        {importedUrl && !importError && (
          <p className="text-xs text-[var(--color-success)] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Job listing imported — review the fields below and click Generate.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted)] font-medium">or fill in manually</span>
        <div className="flex-1 border-t border-[var(--color-border)]" />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="h-0.5 bg-[var(--color-surface-2)]">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-[3000ms] ease-linear"
              style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="px-6 py-10 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-4xl" key={stepIdx}>{STEPS[stepIdx].icon}</span>
              <p className="text-base font-semibold text-[var(--color-text)]">{STEPS[stepIdx].text}</p>
              <p className="text-xs text-[var(--color-muted)]">This takes around 30–60 seconds</p>
            </div>
            <div className="flex items-center gap-3">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      i < stepIdx ? 'bg-[var(--color-success)]'
                      : i === stepIdx ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--color-border)]'
                    }`} />
                    <span className={`text-xs transition-colors duration-300 hidden sm:inline ${
                      i < stepIdx ? 'text-[var(--color-success)]'
                      : i === stepIdx ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-border)]'
                    }`}>
                      {step.text.replace('…', '')}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && <span className="text-[var(--color-border)] text-xs">›</span>}
                </div>
              ))}
            </div>
            <Spinner size={20} />
          </div>
        </div>
      )}

      {/* Form (hidden while loading, stays mounted so values survive an error) */}
      <form
        onSubmit={generate}
        className={`space-y-5 transition-opacity duration-200 ${loading ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job Title">
            <input
              type="text"
              value={form.job_title}
              onChange={set('job_title')}
              placeholder="e.g. Senior Software Engineer"
              disabled={loading}
              className={inputCls}
            />
          </Field>
          <Field label="Company Name">
            <input
              type="text"
              value={form.company_name}
              onChange={set('company_name')}
              placeholder="e.g. Stripe"
              disabled={loading}
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Job Description">
          <textarea
            ref={jdRef}
            value={form.job_description}
            onChange={set('job_description')}
            placeholder="Paste the full job description here…"
            rows={10}
            disabled={loading}
            className={`${inputCls} resize-y min-h-[200px]`}
          />
        </Field>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          Generate Application →
        </button>
      </form>

    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--color-text)]">
        {label}<span className="text-[var(--color-accent)] ml-0.5">*</span>
      </span>
      {children}
    </label>
  )
}
