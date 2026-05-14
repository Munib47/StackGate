// =============================================================================
// REGISTER PAGE
// -----------------------------------------------------------------------------
// Sign up with full name + email + password. The handle_new_user() SQL
// trigger automatically creates a profiles row with role='internee'.
// Promote users to admin/owner manually in the Supabase dashboard for now.
// =============================================================================
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    try {
      const result = await signup(email, password, fullName)
      // If email confirmation is enabled in Supabase, session will be null.
      if (result?.session) {
        navigate('/dashboard', { replace: true })
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <UserPlus className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">Create account</h1>
          <p className="text-zinc-500 mt-1 text-sm">Join the StackGate workspace</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-zinc-100 mb-2">Check your email</h2>
              <p className="text-sm text-zinc-400">
                We sent a confirmation link to <span className="text-zinc-200">{email}</span>.
              </p>
              <Link to="/login" className="inline-block mt-6 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                Back to login →
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Developer"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@agency.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold py-2.5 rounded-lg transition"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                    </>
                  ) : (
                    <>Create account</>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
                <p className="text-sm text-zinc-500">
                  Already have an account?{' '}
                  <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}