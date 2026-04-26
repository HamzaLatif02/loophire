import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

const STATUS_STYLES = {
  draft:        'bg-[var(--color-surface-2)] text-[var(--color-muted)]',
  applied:      'bg-blue-500/10 text-blue-400',
  interviewing: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  rejected:     'bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
  offer:        'bg-[var(--color-success)]/10 text-[var(--color-success)]',
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
      {status}
    </span>
  )
}

function ScoreRing({ score }) {
  if (score == null) return <span className="text-[var(--color-muted)] text-sm">—</span>
  const color = score >= 70 ? 'var(--color-success)' : score >= 45 ? 'var(--color-accent)' : 'var(--color-danger)'
  return (
    <span className="text-sm font-semibold tabular-nums" style={{ color }}>
      {Math.round(score)}
    </span>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/applications?user_id=${USER_ID}`)
      .then((r) => setApps(r.data))
      .catch(() => setError('Failed to load applications.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--color-muted)] text-sm">
        Loading…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">My Applications</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {apps.length} application{apps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/apply')}
          className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white font-semibold text-sm transition-colors"
        >
          + New
        </button>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
      )}

      {apps.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-16 text-center">
          <p className="text-[var(--color-muted)] text-sm">No applications yet.</p>
          <button
            onClick={() => navigate('/apply')}
            className="mt-4 px-4 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-muted)] text-sm text-[var(--color-text)] transition-colors"
          >
            Create your first application →
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {['Company', 'Role', 'Fit', 'Status', 'Date'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map((app, i) => (
                <tr
                  key={app.id}
                  onClick={() => navigate(`/applications/${app.id}`)}
                  className={`cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors ${
                    i < apps.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                  }`}
                >
                  <td className="px-5 py-4 font-medium text-[var(--color-text)]">{app.company_name}</td>
                  <td className="px-5 py-4 text-[var(--color-muted)]">{app.job_title}</td>
                  <td className="px-5 py-4"><ScoreRing score={app.fit_score} /></td>
                  <td className="px-5 py-4"><StatusBadge status={app.status} /></td>
                  <td className="px-5 py-4 text-[var(--color-muted)] tabular-nums">
                    {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
