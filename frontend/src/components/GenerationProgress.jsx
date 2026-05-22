import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { STAGES } from '../hooks/useGenerationProgress'

export default function GenerationProgress({
  progress, isComplete, error, applicationId, onReset,
  rewriteCv = true, generateCoverLetter = true,
}) {
  const navigate = useNavigate()

  useEffect(() => {
    if (isComplete && applicationId) {
      const t = setTimeout(() => navigate(`/applications/${applicationId}`), 1200)
      return () => clearTimeout(t)
    }
  }, [isComplete, applicationId, navigate])

  // Build the stage checklist dynamically based on what was requested
  const stageList = [
    { key: 'cv',      label: 'Loading CV' },
    { key: 'research', label: 'Company research' },
    { key: 'tone',    label: 'Tone analysis' },
    { key: 'fit',     label: 'Fit scoring' },
    ...(rewriteCv ? [{ key: 'cv_tailor', label: 'CV tailoring' }] : []),
    ...(generateCoverLetter ? [{ key: 'cover_letter', label: 'Cover letter' }] : []),
    { key: 'saving',  label: 'Saving' },
  ]

  const isDemo = localStorage.getItem('loophire_is_demo') === 'true'

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 flex flex-col items-center gap-5 text-center">
        <span className="text-4xl">❌</span>
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
        {!isDemo && (
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white text-sm font-medium transition-colors"
          >
            Try again
          </button>
        )}
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

  const currentIdx = stageList.findIndex((s) => s.key === progress.stage)

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
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center px-2">
          {stageList.map(({ key, label }, idx) => {
            const isDone    = isComplete || idx < currentIdx
            const isCurrent = !isComplete && key === progress.stage
            return (
              <div key={key} className="flex items-center gap-1 sm:gap-1.5">
                <span className={`text-[10px] sm:text-xs transition-colors duration-300 ${
                  isDone    ? 'text-[var(--color-success)]'
                  : isCurrent ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-border)]'
                }`}>
                  {isDone ? '✓' : isCurrent ? '→' : '○'}
                </span>
                <span className={`text-[10px] sm:text-xs transition-colors duration-300 hidden sm:inline ${
                  isDone    ? 'text-[var(--color-success)]'
                  : isCurrent ? 'text-[var(--color-text)] font-medium'
                  : 'text-[var(--color-border)]'
                }`}>
                  {STAGES[key]?.label ?? label}
                </span>
                {idx < stageList.length - 1 && (
                  <span className="text-[var(--color-border)] text-[10px] sm:text-xs hidden sm:inline">›</span>
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
