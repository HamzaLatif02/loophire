import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

  // Cycle through STEPS every 3 s while loading
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
      setError(err.response?.data?.detail ?? 'Generation failed — please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">New Application</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Paste the job description and Loophire handles the rest.
        </p>
      </div>

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
          {/* progress bar */}
          <div className="h-0.5 bg-[var(--color-surface-2)]">
            <div
              className="h-full bg-[var(--color-accent)] transition-all duration-[3000ms] ease-linear"
              style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="px-6 py-10 flex flex-col items-center gap-6">
            {/* current step */}
            <div className="flex flex-col items-center gap-3 text-center">
              <span
                className="text-4xl transition-all duration-300"
                key={stepIdx}
              >
                {STEPS[stepIdx].icon}
              </span>
              <p className="text-base font-semibold text-[var(--color-text)]">
                {STEPS[stepIdx].text}
              </p>
              <p className="text-xs text-[var(--color-muted)]">
                This takes around 30–60 seconds
              </p>
            </div>

            {/* step indicators */}
            <div className="flex items-center gap-3">
              {STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        i < stepIdx
                          ? 'bg-[var(--color-success)]'
                          : i === stepIdx
                          ? 'bg-[var(--color-accent)]'
                          : 'bg-[var(--color-border)]'
                      }`}
                    />
                    <span
                      className={`text-xs transition-colors duration-300 ${
                        i < stepIdx
                          ? 'text-[var(--color-success)]'
                          : i === stepIdx
                          ? 'text-[var(--color-accent)]'
                          : 'text-[var(--color-border)]'
                      }`}
                    >
                      {step.text.replace('…', '')}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span className="text-[var(--color-border)] text-xs">›</span>
                  )}
                </div>
              ))}
            </div>

            {/* spinner */}
            <Spinner />
          </div>
        </div>
      )}

      {/* ── Form (hidden during loading) ── */}
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
            value={form.job_description}
            onChange={set('job_description')}
            placeholder="Paste the full job description here…"
            rows={10}
            disabled={loading}
            className={`${inputCls} resize-y min-h-[200px]`}
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-sm text-[var(--color-danger)]">
            <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

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
        {label}
        <span className="text-[var(--color-accent)] ml-0.5">*</span>
      </span>
      {children}
    </label>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
