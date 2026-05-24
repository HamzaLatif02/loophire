import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[Loophire ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const { level = 'page', fallback } = this.props

      if (fallback) {
        return typeof fallback === 'function'
          ? fallback({ error: this.state.error, onReset: this.handleReset })
          : fallback
      }

      if (level === 'page')    return <PageErrorFallback    error={this.state.error} onReset={this.handleReset} />
      if (level === 'section') return <SectionErrorFallback error={this.state.error} onReset={this.handleReset} />
      if (level === 'card')    return <CardErrorFallback    onReset={this.handleReset} />
      return <InlineErrorFallback onReset={this.handleReset} />
    }

    return this.props.children
  }
}

// ── Fallback components ───────────────────────────────────────────────────────

function PageErrorFallback({ error, onReset }) {
  const isDev = import.meta.env.DEV
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-900/20 border border-red-800/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-2xl">⚠</span>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          This page ran into an unexpected error. Your data is safe — try refreshing or go back to the dashboard.
        </p>
        {isDev && error && (
          <div className="text-left mb-5 p-3 bg-[#111110] border border-red-900/30 rounded-lg overflow-auto max-h-32">
            <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => { onReset(); window.location.reload() }}
            className="px-5 py-2.5 bg-[#fd5a04] text-white text-sm font-medium rounded-lg hover:bg-[#e04e03] transition-colors"
          >
            Refresh page
          </button>
          <Link
            to="/applications"
            onClick={onReset}
            className="px-5 py-2.5 border border-[#2e2c2a] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#232220] transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

function SectionErrorFallback({ error, onReset }) {
  const isDev = import.meta.env.DEV
  return (
    <div className="flex items-center gap-3 p-4 bg-[#1e1d1c] border border-red-900/20 rounded-xl">
      <span className="text-red-400 flex-shrink-0 text-lg">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-400">This section failed to load</p>
        {isDev && error && (
          <p className="text-xs text-gray-600 mt-0.5 font-mono truncate">{error.message}</p>
        )}
      </div>
      <button
        onClick={onReset}
        className="text-xs text-gray-500 hover:text-gray-300 flex-shrink-0 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

function CardErrorFallback({ onReset }) {
  return (
    <div className="bg-[#1e1d1c] border border-red-900/20 rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-red-400 text-sm">⚠</span>
        <p className="text-sm text-gray-400">Failed to load</p>
      </div>
      <button onClick={onReset} className="text-xs text-[#fd5a04] hover:underline">
        Retry
      </button>
    </div>
  )
}

function InlineErrorFallback({ onReset }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-400">
      <span>⚠</span>
      <span>Error</span>
      <button onClick={onReset} className="underline hover:no-underline">retry</button>
    </span>
  )
}

// ── Functional helpers ────────────────────────────────────────────────────────

export function withErrorBoundary(WrappedComponent, options = {}) {
  const { level = 'page', fallback } = options
  return function WithBoundary(props) {
    return (
      <ErrorBoundary level={level} fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}

export function SafeSection({ children, level = 'section', fallback }) {
  return (
    <ErrorBoundary level={level} fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}
