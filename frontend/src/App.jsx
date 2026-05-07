import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import ApplyPage from './pages/ApplyPage'
import CVManagerPage from './pages/CVManagerPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <Routes>
      {/* public auth routes — no layout wrapper */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* protected routes — wrapped in layout */}
      <Route element={<Layout />}>
        <Route path="/"               element={<PrivateRoute><HomePage /></PrivateRoute>} />
        <Route path="/apply"          element={<PrivateRoute><ApplyPage /></PrivateRoute>} />
        <Route path="/applications"   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/applications/:id" element={<PrivateRoute><ApplicationDetailPage /></PrivateRoute>} />
        <Route path="/cv-manager"     element={<PrivateRoute><CVManagerPage /></PrivateRoute>} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
