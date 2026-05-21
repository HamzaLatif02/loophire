import { Outlet } from 'react-router-dom'
import DemoBanner from './DemoBanner'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
