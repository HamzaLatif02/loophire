export default function QueryError({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="flex items-center gap-3 p-4 bg-[#1e1d1c] border border-red-900/20 rounded-xl mb-4">
      <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-red-400">Failed to load data</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {error?.message || 'Check your connection and try again'}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 bg-[#2a2826] text-gray-300 rounded-md hover:bg-[#3a3835] transition-colors flex-shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  )
}
