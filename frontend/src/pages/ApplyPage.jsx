import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const USER_ID = 1 // placeholder until auth is implemented

export default function ApplyPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ job_title: '', company_name: '', job_description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function generate(e) {
    e.preventDefault()
    if (!form.job_title || !form.company_name || !form.job_description) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/applications/generate', { ...form, user_id: USER_ID })
      navigate(`/applications/${res.data.id}`)
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Generation failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">New Application</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Paste the job description and let Loophire do the rest.
        </p>
      </div>

      <form onSubmit={generate} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job Title" required>
            <input
              type="text"
              value={form.job_title}
              onChange={set('job_title')}
              placeholder="e.g. Senior Software Engineer"
              className={inputCls}
            />
          </Field>
          <Field label="Company Name" required>
            <input
              type="text"
              value={form.company_name}
              onChange={set('company_name')}
              placeholder="e.g. Stripe"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Job Description" required>
          <textarea
            value={form.job_description}
            onChange={set('job_description')}
            placeholder="Paste the full job description here…"
            rows={14}
            className={`${inputCls} resize-y`}
          />
        </Field>

        {error && (
          <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner /> Generating — this takes ~30 seconds…
            </span>
          ) : (
            'Generate Application →'
          )}
        </button>
      </form>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--color-text)]">
        {label}
        {required && <span className="text-[var(--color-accent)] ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

const inputCls =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
  'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
  'focus:outline-none focus:border-[var(--color-accent)] transition-colors'
