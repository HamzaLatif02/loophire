import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'

const LandingPage           = lazy(() => import('./pages/LandingPage'))
const LoginPage             = lazy(() => import('./pages/LoginPage'))
const RegisterPage          = lazy(() => import('./pages/RegisterPage'))
const HomePage              = lazy(() => import('./pages/HomePage'))
const ApplyPage             = lazy(() => import('./pages/ApplyPage'))
const DashboardPage         = lazy(() => import('./pages/DashboardPage'))
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'))
const CVManagerPage         = lazy(() => import('./pages/CVManagerPage'))
const NotFoundPage          = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Routes>
      {/* public landing page — standalone, no layout wrapper */}
      <Route path="/" element={
        <ErrorBoundary level="page">
          <LandingPage />
        </ErrorBoundary>
      } />

      {/* public auth routes */}
      <Route path="/login" element={
        <ErrorBoundary level="page">
          <LoginPage />
        </ErrorBoundary>
      } />
      <Route path="/register" element={
        <ErrorBoundary level="page">
          <RegisterPage />
        </ErrorBoundary>
      } />

      {/* protected routes — Layout provides Navbar + padding via Outlet */}
      <Route element={<Layout />}>
        <Route path="/home" element={
          <PrivateRoute>
            <ErrorBoundary level="page">
              <HomePage />
            </ErrorBoundary>
          </PrivateRoute>
        } />
        <Route path="/apply" element={
          <PrivateRoute>
            <ErrorBoundary level="page">
              <ApplyPage />
            </ErrorBoundary>
          </PrivateRoute>
        } />
        <Route path="/applications" element={
          <PrivateRoute>
            <ErrorBoundary level="page">
              <DashboardPage />
            </ErrorBoundary>
          </PrivateRoute>
        } />
        <Route path="/applications/:id" element={
          <PrivateRoute>
            <ErrorBoundary level="page">
              <ApplicationDetailPage />
            </ErrorBoundary>
          </PrivateRoute>
        } />
        <Route path="/cv-manager" element={
          <PrivateRoute>
            <ErrorBoundary level="page">
              <CVManagerPage />
            </ErrorBoundary>
          </PrivateRoute>
        } />
        <Route path="*" element={
          <ErrorBoundary level="page">
            <NotFoundPage />
          </ErrorBoundary>
        } />
      </Route>
    </Routes>
  )
}
