import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

const TABS = ['Fit Analysis', 'Tailored CV', 'Cover Letter', 'Company Research']

const STATUS_OPTIONS = ['draft', 'applied', 'interviewing', 'rejected', 'offer']

const STATUS_STYLES = {
  draft:        'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
  applied:      'bg-blue-500/10 text-blue-400',
  interviewing: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  rejected:     'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  offer:        'bg-[var(--color-success)]/10 text-[var(--color-success)]',
}

export default function ApplicationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    api.get(`/applications/${id}?user_id=${USER_ID}`)
      .then((r) => setApp(r.data))
      .catch(() => setError('Application not found.'))
      .finally(() => setLoading(false))
  }, [id])

  async function changeStatus(status) {
    setUpdatingStatus(true)
    try {
      const r = await api.patch(`/applications/${id}/status?user_id=${USER_ID}`, { status })
      setApp(r.data)
    } catch {
      // status change failure is non-critical; ignore
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) return <div className="py-24 text-center text-[var(--color-muted)] text-sm">Loading…</div>
  if (error || !app) return (
    <div className="py-24 text-center">
      <p className="text-[var(--color-danger)] text-sm">{error || 'Not found'}</p>
      <button onClick={() => navigate('/applications')} className="mt-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
        ← Back to dashboard
      </button>
    </div>
  )

  const score = app.fit_score != null ? Math.round(app.fit_score) : null
  const scoreColor = score == null ? 'var(--color-muted)'
    : score >= 70 ? 'var(--color-success)'
    : score >= 45 ? 'var(--color-accent)'
    : 'var(--color-danger)'

  return (
    <div className="space-y-8">

      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate('/applications')}
          className="text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors mb-4 flex items-center gap-1"
        >
          ← Dashboard
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{app.company_name}</h1>
            <p className="text-[var(--color-muted)] mt-0.5">{app.job_title}</p>
          </div>
          <div className="flex items-center gap-3">
            {score != null && (
              <div className="text-center">
                <p className="text-3xl font-black tabular-nums" style={{ color: scoreColor }}>{score}</p>
                <p className="text-xs text-[var(--color-muted)]">fit score</p>
              </div>
            )}
            <select
              value={app.status}
              onChange={(e) => changeStatus(e.target.value)}
              disabled={updatingStatus}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border-0 outline-none cursor-pointer capitalize transition-colors ${STATUS_STYLES[app.status]}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#1e2130] text-white capitalize">{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <div className="flex gap-1">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
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

      {/* Tab panels */}
      <div>
        {activeTab === 0 && <FitPanel app={app} />}
        {activeTab === 1 && <TextPanel content={app.tailored_cv} emptyMsg="No tailored CV generated." />}
        {activeTab === 2 && <TextPanel content={app.cover_letter} emptyMsg="No cover letter generated." />}
        {activeTab === 3 && <ResearchPanel research={app.company_research} />}
      </div>

    </div>
  )
}

function FitPanel({ app }) {
  const analysis = {
    reasoning:    app.fit_score != null ? null : null,
    keyword_gaps: app.keyword_gaps ?? [],
  }

  return (
    <div className="space-y-4">
      {app.keyword_gaps?.length > 0 && (
        <Card title="Keyword Gaps">
          <div className="flex flex-wrap gap-2">
            {app.keyword_gaps.map((kw) => (
              <span key={kw} className="px-2.5 py-1 rounded-full text-xs bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20">
                {kw}
              </span>
            ))}
          </div>
        </Card>
      )}
      {app.job_description && (
        <Card title="Original Job Description">
          <pre className="text-xs text-[var(--color-muted)] whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
            {app.job_description}
          </pre>
        </Card>
      )}
    </div>
  )
}

function TextPanel({ content, emptyMsg }) {
  function copy() {
    if (content) navigator.clipboard.writeText(content)
  }

  if (!content) return <p className="text-[var(--color-muted)] text-sm">{emptyMsg}</p>

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-muted)]">{content.length.toLocaleString()} characters</span>
        <button
          onClick={copy}
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          Copy
        </button>
      </div>
      <pre className="p-5 text-sm text-[var(--color-text)] whitespace-pre-wrap font-mono leading-relaxed overflow-y-auto max-h-[60vh]">
        {content}
      </pre>
    </div>
  )
}

function ResearchPanel({ research }) {
  if (!research) {
    return <p className="text-[var(--color-muted)] text-sm">No company research available.</p>
  }

  return (
    <div className="space-y-4">
      {research.culture_summary && (
        <Card title="Culture">
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">{research.culture_summary}</p>
        </Card>
      )}
      {research.tech_stack?.length > 0 && (
        <Card title="Tech Stack">
          <div className="flex flex-wrap gap-2">
            {research.tech_stack.map((t) => (
              <span key={t} className="px-2.5 py-1 rounded-full text-xs bg-[var(--color-surface-2)] text-[var(--color-text)] border border-[var(--color-border)]">
                {t}
              </span>
            ))}
          </div>
        </Card>
      )}
      {research.recent_news?.length > 0 && (
        <Card title="Recent News">
          <ul className="space-y-2">
            {research.recent_news.map((item, i) => (
              <li key={i} className="text-sm text-[var(--color-muted)] flex gap-2">
                <span className="text-[var(--color-accent)] mt-0.5 shrink-0">·</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {research.red_flags?.length > 0 && (
        <Card title="Red Flags">
          <ul className="space-y-2">
            {research.red_flags.map((item, i) => (
              <li key={i} className="text-sm text-[var(--color-danger)] flex gap-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {research.tone_recommendation && (
        <Card title="Recommended Tone">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[var(--color-accent)]/10 text-[var(--color-accent)] capitalize font-medium">
            {research.tone_recommendation}
          </span>
        </Card>
      )}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
