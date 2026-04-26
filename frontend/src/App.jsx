import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ApplyPage from './pages/ApplyPage'
import DashboardPage from './pages/DashboardPage'
import ApplicationDetailPage from './pages/ApplicationDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/applications" element={<DashboardPage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
