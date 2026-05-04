import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

const GEN_STEPS = [
  { icon: '🔍', text: 'Researching company…' },
  { icon: '📊', text: 'Scoring your fit…' },
  { icon: '✍️',  text: 'Tailoring your CV…' },
  { icon: '💌', text: 'Writing cover letter…' },
]

const LINKEDIN_STEPS = ['Fetching job listing...', 'Extracting job details...']

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
  'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
  'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

const SOURCES = ['reed', 'adzuna', 'both']

export default function ApplyPage() {
  const navigate  = useNavigate()
  const jdRef     = useRef(null)
  const formRef   = useRef(null)
  const genInterval = useRef(null)
  const liInterval  = useRef(null)

  // ── form ────────────────────────────────────────────────────────────────────
  const [form, setForm]     = useState({ job_title: '', company_name: '', job_description: '' })
  const [loading, setLoading] = useState(false)
  const [genStep, setGenStep] = useState(0)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (loading) {
      setGenStep(0)
      genInterval.current = setInterval(() => setGenStep(i => (i + 1) % GEN_STEPS.length), 3000)
    } else {
      clearInterval(genInterval.current)
    }
    return () => clearInterval(genInterval.current)
  }, [loading])

  function setField(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function fillForm(data, scrollToForm = true) {
    setForm({
      job_title:       data.job_title       || '',
      company_name:    data.company_name    || '',
      job_description: data.job_description || '',
    })
    if (scrollToForm) {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }

  async function generate(e) {
    e.preventDefault()
    if (!form.job_title || !form.company_name || !form.job_description) {
      setFormError('Please fill in all three fields before generating.')
      return
    }
    setLoading(true)
    setFormError('')
    try {
      const res = await api.post('/applications/generate', { ...form, user_id: USER_ID })
      navigate(`/applications/${res.data.id}`)
    } catch (err) {
      setFormError(err.response?.data?.error ?? err.response?.data?.detail ?? 'Generation failed — please try again.')
      setLoading(false)
    }
  }

  // ── import tab ──────────────────────────────────────────────────────────────
  const [importTab, setImportTab] = useState(0) // 0=Search Jobs  1=Import from LinkedIn

  // ── search jobs state ───────────────────────────────────────────────────────
  const [keywords, setKeywords]         = useState('')
  const [location, setLocation]         = useState('London')
  const [source, setSource]             = useState('both')
  const [searching, setSearching]       = useState(false)
  const [results, setResults]           = useState([])
  const [searchError, setSearchError]   = useState('')
  const [importingId, setImportingId]   = useState(null)
  const [searchSuccess, setSearchSuccess] = useState('')

  async function searchJobs() {
    if (!keywords.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    setSearchSuccess('')
    try {
      const res = await api.post('/jobs/search', {
        keywords: keywords.trim(),
        location: location.trim() || 'London',
        source,
      })
      setResults(res.data)
      if (res.data.length === 0) setSearchError('No jobs found — try different keywords or location.')
    } catch (err) {
      setSearchError(err.response?.data?.detail ?? 'Search failed — please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function importSearchResult(job) {
    const key = job.job_id + job.source
    setImportingId(key)
    setSearchSuccess('')
    setSearchError('')
    try {
      const res = await api.post('/jobs/import', { job_id: job.job_id, source: job.source, url: job.url })
      fillForm(res.data)
      setSearchSuccess('Job imported — review the details below.')
    } catch (err) {
      setSearchError(err.response?.data?.detail ?? 'Import failed — please try again.')
    } finally {
      setImportingId(null)
    }
  }

  // ── linkedin import state ───────────────────────────────────────────────────
  const [liUrl, setLiUrl]             = useState('')
  const [liImporting, setLiImporting] = useState(false)
  const [liStep, setLiStep]           = useState(0)
  const [liError, setLiError]         = useState('')
  const [liSuccess, setLiSuccess]     = useState(false)

  useEffect(() => {
    if (liImporting) {
      setLiStep(0)
      liInterval.current = setInterval(
        () => setLiStep(i => Math.min(i + 1, LINKEDIN_STEPS.length - 1)),
        4000,
      )
    } else {
      clearInterval(liInterval.current)
    }
    return () => clearInterval(liInterval.current)
  }, [liImporting])

  async function importLinkedIn() {
    const url = liUrl.trim()
    if (!url) return
    setLiImporting(true)
    setLiError('')
    setLiSuccess(false)
    try {
      const res = await api.post('/applications/scrape-job', { url })
      fillForm(res.data)
      setLiSuccess(true)
    } catch (err) {
      const status = err.response?.status
      setLiError(err.response?.data?.detail ?? 'Could not import this URL — please paste the job description manually.')
      if (status === 422 || status === 408) {
        setTimeout(() => jdRef.current?.focus(), 80)
      }
    } finally {
      setLiImporting(false)
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">New Application</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Search for jobs or paste a description — Loophire handles the rest.
        </p>
      </div>

      {/* ── import panel ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

        {/* tab strip */}
        <div className="flex border-b border-[var(--color-border)]">
          {['Search Jobs', 'Import from LinkedIn'].map((label, i) => (
            <button
              key={label}
              onClick={() => setImportTab(i)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                importTab === i
                  ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-px bg-[var(--color-accent)]/5'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {importTab === 0 && (
            <SearchJobsTab
              keywords={keywords}      setKeywords={setKeywords}
              location={location}      setLocation={setLocation}
              source={source}          setSource={setSource}
              onSearch={searchJobs}    searching={searching}
              results={results}        error={searchError}
              importingId={importingId} onImport={importSearchResult}
              success={searchSuccess}  inputCls={inputCls}
            />
          )}
          {importTab === 1 && (
            <LinkedInTab
              url={liUrl}              setUrl={setLiUrl}
              onImport={importLinkedIn} importing={liImporting}
              stepIdx={liStep}         error={liError}
              success={liSuccess}      setError={setLiError}
              inputCls={inputCls}
            />
          )}
        </div>
      </div>

      {/* fallback hint */}
      <p className="text-xs text-center text-[var(--color-muted)]">
        Can't find it? Paste the job description manually below.
      </p>

      {/* ── generation loading overlay ── */}
      {loading && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="h-0.5 bg-[var(--color-surface-2)]">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-[3000ms] ease-linear"
              style={{ width: `${((genStep + 1) / GEN_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="px-6 py-10 flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="text-4xl" key={genStep}>{GEN_STEPS[genStep].icon}</span>
              <p className="text-base font-semibold text-[var(--color-text)]">{GEN_STEPS[genStep].text}</p>
              <p className="text-xs text-[var(--color-muted)]">This takes around 30–60 seconds</p>
            </div>
            <div className="flex items-center gap-3">
              {GEN_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      i < genStep ? 'bg-[var(--color-success)]'
                      : i === genStep ? 'bg-[var(--color-accent)]'
                      : 'bg-[var(--color-border)]'
                    }`} />
                    <span className={`text-xs transition-colors duration-300 hidden sm:inline ${
                      i < genStep ? 'text-[var(--color-success)]'
                      : i === genStep ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-border)]'
                    }`}>
                      {step.text.replace('…', '')}
                    </span>
                  </div>
                  {i < GEN_STEPS.length - 1 && <span className="text-[var(--color-border)] text-xs">›</span>}
                </div>
              ))}
            </div>
            <Spinner size={20} />
          </div>
        </div>
      )}

      {/* ── form ── */}
      <form
        ref={formRef}
        onSubmit={generate}
        className={`space-y-5 transition-opacity duration-200 ${loading ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job Title">
            <input
              type="text"
              value={form.job_title}
              onChange={setField('job_title')}
              placeholder="e.g. Senior Software Engineer"
              disabled={loading}
              className={inputCls}
            />
          </Field>
          <Field label="Company Name">
            <input
              type="text"
              value={form.company_name}
              onChange={setField('company_name')}
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
            onChange={setField('job_description')}
            placeholder="Paste the full job description here…"
            rows={10}
            disabled={loading}
            className={`${inputCls} resize-y min-h-[200px]`}
          />
        </Field>

        <ErrorBanner message={formError} onDismiss={() => setFormError('')} />

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

// ─── Search Jobs tab ──────────────────────────────────────────────────────────

function SearchJobsTab({
  keywords, setKeywords, location, setLocation,
  source, setSource, onSearch, searching,
  results, error, importingId, onImport, success, inputCls,
}) {
  return (
    <div className="space-y-4">
      {/* inputs */}
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          value={keywords}
          onChange={e => setKeywords(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="e.g. software engineer"
          className={`${inputCls} col-span-2`}
        />
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="London"
          className={inputCls}
        />
      </div>

      {/* source toggle + search */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-xs font-medium">
          {SOURCES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                source === s
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onSearch}
          disabled={searching || !keywords.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {searching ? <><Spinner size={13} /> Searching…</> : 'Search'}
        </button>
      </div>

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {success && (
        <p className="text-xs text-[var(--color-success)] flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {success}
        </p>
      )}

      {/* results */}
      {results.length > 0 && (
        <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {results.map(job => (
            <JobCard
              key={job.job_id + job.source}
              job={job}
              importing={importingId === job.job_id + job.source}
              onImport={onImport}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function JobCard({ job, importing, onImport }) {
  return (
    <li className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/40 transition-colors">
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[var(--color-text)] leading-tight">{job.job_title}</p>
          <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
            job.source === 'reed'
              ? 'bg-blue-500/10 text-blue-400'
              : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
          }`}>
            {job.source}
          </span>
        </div>
        <p className="text-xs text-[var(--color-muted)]">{job.company_name} · {job.location}</p>
        {job.description && (
          <p className="text-xs text-[var(--color-muted)] mt-1 leading-relaxed line-clamp-2">
            {job.description}{job.description.length >= 150 ? '…' : ''}
          </p>
        )}
      </div>
      <div className="shrink-0 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => onImport(job)}
          disabled={importing}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? <Spinner size={11} /> : null}
          Import
        </button>
        {job.url && (
          <button
            type="button"
            onClick={() => window.open(job.url, '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--color-border)] text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
          >
            Go to Job ↗
          </button>
        )}
      </div>
    </li>
  )
}

// ─── LinkedIn import tab ──────────────────────────────────────────────────────

function LinkedInTab({ url, setUrl, onImport, importing, stepIdx, error, success, setError, inputCls }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && onImport()}
          placeholder="https://www.linkedin.com/jobs/view/…"
          disabled={importing}
          className={`${inputCls} flex-1`}
        />
        <button
          type="button"
          onClick={onImport}
          disabled={importing || !url.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-medium text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {importing ? <><Spinner size={13} /> {LINKEDIN_STEPS[stepIdx]}</> : 'Import'}
        </button>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Tip: Open the job listing in a new tab and paste the URL here. Both{' '}
        <span className="font-mono">linkedin.com/jobs/view/</span> and search page URLs with a job ID are supported.
      </p>

      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      {success && !error && (
        <p className="text-xs text-[var(--color-success)] flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Job imported — review the details below.
        </p>
      )}
    </div>
  )
}

// ─── shared ───────────────────────────────────────────────────────────────────

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
