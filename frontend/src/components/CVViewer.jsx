import { useEffect, useRef, useState } from 'react'

export default function CVViewer({ cv, onClose, onPrev, onNext, currentIndex, total }) {
  const scrollRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [cv.id])

  useEffect(() => {
    const handleKey = (e) => {
      const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      const tag = document.activeElement?.tagName
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable

      if (arrowKeys.includes(e.key) && !isTyping) e.preventDefault()

      if ((e.key === 'ArrowUp'   || e.key === 'k') && !isTyping) onPrev()
      if ((e.key === 'ArrowDown' || e.key === 'j') && !isTyping) onNext()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey, { passive: false })
    return () => window.removeEventListener('keydown', handleKey)
  }, [onPrev, onNext, onClose])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cv.cv_text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wordCount = cv.word_count || (cv.cv_text || '').split(/\s+/).filter(Boolean).length

  return (
    <div
      className="flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden md:sticky md:top-6"
      style={{ maxHeight: 'calc(100vh - 120px)' }}
    >
      {/* Mobile close */}
      <button
        onClick={onClose}
        className="md:hidden w-full py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] text-center border-b border-[var(--color-border)]"
      >
        ↑ Close viewer
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={onPrev}
            disabled={total <= 1}
            title="Previous CV (↑ or K)"
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
          >↑</button>
          <button
            onClick={onNext}
            disabled={total <= 1}
            title="Next CV (↓ or J)"
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold"
          >↓</button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] truncate">{cv.name}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {currentIndex + 1} of {total} · {wordCount.toLocaleString()} words
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleCopy}
            title="Copy CV text"
            className="px-2.5 py-1.5 rounded-md text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            title="Close viewer (Esc)"
            className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
          >✕</button>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        {cv.cv_text ? (
          <CVTextRenderer text={cv.cv_text} />
        ) : (
          <div className="flex items-center justify-center h-full py-20">
            <p className="text-[var(--color-muted)] text-sm">No text content available</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-5 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <p className="text-xs text-[var(--color-muted)] text-center">
          ↑↓ or J/K to navigate · Esc to close
        </p>
      </div>
    </div>
  )
}

function CVTextRenderer({ text }) {
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (!line) {
      elements.push(<div key={key++} className="h-2" />)
      continue
    }

    const isHeading =
      (line === line.toUpperCase() && line.length > 2 && line.length < 40 && !/^\d/.test(line)) ||
      (/^[A-Z][a-zA-Z\s]+:$/.test(line) && line.length < 30)

    const isName =
      i < 3 && !line.includes('@') && !line.includes('+') &&
      line.length > 3 && line.length < 50 && !line.includes('|')

    const isBullet =
      line.startsWith('•') || line.startsWith('-') ||
      line.startsWith('*') || /^\d+\./.test(line)

    const isContact =
      line.includes('@') || line.includes('|') || /linkedin|github|http/i.test(line)

    if (isName && elements.length === 0) {
      elements.push(
        <h1 key={key++} className="text-xl font-bold text-[var(--color-text)] mb-1 tracking-tight">
          {line}
        </h1>
      )
    } else if (isContact) {
      elements.push(
        <p key={key++} className="text-xs text-[var(--color-muted)] mb-3 leading-relaxed">
          {line}
        </p>
      )
    } else if (isHeading) {
      elements.push(
        <div key={key++} className="mt-5 mb-2">
          <h2 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-widest">
            {line}
          </h2>
          <div className="h-px bg-[var(--color-border)] mt-1" />
        </div>
      )
    } else if (isBullet) {
      elements.push(
        <div key={key++} className="flex gap-2 mb-1">
          <span className="text-[var(--color-accent)] text-xs mt-1 flex-shrink-0">•</span>
          <p className="text-sm text-[var(--color-text)] leading-relaxed">
            {line.replace(/^[•\-*]\s*/, '').replace(/^\d+\.\s*/, '')}
          </p>
        </div>
      )
    } else {
      elements.push(
        <p key={key++} className="text-sm text-[var(--color-text)] mb-1 leading-relaxed">
          {line}
        </p>
      )
    }
  }

  return <div className="font-mono text-sm leading-relaxed">{elements}</div>
}
