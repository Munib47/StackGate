// =============================================================================
// PROTECTED ROUTE
// -----------------------------------------------------------------------------
// Wraps any route that requires authentication. If the user is not logged in,
// redirects to /login and preserves the originally-requested path in
// `location.state.from` so Login.jsx can redirect back after success.
//
// Usage in App.jsx:
//   <Route path="/dashboard" element={
//     <ProtectedRoute><Dashboard /></ProtectedRoute>
//   } />
// =============================================================================
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // While we're still resolving the initial session, show a spinner.
  // Without this, a logged-in user briefly sees /login on refresh.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}