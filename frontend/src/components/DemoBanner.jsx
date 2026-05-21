import { useNavigate } from 'react-router-dom'
import { removeToken } from '../utils/auth'

export default function DemoBanner() {
  const isDemo = localStorage.getItem('loophire_is_demo') === 'true'
  const navigate = useNavigate()

  if (!isDemo) return null

  const handleExit = () => {
    removeToken()
    localStorage.removeItem('loophire_is_demo')
    navigate('/register')
  }

  return (
    <div className="w-full bg-[var(--color-accent)]/10 border-b border-[var(--color-accent)]/20 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] font-semibold flex-shrink-0">
          DEMO
        </span>
        <p className="text-xs text-[var(--color-muted)] truncate">
          You are viewing a demo account with example data.
          <span className="text-[var(--color-muted)]/60 ml-1 hidden sm:inline">
            Some actions are disabled.
          </span>
        </p>
      </div>
      <button
        onClick={handleExit}
        className="text-xs px-3 py-1.5 bg-[var(--color-accent)] text-white rounded-md font-medium hover:bg-[var(--color-accent-2)] transition-colors flex-shrink-0"
      >
        Create free account →
      </button>
    </div>
  )
}
