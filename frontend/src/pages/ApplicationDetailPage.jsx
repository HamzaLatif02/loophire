import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

// ─── constants ───────────────────────────────────────────────────────────────

const TABS = ['Tailored CV', 'Cover Letter', 'Analysis']

const STATUS_OPTIONS = [
  { value: 'draft',        label: 'Draft' },
  { value: 'applied',      label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'rejected',     label: 'Rejected' },
  { value: 'offer',        label: 'Offer' },
]

const STATUS_STYLES = {
  draft:        { pill: 'bg-[var(--color-surface-2)] text-[var(--color-muted)] border-[var(--color-border)]' },
  applied:      { pill: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  interviewing: { pill: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20' },
  rejected:     { pill: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20' },
  offer:        { pill: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' },
}

function scoreColor(score) {
  if (score == null) return 'var(--color-muted)'
  if (score >= 70)   return 'var(--color-success)'
  if (score >= 40)   return 'var(--color-accent)'
  return 'var(--color-danger)'
}

function scoreFitLabel(score) {
  if (score == null) return 'Not scored'
  if (score >= 70)   return 'Strong fit'
  if (score >= 40)   return 'Moderate fit'
  return 'Low fit'
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp]               = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [activeTab, setActiveTab]   = useState(0)
  const [savingStatus, setSaving]   = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    api.get(`/applications/${id}?user_id=${USER_ID}`)
      .then((r) => setApp(r.data))
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false))
  }, [id])

  // close status dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function changeStatus(status) {
    if (savingStatus || status === app.status) { setStatusOpen(false); return }
    setSaving(true)
    setStatusOpen(false)
    try {
      const r = await api.patch(`/applications/${id}/status?user_id=${USER_ID}`, { status })
      setApp(r.data)
    } catch { /* non-critical */ } finally {
      setSaving(false)
    }
  }

  // ── loading / error ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Spinner />
        <p className="text-sm text-[var(--color-muted)]">Loading application…</p>
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="py-32 text-center space-y-4">
        <p className="text-[var(--color-danger)] text-sm">{error || 'Not found'}</p>
        <button
          onClick={() => navigate('/applications')}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
        >
          ← Back to dashboard
        </button>
      </div>
    )
  }

  const score   = app.fit_score != null ? Math.round(app.fit_score) : null
  const color   = scoreColor(score)
  const fitLabel = scoreFitLabel(score)
  const statusStyle = STATUS_STYLES[app.status] ?? STATUS_STYLES.draft

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* ── back ── */}
      <button
        onClick={() => navigate('/applications')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Dashboard
      </button>

      {/* ── header card ── */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">

          {/* score circle */}
          {score != null && (
            <div className="shrink-0 flex flex-col items-center gap-1">
              <ScoreCircle score={score} color={color} />
              <span className="text-xs text-[var(--color-muted)]">{fitLabel}</span>
            </div>
          )}

          {/* title + company */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[var(--color-text)] leading-tight">{app.job_title}</h1>
            <p className="text-base text-[var(--color-muted)] mt-0.5">{app.company_name}</p>
            <p className="text-xs text-[var(--color-muted)] mt-2 tabular-nums">
              Created {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* status dropdown */}
          <div className="shrink-0" ref={dropdownRef}>
            <p className="text-xs text-[var(--color-muted)] mb-1.5 text-right">Status</p>
            <div className="relative">
              <button
                onClick={() => setStatusOpen((o) => !o)}
                disabled={savingStatus}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition-colors ${statusStyle.pill} ${savingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {savingStatus ? (
                  <Spinner size={12} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                )}
                {app.status}
                <svg className={`w-3 h-3 transition-transform ${statusOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {statusOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-xl z-20 overflow-hidden py-1">
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => changeStatus(value)}
                      className={`w-full text-left px-4 py-2 text-xs capitalize transition-colors ${
                        value === app.status
                          ? 'text-[var(--color-accent)] font-semibold'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── tabs ── */}
      <div>
        <div className="border-b border-[var(--color-border)] mb-6">
          <div className="flex gap-0">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === i
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 0 && (
          <TextPanel content={app.tailored_cv} emptyMsg="No tailored CV was generated for this application." />
        )}
        {activeTab === 1 && (
          <TextPanel content={app.cover_letter} emptyMsg="No cover letter was generated for this application." />
        )}
        {activeTab === 2 && (
          <AnalysisPanel app={app} score={score} color={color} fitLabel={fitLabel} />
        )}
      </div>

    </div>
  )
}

// ─── score circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score, color }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ

  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      {/* track */}
      <circle cx="48" cy="48" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
      {/* fill */}
      <circle
        cx="48" cy="48" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        transform="rotate(-90 48 48)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* label */}
      <text x="48" y="44" textAnchor="middle" fontSize="22" fontWeight="800" fill={color} fontFamily="system-ui">
        {score}
      </text>
      <text x="48" y="60" textAnchor="middle" fontSize="9" fill="var(--color-muted)" fontFamily="system-ui">
        / 100
      </text>
    </svg>
  )
}

// ─── text panel ───────────────────────────────────────────────────────────────

function TextPanel({ content, emptyMsg }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  function copy() {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!content) {
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
          {content.length.toLocaleString()} characters · {content.split('\n').length} lines
        </span>
        <button
          onClick={copy}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            copied
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-accent)]'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {/* body */}
      <pre className="p-5 text-sm text-[var(--color-text)] font-mono leading-relaxed whitespace-pre-wrap break-words overflow-y-auto max-h-[65vh]">
        {content}
      </pre>
    </div>
  )
}

// ─── analysis panel ───────────────────────────────────────────────────────────

function AnalysisPanel({ app, score, color, fitLabel }) {
  const research = app.company_research
  const gaps     = app.keyword_gaps ?? []

  return (
    <div className="space-y-5">

      {/* fit summary */}
      <SectionCard title="Fit Summary">
        <div className="flex items-start gap-4">
          <div
            className="shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-lg font-black border-2"
            style={{ color, borderColor: color, background: `color-mix(in srgb, ${color} 8%, transparent)` }}
          >
            {score ?? '—'}
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text)]">{fitLabel}</p>
            <p className="text-sm text-[var(--color-muted)] mt-1 leading-relaxed">
              {score == null
                ? 'No fit score available for this application.'
                : score >= 70
                ? 'Your background is a strong match for this role. The keyword gaps below are minor — address them lightly in your cover letter.'
                : score >= 40
                ? 'A reasonable fit with some gaps to bridge. Focus on the keyword gaps below when tailoring your application.'
                : 'Significant gaps between your profile and this role. Consider whether to apply or invest time in building the missing skills first.'}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* keyword gaps */}
      <SectionCard title="Keyword Gaps">
        {gaps.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No keyword gaps identified.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {gaps.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20"
              >
                <svg className="w-2.5 h-2.5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {kw}
              </span>
            ))}
          </div>
        )}
      </SectionCard>

      {/* company research */}
      {research ? (
        <>
          {research.culture_summary && (
            <SectionCard title="Company Culture">
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">{research.culture_summary}</p>
              {research.tone_recommendation && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[var(--color-muted)]">Recommended tone:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)] capitalize">
                    {research.tone_recommendation}
                  </span>
                </div>
              )}
            </SectionCard>
          )}

          {research.tech_stack?.length > 0 && (
            <SectionCard title="Tech Stack">
              <div className="flex flex-wrap gap-2">
                {research.tech_stack.map((t) => (
                  <span
                    key={t}
                    className="px-3 py-1 rounded-md text-xs font-mono bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {research.recent_news?.length > 0 && (
            <SectionCard title="Recent News">
              <ul className="space-y-2.5">
                {research.recent_news.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-muted)]">
                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {research.red_flags?.length > 0 && (
            <SectionCard title="Red Flags" accent="danger">
              <ul className="space-y-2.5">
                {research.red_flags.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--color-danger)]">
                    <svg className="w-4 h-4 shrink-0 mt-0.5 opacity-80" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </>
      ) : (
        <SectionCard title="Company Research">
          <p className="text-sm text-[var(--color-muted)]">No company research available for this application.</p>
        </SectionCard>
      )}

    </div>
  )
}

// ─── shared components ────────────────────────────────────────────────────────

function SectionCard({ title, accent = 'default', children }) {
  const headerAccent = accent === 'danger'
    ? 'text-[var(--color-danger)] border-[var(--color-danger)]/20 bg-[var(--color-danger)]/5'
    : 'text-[var(--color-muted)] border-[var(--color-border)] bg-transparent'

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className={`px-5 py-3 border-b ${headerAccent}`}>
        <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Spinner({ size = 18 }) {
  return (
    <svg
      style={{ width: size, height: size }}
      className="animate-spin text-[var(--color-accent)]"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
