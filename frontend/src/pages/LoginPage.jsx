import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner'
import api from '../utils/api'
import { setToken } from '../utils/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
    'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
    'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      setToken(res.data.access_token)
      navigate('/apply')
    } catch (err) {
      setError(err.response?.data?.detail ?? err.response?.data?.error ?? 'Login failed — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* logo */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white font-black text-sm select-none">
              L
            </span>
            <span className="font-semibold text-xl text-[var(--color-text)] tracking-tight">
              Loop<span className="text-[var(--color-accent)]">hire</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Welcome back</h1>
          <p className="text-sm text-[var(--color-muted)]">Sign in to your account</p>
        </div>

        {/* form */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-muted)]">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="you@example.com"
                required
                autoFocus
                disabled={loading}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-muted)]">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••"
                required
                disabled={loading}
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-xs text-[var(--color-danger)] bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner size={14} /> Signing in…</> : 'Log in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--color-muted)]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[var(--color-accent)] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
