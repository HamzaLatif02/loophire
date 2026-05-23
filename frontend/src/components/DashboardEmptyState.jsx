import { Link } from 'react-router-dom'
import { useCVVersions } from '../hooks/useApplications'

export default function DashboardEmptyState() {
  const { data: cvs = [] } = useCVVersions()
  const hasCV = cvs.length > 0

  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl">

      <div className="w-16 h-16 rounded-full bg-[#fd5a04]/10 border border-[#fd5a04]/20 flex items-center justify-center mb-5">
        <span className="text-2xl">{hasCV ? '🚀' : '📄'}</span>
      </div>

      <h2 className="text-lg font-semibold text-white mb-2">
        {hasCV ? 'No applications yet' : 'Get started in 3 steps'}
      </h2>

      <p className="text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
        {hasCV
          ? 'Find a job you want to apply for and Loophire will tailor your CV, write a cover letter, and score your fit automatically.'
          : 'Upload your CV, find a job, and get a tailored application in under 30 seconds.'
        }
      </p>

      {!hasCV ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Link
            to="/cv-manager"
            className="w-full px-6 py-3 bg-[#fd5a04] text-white font-semibold rounded-lg text-sm text-center hover:bg-[#e04e03] transition-colors"
          >
            Upload your CV first →
          </Link>
          <p className="text-xs text-gray-600">Takes less than a minute</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <Link
            to="/apply"
            className="w-full px-6 py-3 bg-[#fd5a04] text-white font-semibold rounded-lg text-sm text-center hover:bg-[#e04e03] transition-colors"
          >
            Generate your first application →
          </Link>
          <p className="text-xs text-gray-600">Search jobs or paste a description</p>
        </div>
      )}
    </div>
  )
}
