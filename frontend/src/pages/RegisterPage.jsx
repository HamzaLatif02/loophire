import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner'
import api from '../utils/api'
import { setToken } from '../utils/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
    'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
    'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirm) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/register', { email, password })
      setToken(res.data.access_token)
      navigate('/cv-manager?welcome=true')
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        setError('An account with this email already exists. Try logging in instead.')
      } else if (status === 422) {
        const errors = err.response?.data?.errors
        if (errors && errors.length > 0) {
          setError(errors[0].message)
        } else {
          setError(err.userMessage ?? err.response?.data?.detail ?? 'Please check your email and password.')
        }
      } else {
        setError(err.userMessage ?? err.response?.data?.detail ?? 'Registration failed — please try again.')
      }
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
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Create your account</h1>
          <p className="text-sm text-[var(--color-muted)]">Start applying smarter today</p>
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
                placeholder="Minimum 8 characters"
                required
                disabled={loading}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--color-muted)]">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError('') }}
                placeholder="Repeat your password"
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
              disabled={loading || !email || !password || !confirm}
              className="w-full py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner size={14} /> Creating account…</> : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[var(--color-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--color-accent)] hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
