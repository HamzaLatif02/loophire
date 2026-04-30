import { useRef, useState } from 'react'

export default function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  function handleCopy() {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className={`flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        copied
          ? 'text-[var(--color-success)]'
          : 'text-[var(--color-muted)] hover:text-[var(--color-accent)]'
      } ${className}`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}
