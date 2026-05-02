import { useEffect, useState } from 'react'
import CopyButton from './CopyButton'
import Spinner from './Spinner'

// ─── helpers ──────────────────────────────────────────────────────────────────

const hl2text = (arr) => (arr || []).join('\n')
const text2hl = (str) => str.split('\n').map((l) => l.trim()).filter(Boolean)

function cvToPlainText(cv) {
  if (!cv) return ''
  const lines = []
  if (cv.profile) { lines.push(cv.profile); lines.push('') }
  cv.technical_skills?.forEach((s) => lines.push(`${s.category}: ${s.items}`))
  if (cv.technical_skills?.length) lines.push('')
  cv.education?.forEach((e) => {
    lines.push(`${e.institution} — ${e.degree} (${e.dates})`)
    e.highlights?.forEach((h) => lines.push(`  • ${h}`))
  })
  if (cv.education?.length) lines.push('')
  cv.experience?.forEach((e) => {
    lines.push(`${e.title}, ${e.company} (${e.dates})`)
    e.highlights?.forEach((h) => lines.push(`  • ${h}`))
  })
  if (cv.experience?.length) lines.push('')
  cv.projects?.forEach((p) => {
    lines.push(p.name)
    p.highlights?.forEach((h) => lines.push(`  • ${h}`))
  })
  return lines.join('\n')
}

// ─── shared styling ───────────────────────────────────────────────────────────

const INPUT =
  'w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors'

const SECTION_HDR =
  'text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-3 pb-1.5 border-b border-[var(--color-border)]'

// ─── read-only view ───────────────────────────────────────────────────────────

function ReadView({ cv }) {
  return (
    <div className="space-y-6 text-sm overflow-y-auto max-h-[65vh] pr-1">

      {cv.profile && (
        <div>
          <h4 className={SECTION_HDR}>Profile</h4>
          <p className="text-[var(--color-muted)] leading-relaxed">{cv.profile}</p>
        </div>
      )}

      {cv.technical_skills?.length > 0 && (
        <div>
          <h4 className={SECTION_HDR}>Technical Skills</h4>
          <ul className="space-y-1.5">
            {cv.technical_skills.map((s, i) => (
              <li key={i} className="text-[var(--color-muted)]">
                <span className="font-medium text-[var(--color-text)]">{s.category}:</span> {s.items}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cv.education?.length > 0 && (
        <div>
          <h4 className={SECTION_HDR}>Education</h4>
          <div className="space-y-4">
            {cv.education.map((edu, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-medium text-[var(--color-text)]">{edu.institution}</span>
                  <span className="text-xs text-[var(--color-muted)] shrink-0 tabular-nums">{edu.dates}</span>
                </div>
                <p className="text-[var(--color-muted)] mt-0.5">{edu.degree}</p>
                {edu.highlights?.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {edu.highlights.map((h, j) => (
                      <li key={j} className="flex gap-2 text-[var(--color-muted)]">
                        <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-current opacity-50" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {cv.experience?.length > 0 && (
        <div>
          <h4 className={SECTION_HDR}>Experience</h4>
          <div className="space-y-4">
            {cv.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-medium text-[var(--color-text)]">{exp.title}</span>
                  <span className="text-xs text-[var(--color-muted)] shrink-0 tabular-nums">{exp.dates}</span>
                </div>
                <p className="text-[var(--color-muted)] mt-0.5">{exp.company}</p>
                {exp.highlights?.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {exp.highlights.map((h, j) => (
                      <li key={j} className="flex gap-2 text-[var(--color-muted)]">
                        <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-current opacity-50" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {cv.projects?.length > 0 && (
        <div>
          <h4 className={SECTION_HDR}>Projects</h4>
          <div className="space-y-4">
            {cv.projects.map((proj, i) => (
              <div key={i}>
                <div className="flex items-start justify-between gap-4">
                  <span className="font-medium text-[var(--color-text)]">{proj.name}</span>
                  {proj.github_url && (
                    <a
                      href={proj.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 shrink-0 transition-colors"
                    >
                      GitHub ↗
                    </a>
                  )}
                </div>
                {proj.highlights?.length > 0 && (
                  <ul className="mt-1.5 space-y-1">
                    {proj.highlights.map((h, j) => (
                      <li key={j} className="flex gap-2 text-[var(--color-muted)]">
                        <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-current opacity-50" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── edit form ────────────────────────────────────────────────────────────────

function RemoveBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

function AddBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors mt-1"
    >
      + {label}
    </button>
  )
}

const CARD = 'p-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] space-y-2'

function EditForm({ draft, setDraft, setModified }) {
  const mark = () => setModified(true)

  const setField = (key, val) => { setDraft((d) => ({ ...d, [key]: val })); mark() }

  const setItem = (list, i, field, val) => {
    setDraft((d) => ({
      ...d,
      [list]: (d[list] || []).map((x, idx) => (idx === i ? { ...x, [field]: val } : x)),
    }))
    mark()
  }

  const setHl = (list, i, text) => setItem(list, i, 'highlights', text2hl(text))

  const addItem = (list, template) => {
    setDraft((d) => ({ ...d, [list]: [...(d[list] || []), template] }))
    mark()
  }

  const removeItem = (list, i) => {
    setDraft((d) => ({ ...d, [list]: (d[list] || []).filter((_, idx) => idx !== i) }))
    mark()
  }

  return (
    <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-1">

      {/* Profile */}
      <div>
        <h4 className={SECTION_HDR}>Profile</h4>
        <textarea
          value={draft.profile || ''}
          onChange={(e) => setField('profile', e.target.value)}
          rows={4}
          className={INPUT + ' resize-none'}
          placeholder="Profile summary…"
        />
      </div>

      {/* Technical Skills */}
      <div>
        <h4 className={SECTION_HDR}>Technical Skills</h4>
        <div className="space-y-2">
          {(draft.technical_skills || []).map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={s.category}
                onChange={(e) => setItem('technical_skills', i, 'category', e.target.value)}
                placeholder="Category"
                className={INPUT + ' w-1/3'}
              />
              <input
                value={s.items}
                onChange={(e) => setItem('technical_skills', i, 'items', e.target.value)}
                placeholder="Items (comma-separated)"
                className={INPUT + ' flex-1'}
              />
              <RemoveBtn onClick={() => removeItem('technical_skills', i)} />
            </div>
          ))}
          <AddBtn onClick={() => addItem('technical_skills', { category: '', items: '' })} label="Add skill category" />
        </div>
      </div>

      {/* Education */}
      <div>
        <h4 className={SECTION_HDR}>Education</h4>
        <div className="space-y-3">
          {(draft.education || []).map((edu, i) => (
            <div key={i} className={CARD}>
              <div className="flex gap-2">
                <input
                  value={edu.institution}
                  onChange={(e) => setItem('education', i, 'institution', e.target.value)}
                  placeholder="Institution"
                  className={INPUT + ' flex-1'}
                />
                <input
                  value={edu.dates}
                  onChange={(e) => setItem('education', i, 'dates', e.target.value)}
                  placeholder="Dates"
                  className={INPUT + ' w-40'}
                />
              </div>
              <input
                value={edu.degree}
                onChange={(e) => setItem('education', i, 'degree', e.target.value)}
                placeholder="Degree"
                className={INPUT}
              />
              <div>
                <label className="text-xs text-[var(--color-muted)] mb-1 block">Highlights (one per line)</label>
                <textarea
                  value={hl2text(edu.highlights)}
                  onChange={(e) => setHl('education', i, e.target.value)}
                  rows={3}
                  className={INPUT + ' resize-none'}
                />
              </div>
              <button
                onClick={() => removeItem('education', i)}
                className="text-xs text-[var(--color-danger)] hover:opacity-70 transition-opacity"
              >
                Remove entry
              </button>
            </div>
          ))}
          <AddBtn
            onClick={() => addItem('education', { institution: '', degree: '', dates: '', highlights: [] })}
            label="Add education"
          />
        </div>
      </div>

      {/* Experience */}
      <div>
        <h4 className={SECTION_HDR}>Experience</h4>
        <div className="space-y-3">
          {(draft.experience || []).map((exp, i) => (
            <div key={i} className={CARD}>
              <div className="flex gap-2">
                <input
                  value={exp.title}
                  onChange={(e) => setItem('experience', i, 'title', e.target.value)}
                  placeholder="Job title"
                  className={INPUT + ' flex-1'}
                />
                <input
                  value={exp.dates}
                  onChange={(e) => setItem('experience', i, 'dates', e.target.value)}
                  placeholder="Dates"
                  className={INPUT + ' w-40'}
                />
              </div>
              <input
                value={exp.company}
                onChange={(e) => setItem('experience', i, 'company', e.target.value)}
                placeholder="Company"
                className={INPUT}
              />
              <div>
                <label className="text-xs text-[var(--color-muted)] mb-1 block">Highlights (one per line)</label>
                <textarea
                  value={hl2text(exp.highlights)}
                  onChange={(e) => setHl('experience', i, e.target.value)}
                  rows={4}
                  className={INPUT + ' resize-none'}
                />
              </div>
              <button
                onClick={() => removeItem('experience', i)}
                className="text-xs text-[var(--color-danger)] hover:opacity-70 transition-opacity"
              >
                Remove entry
              </button>
            </div>
          ))}
          <AddBtn
            onClick={() => addItem('experience', { title: '', company: '', dates: '', highlights: [] })}
            label="Add experience"
          />
        </div>
      </div>

      {/* Projects */}
      <div>
        <h4 className={SECTION_HDR}>Projects</h4>
        <div className="space-y-3">
          {(draft.projects || []).map((proj, i) => (
            <div key={i} className={CARD}>
              <div className="flex gap-2">
                <input
                  value={proj.name}
                  onChange={(e) => setItem('projects', i, 'name', e.target.value)}
                  placeholder="Project name"
                  className={INPUT + ' flex-1'}
                />
                <input
                  value={proj.github_url || ''}
                  onChange={(e) => setItem('projects', i, 'github_url', e.target.value)}
                  placeholder="GitHub URL"
                  className={INPUT + ' w-56'}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--color-muted)] mb-1 block">Highlights (one per line)</label>
                <textarea
                  value={hl2text(proj.highlights)}
                  onChange={(e) => setHl('projects', i, e.target.value)}
                  rows={3}
                  className={INPUT + ' resize-none'}
                />
              </div>
              <button
                onClick={() => removeItem('projects', i)}
                className="text-xs text-[var(--color-danger)] hover:opacity-70 transition-opacity"
              >
                Remove entry
              </button>
            </div>
          ))}
          <AddBtn
            onClick={() => addItem('projects', { name: '', github_url: '', highlights: [] })}
            label="Add project"
          />
        </div>
      </div>

    </div>
  )
}

// ─── main export ──────────────────────────────────────────────────────────────

export default function CVEditor({ value, onSave, exportUrl, exportFilename }) {
  const [editing, setEditing]     = useState(false)
  const [draft, setDraft]         = useState(null)
  const [modified, setModified]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [savedMsg, setSavedMsg]   = useState(false)
  const [exporting, setExporting] = useState(false)

  // Warn before browser-level navigation when there are unsaved changes
  useEffect(() => {
    if (!modified) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [modified])

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(value || {})))
    setModified(false)
    setEditing(true)
  }

  function cancelEdit() {
    if (modified && !window.confirm('You have unsaved changes. Discard?')) return
    setEditing(false)
    setDraft(null)
    setModified(false)
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave(draft)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
      setEditing(false)
      setDraft(null)
      setModified(false)
    } catch { /* parent's onSave should handle errors */ } finally {
      setSaving(false)
    }
  }

  async function handleExport() {
    if (!exportUrl || exporting) return
    setExporting(true)
    try {
      const base = import.meta.env.VITE_API_URL ?? ''
      const res = await fetch(`${base}${exportUrl}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = exportFilename
      link.click()
      URL.revokeObjectURL(link.href)
    } catch { } finally {
      setExporting(false)
    }
  }

  if (!value) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
        <p className="text-sm text-[var(--color-muted)]">No tailored CV was generated for this application.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">

      {/* toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
        <div>
          {savedMsg && <span className="text-xs text-green-500">Saved!</span>}
        </div>
        <div className="flex items-center gap-3">
          {!editing ? (
            <>
              <CopyButton text={cvToPlainText(value)} />
              {exportUrl && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <Spinner size={13} />
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  Export PDF
                </button>
              )}
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Spinner size={12} />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* body */}
      <div className="p-5">
        {editing
          ? <EditForm draft={draft} setDraft={setDraft} setModified={setModified} />
          : <ReadView cv={value} />
        }
      </div>

    </div>
  )
}
