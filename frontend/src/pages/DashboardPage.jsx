import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'

function formatInterviewDate(isoStr) {
  return new Date(isoStr).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC',
  })
}
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

// ─── constants ────────────────────────────────────────────────────────────────

const ALL_STATUSES = ['draft', 'applied', 'interviewing', 'rejected', 'offer']

const STATUS_STYLES = {
  draft:        'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
  applied:      'bg-blue-500/10 text-blue-400',
  interviewing: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  rejected:     'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  offer:        'bg-[var(--color-success)]/10 text-[var(--color-success)]',
}

function fitColor(score) {
  if (score == null) return 'var(--color-muted)'
  if (score >= 70)   return 'var(--color-success)'
  if (score >= 40)   return 'var(--color-accent)'
  return 'var(--color-danger)'
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const [apps, setApps]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [analytics, setAnalytics] = useState(null)

  // filter + sort state
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField]       = useState('created_at')
  const [sortDir, setSortDir]           = useState('desc')

  useEffect(() => {
    api.get(`/applications?user_id=${USER_ID}`)
      .then((r) => setApps(r.data))
      .catch((err) => setError(err.response?.data?.error ?? err.response?.data?.detail ?? 'Failed to load applications.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.get(`/applications/analytics?user_id=${USER_ID}`)
      .then((r) => setAnalytics(r.data))
      .catch(() => {})
  }, [])

  // ── derived stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const scored = apps.filter((a) => a.fit_score != null)
    const avg = scored.length
      ? Math.round(scored.reduce((s, a) => s + a.fit_score, 0) / scored.length)
      : null
    const byStatus = Object.fromEntries(
      ALL_STATUSES.map((s) => [s, apps.filter((a) => a.status === s).length])
    )
    return { total: apps.length, avg, byStatus }
  }, [apps])

  // chart: last 10 apps that have a fit score, in chronological order
  const chartData = useMemo(() => {
    return [...apps]
      .filter((a) => a.fit_score != null)
      .slice(0, 10)
      .reverse()
      .map((a) => ({
        name: a.company_name.length > 12 ? a.company_name.slice(0, 11) + '…' : a.company_name,
        score: Math.round(a.fit_score),
        color: fitColor(a.fit_score),
      }))
  }, [apps])

  // ── upcoming interviews ──────────────────────────────────────────────────────

  const upcomingInterviews = useMemo(() => {
    const now = Date.now()
    return apps
      .filter((a) => a.interview_date && new Date(a.interview_date).getTime() > now)
      .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date))
      .slice(0, 3)
  }, [apps])

  // ── filtered + sorted rows ───────────────────────────────────────────────────

  const rows = useMemo(() => {
    let list = statusFilter === 'all'
      ? [...apps]
      : apps.filter((a) => a.status === statusFilter)

    list.sort((a, b) => {
      if (sortField === 'fit_score') {
        const av = a.fit_score ?? -1
        const bv = b.fit_score ?? -1
        return sortDir === 'asc' ? av - bv : bv - av
      }
      // created_at
      const av = new Date(a.created_at).getTime()
      const bv = new Date(b.created_at).getTime()
      return sortDir === 'asc' ? av - bv : bv - av
    })
    return list
  }, [apps, statusFilter, sortField, sortDir])

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  // ── loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-[var(--color-muted)] text-sm">
        <Spinner size={18} /> Loading applications…
      </div>
    )
  }

  // ── empty state ──────────────────────────────────────────────────────────────

  if (!error && apps.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader navigate={navigate} />
        <div className="rounded-xl border border-dashed border-[var(--color-border)] py-24 text-center space-y-4">
          <p className="text-4xl">📭</p>
          <p className="font-semibold text-[var(--color-text)]">No applications yet</p>
          <p className="text-sm text-[var(--color-muted)] max-w-xs mx-auto">
            Generate your first application to get started
          </p>
          <button
            onClick={() => navigate('/apply')}
            className="mt-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold text-sm transition-colors"
          >
            Start a New Application
          </button>
        </div>
      </div>
    )
  }

  // ── main ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      <PageHeader navigate={navigate} />

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* ── upcoming interviews ── */}
      <UpcomingInterviewsCard interviews={upcomingInterviews} navigate={navigate} />

      {/* ── stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard
          label="Avg Fit Score"
          value={stats.avg != null ? stats.avg : '—'}
          valueColor={stats.avg != null ? fitColor(stats.avg) : undefined}
        />
        <StatCard label="Applied"      value={stats.byStatus.applied}      accent="blue" />
        <StatCard label="Interviewing" value={stats.byStatus.interviewing} accent="orange" />
        <StatCard label="Offers"       value={stats.byStatus.offer}        accent="green" />
        <StatCard label="Rejected"     value={stats.byStatus.rejected}     accent="red" />
      </div>

      {/* ── A/B insights ── */}
      {analytics && analytics.total_applications > 0 && (
        <ABInsightsSection analytics={analytics} />
      )}

      {/* ── chart ── */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">Fit Scores</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">Last {chartData.length} scored applications</p>
          </div>
          <div className="p-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid
                  vertical={false}
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'system-ui' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'system-ui' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── table controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted)]">
          {rows.length} of {apps.length} application{apps.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-muted)]">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer"
          >
            <option value="all">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── table ── */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            No applications with status "{statusFilter}".
          </p>
          <button
            onClick={() => setStatusFilter('all')}
            className="mt-3 text-xs text-[var(--color-accent)] hover:underline"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <Th>Company</Th>
                <Th>Job Title</Th>
                <SortTh
                  label="Fit Score"
                  field="fit_score"
                  active={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <Th>Status</Th>
                <SortTh
                  label="Date"
                  field="created_at"
                  active={sortField}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((app, i) => (
                <tr
                  key={app.id}
                  className={`hover:bg-[var(--color-surface-2)] transition-colors ${
                    i < rows.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text)] max-w-[160px] truncate">
                    {app.company_name}
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-muted)] max-w-[200px] truncate">
                    {app.job_title}
                  </td>
                  <td className="px-5 py-3.5">
                    {app.fit_score != null ? (
                      <span
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: fitColor(app.fit_score) }}
                      >
                        {Math.round(app.fit_score)}
                      </span>
                    ) : (
                      <span className="text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[app.status] ?? STATUS_STYLES.draft}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-muted)] tabular-nums text-xs whitespace-nowrap">
                    {new Date(app.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="px-3 py-1 rounded-md border border-[var(--color-border)] text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PageHeader({ navigate }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">Track and manage your applications</p>
      </div>
      <button
        onClick={() => navigate('/apply')}
        className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold text-sm transition-colors"
      >
        + New Application
      </button>
    </div>
  )
}

const ACCENT_COLORS = {
  blue:   { text: 'text-blue-400',                   border: 'border-blue-500/20',                   bg: 'bg-blue-500/5' },
  orange: { text: 'text-[var(--color-accent)]',       border: 'border-[var(--color-accent)]/20',       bg: 'bg-[var(--color-accent)]/5' },
  green:  { text: 'text-[var(--color-success)]',      border: 'border-[var(--color-success)]/20',      bg: 'bg-[var(--color-success)]/5' },
  red:    { text: 'text-[var(--color-danger)]',       border: 'border-[var(--color-danger)]/20',       bg: 'bg-[var(--color-danger)]/5' },
}

function StatCard({ label, value, valueColor, accent }) {
  const ac = accent ? ACCENT_COLORS[accent] : null
  return (
    <div className={`rounded-xl border p-4 space-y-1 ${
      ac
        ? `${ac.bg} ${ac.border}`
        : 'border-[var(--color-border)] bg-[var(--color-surface)]'
    }`}>
      <p className="text-xs text-[var(--color-muted)] font-medium">{label}</p>
      <p
        className={`text-2xl font-black tabular-nums ${ac ? ac.text : 'text-[var(--color-text)]'}`}
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th className={`px-5 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider text-${align}`}>
      {children}
    </th>
  )
}

function SortTh({ label, field, active, dir, onSort }) {
  const isActive = active === field
  return (
    <th
      className="px-5 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider cursor-pointer select-none hover:text-[var(--color-text)] transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={isActive ? 'text-[var(--color-accent)]' : 'opacity-30'}>
          {isActive && dir === 'asc' ? '↑' : '↓'}
        </span>
      </span>
    </th>
  )
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, score, color } = payload[0].payload
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 shadow-xl text-xs">
      <p className="text-[var(--color-muted)] mb-1">{name}</p>
      <p className="font-bold tabular-nums" style={{ color }}>{score} / 100</p>
    </div>
  )
}

function ABInsightsSection({ analytics }) {
  const fitData = [
    { name: 'Got Response', score: analytics.avg_fit_score_with_response, color: 'var(--color-success)' },
    { name: 'No Response',  score: analytics.avg_fit_score_without_response, color: 'var(--color-danger)' },
  ].filter((d) => d.score != null)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">A/B Insights</h2>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">CV performance across your applications</p>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6">

        {/* response rate */}
        <div className="flex flex-col items-center justify-center gap-1 bg-[var(--color-surface-2)] rounded-xl p-5">
          <p className="text-xs text-[var(--color-muted)] font-medium uppercase tracking-wide">Response Rate</p>
          <p className="text-5xl font-black tabular-nums" style={{ color: analytics.response_rate >= 30 ? 'var(--color-success)' : analytics.response_rate >= 10 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
            {analytics.response_rate}%
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {Math.round(analytics.total_applications * analytics.response_rate / 100)} of {analytics.total_applications} applications
          </p>
        </div>

        {/* fit score comparison chart */}
        <div className="sm:col-span-1">
          <p className="text-xs text-[var(--color-muted)] font-medium mb-3">Avg Fit Score</p>
          {fitData.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">Not enough data yet.</p>
          ) : (
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fitData} barCategoryGap="40%">
                  <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'system-ui' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'system-ui' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<FitCompareTooltip />} cursor={{ fill: 'var(--color-surface-2)' }} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {fitData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* top keywords */}
        <div>
          <p className="text-xs text-[var(--color-muted)] font-medium mb-3">Top Keywords in Responses</p>
          {analytics.top_keywords_in_successful_apps.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">No data yet — mark applications that got responses.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {analytics.top_keywords_in_successful_apps.map((kw) => (
                <span
                  key={kw}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20 capitalize"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function FitCompareTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, score, color } = payload[0].payload
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 shadow-xl text-xs">
      <p className="text-[var(--color-muted)] mb-1">{name}</p>
      <p className="font-bold tabular-nums" style={{ color }}>{score} / 100</p>
    </div>
  )
}

function UpcomingInterviewsCard({ interviews, navigate }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center gap-2">
        <svg className="w-4 h-4 text-[var(--color-accent)]" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Upcoming Interviews</h2>
      </div>

      {interviews.length === 0 ? (
        <p className="px-5 py-4 text-sm text-[var(--color-muted)]">No upcoming interviews scheduled.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {interviews.map((app) => (
            <li
              key={app.id}
              onClick={() => navigate(`/applications/${app.id}`)}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--color-text)] truncate">{app.company_name}</p>
                <p className="text-xs text-[var(--color-muted)] truncate mt-0.5">{app.job_title}</p>
              </div>
              <span className="shrink-0 ml-4 text-xs font-medium text-[var(--color-accent)] tabular-nums whitespace-nowrap">
                {formatInterviewDate(app.interview_date)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

