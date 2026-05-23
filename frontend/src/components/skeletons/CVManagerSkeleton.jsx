function Pulse({ className }) {
  return <div className={`animate-pulse bg-[#2a2826] rounded-lg ${className}`} />
}

export function CVManagerSkeleton() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4">

      {/* Page header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Pulse className="h-7 w-36 mb-2" />
          <Pulse className="h-4 w-24" />
        </div>
        <Pulse className="h-9 w-24 rounded-lg" />
      </div>

      {/* CV cards skeleton */}
      <div className="flex flex-col gap-3">
        {[1, 2].map(i => (
          <div key={i} className="bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1">
                <Pulse className="h-4 w-40 mb-2" />
                <Pulse className="h-3 w-28" />
              </div>
            </div>
            <Pulse className="h-3 w-full mb-1.5" />
            <Pulse className="h-3 w-3/4 mb-4" />
            <div className="flex gap-2">
              <Pulse className="h-7 w-16 rounded-md" />
              <Pulse className="h-7 w-24 rounded-md" />
              <Pulse className="h-7 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
