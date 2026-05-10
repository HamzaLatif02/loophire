import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center flex-col gap-4 text-[var(--color-text)] p-8 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-[var(--color-muted)] text-sm max-w-md">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <a href="/login" className="text-[var(--color-accent)] underline text-sm">
            Go to login
          </a>
        </div>
      )
    }
    return this.props.children
  }
}
