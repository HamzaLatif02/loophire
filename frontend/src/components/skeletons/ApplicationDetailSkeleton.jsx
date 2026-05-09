function SkeletonBlock({ className = '', style }) {
  return (
    <div
      className={`animate-pulse bg-[var(--color-surface-2)] rounded-lg ${className}`}
      style={style}
    />
  )
}

export function ApplicationDetailSkeleton() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* back button */}
      <SkeletonBlock className="h-4 w-20" />

      {/* header card */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* score circle */}
          <SkeletonBlock className="shrink-0 w-24 h-24 rounded-full" />
          {/* title + company */}
          <div className="flex-1 space-y-2.5">
            <SkeletonBlock className="h-7 w-64" />
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
          {/* regen + status */}
          <div className="shrink-0 flex gap-2">
            <SkeletonBlock className="h-8 w-28 rounded-lg" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* interview details */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <div className="flex justify-end">
          <SkeletonBlock className="h-8 w-36 rounded-lg" />
        </div>
      </div>

      {/* response tracking */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
        <SkeletonBlock className="h-4 w-36" />
        <SkeletonBlock className="h-10 w-48 rounded-lg" />
      </div>

      {/* tab bar */}
      <div>
        <div className="border-b border-[var(--color-border)] mb-6">
          <div className="flex gap-0">
            {['Tailored CV', 'Cover Letter', 'Analysis', 'Interview Prep'].map((tab) => (
              <div key={tab} className="px-5 py-3">
                <SkeletonBlock className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* content lines */}
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className="h-4"
              style={{ width: i % 3 === 2 ? '75%' : '100%' }}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
