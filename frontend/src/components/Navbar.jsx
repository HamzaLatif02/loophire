import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { isLoggedIn, removeToken } from '../utils/auth'
import { useCVVersions } from '../hooks/useApplications'
import api from '../utils/api'

const links = [
  { to: '/apply',        label: 'New Application' },
  { to: '/applications', label: 'Dashboard' },
  { to: '/cv-manager',   label: 'CV Manager' },
]

export default function Navbar() {
  const navigate      = useNavigate()
  const loggedIn      = isLoggedIn()
  const isDemo        = localStorage.getItem('loophire_is_demo') === 'true'
  const [email, setEmail]       = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef(null)

  const { data: cvVersions = [] } = useCVVersions({ enabled: loggedIn })
  const needsCV = loggedIn && !isDemo && cvVersions.length === 0

  useEffect(() => {
    if (!loggedIn) return
    api.get('/auth/me').then(r => setEmail(r.data.email)).catch(() => {})
  }, [loggedIn])

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handler(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  function handleLogout() {
    removeToken()
    localStorage.removeItem('loophire_is_demo')
    setMenuOpen(false)
    navigate('/')
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header
      ref={headerRef}
      className="border-b border-[var(--color-border)] bg-[#1a1918] sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">

        <NavLink to="/home" onClick={closeMenu} className="flex items-center gap-2 group">
          <img src="/favicon.svg" alt="Loophire" className="w-7 h-7 rounded-md" />
          <span className="font-semibold text-[var(--color-text)] tracking-tight">
            Loop<span className="text-[var(--color-accent)]">hire</span>
          </span>
        </NavLink>

        {loggedIn ? (
          <>
            {/* ── Desktop nav ── */}
            <div className="hidden lg:flex items-center gap-1">
              <nav className="flex items-center gap-1">
                {links.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--color-surface-2)] text-[var(--color-accent)]'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                      }`
                    }
                  >
                    {label}
                    {to === '/cv-manager' && needsCV && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                    )}
                  </NavLink>
                ))}
              </nav>

              <div className="flex items-center gap-2 ml-3 pl-3 border-l border-[var(--color-border)]">
                {email && (
                  <span className="text-xs text-[var(--color-muted)] truncate max-w-[160px]">
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

            {/* ── Mobile hamburger ── */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="lg:hidden p-2 rounded-md text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-colors"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* ── Mobile dropdown ── */}
            {menuOpen && (
              <div className="lg:hidden absolute top-full left-0 right-0 bg-[#1a1918] border-t border-[var(--color-border)] shadow-xl z-50">
                {links.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeMenu}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-6 py-4 text-sm font-medium border-b border-[var(--color-border)] transition-colors ${
                        isActive
                          ? 'text-[var(--color-accent)] bg-[var(--color-surface-2)]'
                          : 'text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                      }`
                    }
                  >
                    {label}
                    {to === '/cv-manager' && needsCV && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                    )}
                  </NavLink>
                ))}
                <div className="px-6 py-4">
                  {email && (
                    <p className="text-xs text-[var(--color-muted)] mb-3 truncate">{email}</p>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-[var(--color-danger)] hover:underline"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </>
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
