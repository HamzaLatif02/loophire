import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'
import GenerationProgress from '../components/GenerationProgress'
import Spinner from '../components/Spinner'
import { useInvalidateApplications } from '../hooks/useApplications'
import { useGenerationProgress } from '../hooks/useGenerationProgress'
import api from '../utils/api'


const LINKEDIN_STEPS = ['Fetching job listing...', 'Extracting job details...']

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
  'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
  'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

const SOURCES = ['reed', 'adzuna', 'both']

export default function ApplyPage() {
  const jdRef    = useRef(null)
  const formRef  = useRef(null)
  const liInterval = useRef(null)

  const [searchParams] = useSearchParams()
  const jobId        = searchParams.get('job_id')
  const fromExt      = searchParams.get('from_extension') === 'true'

  const { progress, isComplete, wsError, applicationId, connect, reset } = useGenerationProgress()
  const [isGenerating, setIsGenerating] = useState(false)
  const invalidateApplications = useInvalidateApplications()

  // Invalidate dashboard cache when generation completes so the new
  // application appears instantly when the user lands back on the dashboard.
  // Navigation is handled by GenerationProgress (with its 1200ms delay).
  useEffect(() => {
    if (isComplete) invalidateApplications()
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── form ────────────────────────────────────────────────────────────────────
  const [form, setForm]         = useState({ job_title: '', company_name: '', job_description: '' })
  const [formError, setFormError] = useState('')

  // Pre-fill form when opened from the Chrome extension
  useEffect(() => {
    if (!jobId) return
    api.get(`/applications/${jobId}`)
      .then(({ data }) => fillForm(data))
      .catch(() => {})
  }, [jobId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── CV versions ─────────────────────────────────────────────────────────────
  const [cvVersions, setCvVersions]       = useState([])
  const [selectedCvId, setSelectedCvId]   = useState(null) // null = use default

  useEffect(() => {
    api.get('/cvs')
      .then(res => {
        setCvVersions(res.data)
        const def = res.data.find(v => v.is_default)
        if (def) setSelectedCvId(def.id)
      })
      .catch(() => {})
  }, [])

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
    setFormError('')
    reset()
    try {
      const payload = { ...form }
      if (selectedCvId) payload.cv_version_id = selectedCvId
      const res = await api.post('/applications/generate', payload)
      connect(res.data.job_id)
      setIsGenerating(true)
    } catch (err) {
      if (err.response?.status === 429) {
        setFormError(err.userMessage ?? "You've reached the generation limit. Please wait before trying again.")
      } else {
        setFormError(err.userMessage ?? err.response?.data?.detail ?? 'Generation failed — please try again.')
      }
    }
  }

  // ── import tab ──────────────────────────────────────────────────────────────
  const [importTab, setImportTab] = useState(0) // 0=Search Jobs  1=Import from LinkedIn

  // ── search jobs state ───────────────────────────────────────────────────────
  const [keywords, setKeywords]         = useState('')
  const [location, setLocation]         = useState('')
  const [source, setSource]             = useState('both')
  const [searching, setSearching]       = useState(false)
  const [results, setResults]           = useState([])
  const [searchError, setSearchError]   = useState('')
  const [importingId, setImportingId]   = useState(null)
  const [searchSuccess, setSearchSuccess] = useState('')

  // ── search filter state ─────────────────────────────────────────────────────
  const [minSalary, setMinSalary]           = useState('')
  const [maxSalary, setMaxSalary]           = useState('')
  const [employmentType, setEmploymentType] = useState('any')
  const [contractType, setContractType]     = useState('any')
  const [datePosted, setDatePosted]         = useState('')
  const [sortBy, setSortBy]                 = useState('relevance')

  function clearFilters() {
    setMinSalary('')
    setMaxSalary('')
    setEmploymentType('any')
    setContractType('any')
    setDatePosted('')
    setSortBy('relevance')
  }

  async function searchJobs() {
    if (!keywords.trim()) return
    setSearching(true)
    setSearchError('')
    setResults([])
    setSearchSuccess('')
    try {
      const payload = {
        keywords: keywords.trim(),
        location: location.trim(),
        source,
      }
      if (minSalary)                   payload.min_salary = parseInt(minSalary, 10)
      if (maxSalary)                   payload.max_salary = parseInt(maxSalary, 10)
      if (employmentType !== 'any')    payload.employment_type = employmentType
      if (contractType !== 'any')      payload.contract_type = contractType
      if (datePosted)                  payload.date_posted = datePosted
      if (sortBy !== 'relevance')      payload.sort_by = sortBy
      const res = await api.post('/jobs/search', payload)
      setResults(res.data)
      if (res.data.length === 0) setSearchError('No jobs found — try different keywords or location.')
    } catch (err) {
      if (err.response?.status === 429) {
        setSearchError(err.userMessage ?? 'Too many requests. Please slow down and try again shortly.')
      } else {
        setSearchError(err.response?.data?.detail ?? 'Search failed — please try again.')
      }
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
      if (err.response?.status === 429) {
        setSearchError(err.userMessage ?? 'Too many requests. Please slow down and try again shortly.')
      } else {
        setSearchError(err.response?.data?.detail ?? 'Import failed — please try again.')
      }
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
      if (status === 429) {
        setLiError(err.userMessage ?? 'Too many requests. Please slow down and try again shortly.')
      } else {
        setLiError(err.response?.data?.detail ?? 'Could not import this URL — please paste the job description manually.')
      }
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

      {fromExt && (
        <div className="bg-blue-900/40 border border-blue-700 rounded-lg p-3 text-sm text-blue-200">
          ✓ Job imported from LinkedIn. Review the details below and click Generate to create your tailored application.
        </div>
      )}

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
              minSalary={minSalary}         setMinSalary={setMinSalary}
              maxSalary={maxSalary}         setMaxSalary={setMaxSalary}
              employmentType={employmentType} setEmploymentType={setEmploymentType}
              contractType={contractType}   setContractType={setContractType}
              datePosted={datePosted}       setDatePosted={setDatePosted}
              sortBy={sortBy}               setSortBy={setSortBy}
              onClearFilters={clearFilters}
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

      {/* ── generation progress ── */}
      {isGenerating && (
        <GenerationProgress
          progress={progress}
          isComplete={isComplete}
          error={wsError}
          applicationId={applicationId}
          onReset={() => { setIsGenerating(false); reset() }}
        />
      )}

      {/* ── form ── */}
      <form
        ref={formRef}
        onSubmit={generate}
        className={`space-y-5 transition-opacity duration-200 ${isGenerating ? 'opacity-0 pointer-events-none select-none' : 'opacity-100'}`}
      >
        {/* CV selector */}
        {cvVersions.length > 0 && (
          <Field label="CV Version">
            <select
              value={selectedCvId ?? ''}
              onChange={e => setSelectedCvId(e.target.value ? Number(e.target.value) : null)}
              disabled={isGenerating}
              className={inputCls}
            >
              {cvVersions.map(cv => (
                <option key={cv.id} value={cv.id}>
                  {cv.name}{cv.is_default ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </Field>
        )}
        {cvVersions.length === 0 && (
          <p className="text-xs text-[var(--color-muted)]">
            No CV versions found —{' '}
            <a href="/cv-manager" className="text-[var(--color-accent)] hover:underline">upload one in CV Manager</a>
            {' '}before generating.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job Title">
            <input
              type="text"
              value={form.job_title}
              onChange={setField('job_title')}
              placeholder="e.g. Senior Software Engineer"
              disabled={isGenerating}
              className={inputCls}
            />
          </Field>
          <Field label="Company Name">
            <input
              type="text"
              value={form.company_name}
              onChange={setField('company_name')}
              placeholder="e.g. Stripe"
              disabled={isGenerating}
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
            disabled={isGenerating}
            className={`${inputCls} resize-y min-h-[200px]`}
          />
        </Field>

        <ErrorBanner message={formError} onDismiss={() => setFormError('')} />

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          Generate Application →
        </button>
      </form>

    </div>
  )
}

// ─── Filter panel ─────────────────────────────────────────────────────────────

function FiltersPanel({
  source, inputCls,
  minSalary, setMinSalary, maxSalary, setMaxSalary,
  employmentType, setEmploymentType, contractType, setContractType,
  datePosted, setDatePosted, sortBy, setSortBy, onClear,
}) {
  const [open, setOpen] = useState(false)

  const reedDisabled   = source === 'adzuna'
  const adzunaDisabled = source === 'reed'
  const reedTitle      = source === 'both' ? 'Reed only — applies when searching Reed' : undefined
  const adzunaTitle    = source === 'both' ? 'Adzuna only — applies when searching Adzuna' : undefined

  const activeCount = [
    minSalary !== '',
    maxSalary !== '',
    employmentType !== 'any',
    contractType !== 'any',
    datePosted !== '',
    sortBy !== 'relevance',
  ].filter(Boolean).length

  const labelCls = 'text-xs text-[var(--color-muted)] font-medium flex items-center gap-1.5'
  const ReedBadge   = () => <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Reed</span>
  const AdzunaBadge = () => <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)]">Adzuna</span>

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V17a1 1 0 01-1.447.894l-4-2A1 1 0 017 15v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
          </svg>
          {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
          <svg className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-[var(--color-accent)] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 mt-3' : 'max-h-0'}`}>
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]">

          {/* Minimum Salary — both */}
          <div className="space-y-1">
            <label className={labelCls}>Minimum Salary (£)</label>
            <input
              type="number"
              min={0}
              value={minSalary}
              onChange={e => setMinSalary(e.target.value)}
              placeholder="e.g. 40000"
              className={inputCls}
            />
          </div>

          {/* Employment Type — both */}
          <div className="space-y-1">
            <label className={labelCls}>Employment Type</label>
            <select value={employmentType} onChange={e => setEmploymentType(e.target.value)} className={inputCls}>
              <option value="any">Any</option>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
            </select>
          </div>

          {/* Date Posted — both */}
          <div className="space-y-1">
            <label className={labelCls}>Date Posted</label>
            <select value={datePosted} onChange={e => setDatePosted(e.target.value)} className={inputCls}>
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last week</option>
              <option value="14">Last 2 weeks</option>
            </select>
          </div>

          {/* Contract Type — Reed only */}
          <div className={`space-y-1 transition-opacity ${reedDisabled ? 'opacity-40' : ''}`} title={reedTitle}>
            <label className={labelCls}>Contract Type <ReedBadge /></label>
            <select
              value={contractType}
              onChange={e => setContractType(e.target.value)}
              disabled={reedDisabled}
              className={inputCls}
            >
              <option value="any">Any</option>
              <option value="permanent">Permanent</option>
              <option value="contract">Contract</option>
              <option value="temporary">Temporary</option>
            </select>
          </div>

          {/* Sort By — Adzuna only */}
          <div className={`space-y-1 transition-opacity ${adzunaDisabled ? 'opacity-40' : ''}`} title={adzunaTitle}>
            <label className={labelCls}>Sort By <AdzunaBadge /></label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              disabled={adzunaDisabled}
              className={inputCls}
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="salary_desc">Salary (high to low)</option>
              <option value="salary_asc">Salary (low to high)</option>
            </select>
          </div>

          {/* Maximum Salary — Adzuna only */}
          <div className={`space-y-1 transition-opacity ${adzunaDisabled ? 'opacity-40' : ''}`} title={adzunaTitle}>
            <label className={labelCls}>Maximum Salary (£) <AdzunaBadge /></label>
            <input
              type="number"
              min={0}
              value={maxSalary}
              onChange={e => setMaxSalary(e.target.value)}
              placeholder="e.g. 80000"
              disabled={adzunaDisabled}
              className={inputCls}
            />
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── Search Jobs tab ──────────────────────────────────────────────────────────

function SearchJobsTab({
  keywords, setKeywords, location, setLocation,
  source, setSource, onSearch, searching,
  results, error, importingId, onImport, success, inputCls,
  minSalary, setMinSalary, maxSalary, setMaxSalary,
  employmentType, setEmploymentType, contractType, setContractType,
  datePosted, setDatePosted, sortBy, setSortBy, onClearFilters,
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
          placeholder="Enter a job title"
          className={`${inputCls} col-span-2`}
        />
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="Enter a location"
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

      {/* filters */}
      <FiltersPanel
        source={source}
        inputCls={inputCls}
        minSalary={minSalary}         setMinSalary={setMinSalary}
        maxSalary={maxSalary}         setMaxSalary={setMaxSalary}
        employmentType={employmentType} setEmploymentType={setEmploymentType}
        contractType={contractType}   setContractType={setContractType}
        datePosted={datePosted}       setDatePosted={setDatePosted}
        sortBy={sortBy}               setSortBy={setSortBy}
        onClear={onClearFilters}
      />

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
