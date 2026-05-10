import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import ErrorBoundary from './components/ErrorBoundary'

const LandingPage           = lazy(() => import('./pages/LandingPage'))
const LoginPage             = lazy(() => import('./pages/LoginPage'))
const RegisterPage          = lazy(() => import('./pages/RegisterPage'))
const HomePage              = lazy(() => import('./pages/HomePage'))
const ApplyPage             = lazy(() => import('./pages/ApplyPage'))
const DashboardPage         = lazy(() => import('./pages/DashboardPage'))
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'))
const CVManagerPage         = lazy(() => import('./pages/CVManagerPage'))

export default function App() {
  return (
    <Routes>
      {/* public landing page — standalone, no layout wrapper */}
      <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />

      {/* public auth routes */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* protected routes — Layout provides Navbar + padding via Outlet */}
      <Route element={<Layout />}>
        <Route path="/home"             element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/apply"            element={<PrivateRoute><ApplyPage /></PrivateRoute>} />
        <Route path="/applications"     element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/applications/:id" element={<PrivateRoute><ApplicationDetailPage /></PrivateRoute>} />
        <Route path="/cv-manager"       element={<PrivateRoute><CVManagerPage /></PrivateRoute>} />
        <Route path="*"                 element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
