// =============================================================================
// APP ROOT
// -----------------------------------------------------------------------------
// Wraps everything in AuthProvider + BrowserRouter and defines the routes.
// =============================================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Quizzes from './pages/Quizzes'
import Quiz from './pages/Quiz'
import Notifications from './pages/Notifications'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/quizzes"       element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
          <Route path="/quiz/:phase"   element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

          {/* Defaults */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}