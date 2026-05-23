import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCVVersions } from '../hooks/useApplications'
import CVUploadForm from '../components/CVUploadForm'
import CVCard from '../components/CVCard'
import CVViewer from '../components/CVViewer'
import CVManagerEmptyState from '../components/CVManagerEmptyState'
import DemoBlockedMessage from '../components/DemoBlockedMessage'
import useDemoGuard from '../hooks/useDemoGuard'
import { CVManagerSkeleton } from '../components/skeletons/CVManagerSkeleton'

export default function CVManagerPage() {
  const { data: versions = [], isLoading } = useCVVersions()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [viewerOpen, setViewerOpen]       = useState(false)
  const [uploadOpen, setUploadOpen]       = useState(false)
  const { guard: guardAdd, visible: addBlocked } = useDemoGuard()

  const [searchParams] = useSearchParams()
  const isWelcome = searchParams.get('welcome') === 'true'

  const selectedCV = versions[selectedIndex] || null

  // Keep selectedIndex in bounds if a CV is deleted
  useEffect(() => {
    if (versions.length > 0 && selectedIndex >= versions.length) {
      setSelectedIndex(versions.length - 1)
    }
    if (versions.length === 0) {
      setViewerOpen(false)
    }
  }, [versions.length, selectedIndex])

  // Auto-open upload form on first welcome visit
  useEffect(() => {
    if (isWelcome && !isLoading && versions.length === 0) {
      setUploadOpen(true)
    }
  }, [isWelcome, isLoading, versions.length])

  const handleView = (index) => {
    setSelectedIndex(index)
    setViewerOpen(true)
  }

  const handlePrev = () =>
    setSelectedIndex(i => (i > 0 ? i - 1 : versions.length - 1))

  const handleNext = () =>
    setSelectedIndex(i => (i < versions.length - 1 ? i + 1 : 0))

  const handleClose = () => setViewerOpen(false)

  const handleEmptyUpload = () => {
    setUploadOpen(true)
    setTimeout(() => {
      document.getElementById('cv-upload-form')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  if (isLoading) return <CVManagerSkeleton />

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">

      {/* Welcome banner */}
      {isWelcome && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#fd5a04]/8 border border-[#fd5a04]/20 mb-5">
          <span className="text-xl flex-shrink-0">👋</span>
          <div>
            <p className="text-sm font-semibold text-white">Welcome to Loophire!</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Start by uploading your CV below. Once it's saved, go to Apply to generate your first tailored application.
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">CV Manager</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {versions.length} CV version{versions.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => guardAdd(() => setUploadOpen(o => !o))}
            className="px-4 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-accent-2)] transition-colors"
          >
            + Add CV
          </button>
          <DemoBlockedMessage visible={addBlocked} />
        </div>
      </div>

      {/* Upload form — collapsible */}
      {uploadOpen && (
        <div id="cv-upload-form" className="mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-[var(--color-text)]">Upload new CV</h2>
            <button
              onClick={() => setUploadOpen(false)}
              className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-lg leading-none"
            >
              ✕
            </button>
          </div>
          <CVUploadForm onSuccess={() => setUploadOpen(false)} />
        </div>
      )}

      {/* Main split layout */}
      <div className={`flex gap-4 ${viewerOpen ? 'flex-col md:flex-row' : 'flex-col'}`}>

        {/* LEFT — CV list */}
        <div className={`flex-shrink-0 ${viewerOpen ? 'w-full md:w-[320px] lg:w-[360px]' : 'w-full max-w-2xl mx-auto'}`}>
          {versions.length === 0 ? (
            <CVManagerEmptyState onUpload={handleEmptyUpload} />
          ) : (
            <div className="flex flex-col gap-3">

              {/* Navigation bar — shown when viewer is open and there are multiple CVs */}
              {viewerOpen && versions.length > 1 && (
                <div className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-2">
                  <span className="text-xs text-[var(--color-muted)]">
                    {selectedIndex + 1} of {versions.length}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrev}
                      title="Previous CV"
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors text-sm font-bold"
                    >↑</button>
                    <button
                      onClick={handleNext}
                      title="Next CV"
                      className="w-8 h-8 flex items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors text-sm font-bold"
                    >↓</button>
                  </div>
                </div>
              )}

              {versions.map((cv, index) => (
                <CVCard
                  key={cv.id}
                  cv={cv}
                  isSelected={viewerOpen && index === selectedIndex}
                  compact={viewerOpen}
                  onView={() => handleView(index)}
                  onSelect={() => {
                    setSelectedIndex(index)
                    setViewerOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — CV viewer */}
        {viewerOpen && selectedCV && (
          <div className="flex-1 min-w-0">
            <CVViewer
              cv={selectedCV}
              onClose={handleClose}
              onPrev={handlePrev}
              onNext={handleNext}
              currentIndex={selectedIndex}
              total={versions.length}
            />
          </div>
        )}
      </div>
    </div>
  )
}
