import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAGES } from '../hooks/useGenerationProgress'

const STAGE_ORDER = ['cv', 'research', 'tone', 'fit', 'cv_tailor', 'cover_letter', 'saving']

export default function GenerationProgress({ progress, isComplete, error, applicationId, onReset }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (isComplete && applicationId) {
      const t = setTimeout(() => navigate(`/applications/${applicationId}`), 1200)
      return () => clearTimeout(t)
    }
  }, [isComplete, applicationId, navigate])

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 flex flex-col items-center gap-5 text-center">
        <span className="text-4xl">❌</span>
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
        <button
          onClick={onReset}
          className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--color-muted)]">Starting generation…</p>
      </div>
    )
  }

  const currentIdx = STAGE_ORDER.indexOf(progress.stage)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

      {/* Progress bar */}
      <div className="h-1 bg-[var(--color-surface-2)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-all duration-700 ease-out"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      <div className="px-6 py-8 flex flex-col items-center gap-6">

        {/* Stage icon */}
        <span className="text-5xl" key={progress.stage}>
          {isComplete ? '✅' : progress.icon}
        </span>

        {/* Label + percent */}
        <div className="text-center space-y-1">
          <p className="text-base font-semibold text-[var(--color-text)]">
            {isComplete ? 'Application ready!' : progress.label}
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            {isComplete ? 'Redirecting you now…' : `${progress.percent}% complete`}
          </p>
        </div>

        {/* Stage checklist */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {STAGE_ORDER.map((key, idx) => {
            const isDone    = isComplete || idx < currentIdx
            const isCurrent = !isComplete && key === progress.stage
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`text-xs transition-colors duration-300 ${
                  isDone    ? 'text-[var(--color-success)]'
                  : isCurrent ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-border)]'
                }`}>
                  {isDone ? '✓' : isCurrent ? '→' : '○'}
                </span>
                <span className={`text-xs transition-colors duration-300 hidden sm:inline ${
                  isDone    ? 'text-[var(--color-success)]'
                  : isCurrent ? 'text-[var(--color-text)] font-medium'
                  : 'text-[var(--color-border)]'
                }`}>
                  {STAGES[key]?.label ?? key}
                </span>
                {idx < STAGE_ORDER.length - 1 && (
                  <span className="text-[var(--color-border)] text-xs hidden sm:inline">›</span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-[var(--color-muted)]">This takes around 30–60 seconds</p>
      </div>
    </div>
  )
}
