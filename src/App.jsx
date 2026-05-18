// =============================================================================
// APP ROOT
// -----------------------------------------------------------------------------
// Wraps everything in AuthProvider + BrowserRouter and defines the routes.
// Add new pages here. Use <ProtectedRoute> around anything that requires
// authentication.
// =============================================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Quizzes from './pages/Quizzes'
import Quiz from './pages/Quiz'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <Quizzes />
              </ProtectedRoute>
            }
          />
          {/* Quiz runner — full-screen focus mode, takes the phase as a param */}
          <Route
            path="/quiz/:phase"
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            }
          />

          {/* Root + 404 → dashboard (ProtectedRoute bounces to /login if unauthed) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}