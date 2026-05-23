export default function CVManagerEmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl">

      {/* Illustration */}
      <div className="w-16 h-16 rounded-full bg-[#fd5a04]/10 border border-[#fd5a04]/20 flex items-center justify-center mb-5">
        <span className="text-2xl">📄</span>
      </div>

      <h2 className="text-lg font-semibold text-white mb-2">
        Upload your first CV
      </h2>

      <p className="text-sm text-gray-400 max-w-sm mb-2 leading-relaxed">
        Loophire tailors your CV to every job you apply for. Upload it once and the AI does the rest.
      </p>

      {/* What happens next */}
      <div className="flex flex-col gap-2.5 w-full max-w-xs mb-7 mt-4">
        {[
          { step: '1', text: 'Upload your CV as a PDF' },
          { step: '2', text: 'Find a job on Reed, Adzuna, or paste a description' },
          { step: '3', text: 'Get a tailored CV, cover letter, and fit score in under 30 seconds' },
        ].map(({ step, text }) => (
          <div key={step} className="flex items-center gap-3 text-left">
            <div className="w-6 h-6 rounded-full bg-[#fd5a04]/15 border border-[#fd5a04]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-[#fd5a04]">{step}</span>
            </div>
            <p className="text-sm text-gray-400">{text}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onUpload}
        className="px-6 py-3 bg-[#fd5a04] text-white font-semibold rounded-lg text-sm hover:bg-[#e04e03] transition-colors"
      >
        Upload CV
      </button>

      <p className="text-xs text-gray-600 mt-3">
        PDF format · Max 5MB · Parsed instantly
      </p>
    </div>
  )
}
