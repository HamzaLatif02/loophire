import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Spinner from './components/Spinner'

const HomePage             = lazy(() => import('./pages/HomePage'))
const ApplyPage            = lazy(() => import('./pages/ApplyPage'))
const DashboardPage        = lazy(() => import('./pages/DashboardPage'))
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'))
const CVManagerPage        = lazy(() => import('./pages/CVManagerPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner size={24} />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* public landing page — no auth, no layout wrapper */}
      <Route path="/" element={<LandingPage />} />

      {/* public auth routes — no layout wrapper */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* protected routes — wrapped in layout */}
      <Route element={<Layout />}>
        <Suspense fallback={<PageLoader />}>
          <Route path="/home"               element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/apply"              element={<PrivateRoute><ApplyPage /></PrivateRoute>} />
          <Route path="/applications"       element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/applications/:id"   element={<PrivateRoute><ApplicationDetailPage /></PrivateRoute>} />
          <Route path="/cv-manager"         element={<PrivateRoute><CVManagerPage /></PrivateRoute>} />
        </Suspense>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
