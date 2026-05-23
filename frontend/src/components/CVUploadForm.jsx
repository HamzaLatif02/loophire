import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import Spinner from './Spinner'
import api from '../utils/api'
import { KEYS } from '../hooks/useApplications'

export default function CVUploadForm({ onSuccess }) {
  const queryClient = useQueryClient()
  const [name, setName]           = useState('')
  const [file, setFile]           = useState(null)
  const [templateId, setTemplateId] = useState('auto')
  const [templates, setTemplates] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [result, setResult]       = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/cvs/templates').then(({ data }) => setTemplates(data)).catch(() => {})
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!name.trim()) { setUploadError('Please enter a name for this CV.'); return }
    if (!file)        { setUploadError('Please select a PDF file.'); return }

    setUploading(true)
    setUploadError('')
    setResult(null)

    const form = new FormData()
    form.append('file', file)
    form.append('name', name.trim())
    form.append('template_id', templateId)

    try {
      const { data } = await api.post('/cvs/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      queryClient.invalidateQueries({ queryKey: KEYS.cvVersions })
      setName('')
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setUploadError(err.userMessage ?? err.response?.data?.detail ?? 'Upload failed — please try again.')
    } finally {
      setUploading(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] ' +
    'px-3.5 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] ' +
    'focus:outline-none focus:border-[var(--color-accent)] transition-colors'

  return (
    <form onSubmit={handleUpload} className="space-y-5">

      {/* CV name */}
      <div>
        <label className="text-xs text-[var(--color-muted)] mb-1.5 block">CV name</label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setUploadError('') }}
          placeholder="e.g. Software Engineer, Data Analyst"
          className={inputCls}
          disabled={uploading}
        />
      </div>

      {/* File picker */}
      <div>
        <label className="text-xs text-[var(--color-muted)] mb-1.5 block">PDF file</label>
        <label className="cursor-pointer block">
          <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-dashed text-sm transition-colors ${
            file
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
          }`}>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span className="truncate">{file ? file.name : 'Choose PDF'}</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={e => { setFile(e.target.files[0] || null); setUploadError('') }}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Template selector */}
      <div>
        <label className="text-xs text-[var(--color-muted)] mb-2 block">Export template</label>

        {/* Auto-detect option */}
        <div
          onClick={() => setTemplateId('auto')}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-2 transition-all ${
            templateId === 'auto'
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
          }`}
        >
          <Radio selected={templateId === 'auto'} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)]">Auto-detect</p>
            <p className="text-xs text-[var(--color-muted)]">Analyse your CV and pick the closest matching template</p>
          </div>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex-shrink-0">
            Recommended
          </span>
        </div>

        {/* Named templates */}
        {templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`flex flex-col gap-1 p-3 rounded-lg border cursor-pointer transition-all ${
                  templateId === t.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Radio selected={templateId === t.id} small />
                  <span className="text-sm font-medium text-[var(--color-text)]">{t.name}</span>
                </div>
                <p className="text-xs text-[var(--color-muted)] pl-5 leading-relaxed">{t.preview}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {uploadError && <p className="text-xs text-[var(--color-danger)]">{uploadError}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-800 rounded-lg">
            <span className="text-green-400">✓</span>
            <div>
              <p className="text-sm font-medium text-green-400">CV uploaded successfully</p>
              <p className="text-xs text-gray-500 mt-0.5">
                &ldquo;{result.name}&rdquo; —{' '}
                {result.auto_detected
                  ? `template auto-detected: ${result.template_name}`
                  : `${result.template_name} template`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#232220] border border-[#2e2c2a] rounded-lg">
            <span className="text-[#fd5a04] text-lg flex-shrink-0">→</span>
            <div className="flex-1">
              <p className="text-xs font-medium text-white">Ready to apply</p>
              <p className="text-xs text-gray-500">Go to Apply to generate your first tailored application</p>
            </div>
            <Link
              to="/apply"
              className="px-3 py-1.5 bg-[#fd5a04] text-white text-xs font-medium rounded-md hover:bg-[#e04e03] transition-colors flex-shrink-0"
            >
              Apply now →
            </Link>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? <><Spinner size={13} /> Uploading…</> : 'Upload CV'}
      </button>
    </form>
  )
}

function Radio({ selected, small = false }) {
  const outer = small ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const inner = small ? 'w-1.5 h-1.5' : 'w-2 h-2'
  return (
    <div className={`${outer} rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
      selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'
    }`}>
      {selected && <div className={`${inner} rounded-full bg-[var(--color-accent)]`} />}
    </div>
  )
}
