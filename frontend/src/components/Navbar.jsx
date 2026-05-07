import { NavLink, useNavigate } from 'react-router-dom'
import { isLoggedIn, removeToken } from '../utils/auth'
import api from '../utils/api'
import { useEffect, useState } from 'react'

const links = [
  { to: '/apply',        label: 'New Application' },
  { to: '/applications', label: 'Dashboard' },
  { to: '/cv-manager',   label: 'CV Manager' },
]

export default function Navbar() {
  const navigate   = useNavigate()
  const loggedIn   = isLoggedIn()
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!loggedIn) return
    api.get('/auth/me').then(r => setEmail(r.data.email)).catch(() => {})
  }, [loggedIn])

  function handleLogout() {
    removeToken()
    navigate('/login')
  }

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        <NavLink to="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white font-black text-sm select-none">
            L
          </span>
          <span className="font-semibold text-[var(--color-text)] tracking-tight">
            Loop<span className="text-[var(--color-accent)]">hire</span>
          </span>
        </NavLink>

        {loggedIn ? (
          <div className="flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--color-surface-2)] text-[var(--color-accent)]'
                        : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-[var(--color-border)]">
              {email && (
                <span className="text-xs text-[var(--color-muted)] hidden sm:block truncate max-w-[160px]">
                  {email}
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        ) : (
          <nav className="flex items-center gap-2">
            <NavLink
              to="/login"
              className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Log in
            </NavLink>
            <NavLink
              to="/register"
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-2)] transition-colors"
            >
              Sign up
            </NavLink>
          </nav>
        )}
      </div>
    </header>
  )
}
