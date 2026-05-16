import { useEffect, useRef, useState } from 'react'
import { useDeleteApplication } from '../hooks/useApplications'

export default function DeleteButton({ applicationId, onDeleted, className = '' }) {
  const [armed, setArmed] = useState(false)
  const timerRef = useRef(null)
  const deleteMutation = useDeleteApplication()

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  function handleClick(e) {
    e.stopPropagation()
    e.preventDefault()

    if (!armed) {
      setArmed(true)
      timerRef.current = setTimeout(() => setArmed(false), 3000)
      return
    }

    clearTimeout(timerRef.current)
    setArmed(false)
    deleteMutation.mutate(applicationId, {
      onSuccess: () => onDeleted?.(),
    })
  }

  const isPending = deleteMutation.isPending

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={armed ? 'Click again to confirm delete' : 'Delete application'}
      className={`transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        armed
          ? 'text-[var(--color-danger)] border-[var(--color-danger)]/40'
          : 'text-[var(--color-muted)] border-[var(--color-border)]'
      } ${className}`}
    >
      {isPending ? '…' : armed ? 'Delete?' : '✕'}
    </button>
  )
}
