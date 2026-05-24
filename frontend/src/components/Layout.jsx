import { Outlet } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'
import DemoBanner from './DemoBanner'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <ErrorBoundary level="card">
        <DemoBanner />
      </ErrorBoundary>
      <ErrorBoundary
        level="section"
        fallback={
          <div className="h-14 bg-[#1a1918] border-b border-[#2e2c2a] flex items-center px-6">
            <span className="font-semibold text-white tracking-tight">
              Loop<span className="text-[#fd5a04]">hire</span>
            </span>
          </div>
        }
      >
        <Navbar />
      </ErrorBoundary>
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
