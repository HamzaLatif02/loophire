import { NavLink } from 'react-router-dom'

const links = [
  { to: '/apply',        label: 'New Application' },
  { to: '/applications', label: 'Dashboard' },
]

export default function Navbar() {
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
      </div>
    </header>
  )
}
