import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <p className="text-6xl font-bold text-[#2a2826] mb-4">404</p>
        <h1 className="text-lg font-semibold text-white mb-2">Page not found</h1>
        <p className="text-sm text-gray-400 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-5 py-2.5 bg-[#fd5a04] text-white text-sm font-medium rounded-lg hover:bg-[#e04e03] transition-colors"
          >
            Go home
          </Link>
          <Link
            to="/applications"
            className="px-5 py-2.5 border border-[#2e2c2a] text-gray-300 text-sm font-medium rounded-lg hover:bg-[#232220] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
