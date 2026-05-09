function SkeletonBlock({ className = '', style }) {
  return (
    <div
      className={`animate-pulse bg-[var(--color-surface-2)] rounded-lg ${className}`}
      style={style}
    />
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2">
          <SkeletonBlock className="h-3 w-16" />
          <SkeletonBlock className="h-7 w-10" />
        </div>
      ))}
    </div>
  )
}

export function InterviewsSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)]">
        <SkeletonBlock className="h-4 w-40" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] last:border-0">
          <div className="space-y-2">
            <SkeletonBlock className="h-3.5 w-32" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
          <SkeletonBlock className="h-3.5 w-28" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] space-y-1.5">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-3 w-40" />
      </div>
      <div className="p-5">
        <div className="flex items-end gap-3 h-52">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${35 + (i * 37 + 17) % 65}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function InsightsSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-border)] space-y-1.5">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-3 w-48" />
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="flex flex-col items-center gap-3 bg-[var(--color-surface-2)] rounded-xl p-5">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-12 w-20" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-36" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-5 rounded-full" style={{ width: `${50 + (i * 23) % 40}px` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {['Company', 'Job Title', 'Fit Score', 'Status', 'Date', ''].map((col, i) => (
              <th key={i} className="px-5 py-3">
                <SkeletonBlock className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} className={i < rows - 1 ? 'border-b border-[var(--color-border)]' : ''}>
              <td className="px-5 py-3.5"><SkeletonBlock className="h-3.5 w-28" /></td>
              <td className="px-5 py-3.5"><SkeletonBlock className="h-3.5 w-40" /></td>
              <td className="px-5 py-3.5"><SkeletonBlock className="h-4 w-8 rounded-full" /></td>
              <td className="px-5 py-3.5"><SkeletonBlock className="h-5 w-20 rounded-full" /></td>
              <td className="px-5 py-3.5"><SkeletonBlock className="h-3.5 w-24" /></td>
              <td className="px-5 py-3.5 text-right"><SkeletonBlock className="h-6 w-14 ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
