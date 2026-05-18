// =============================================================================
// REGISTER PAGE
// -----------------------------------------------------------------------------
// Sign up with first name + last name + email + password + a role dropdown
// (Internee or Admin). The handle_new_user() SQL trigger always creates the
// profile row with role='internee'. If the user requested 'admin', the trigger
// marks admin_approval_status='pending' and mints an approval token for the
// owner; an Edge Function (Round 2) emails the owner a link to approve.
// =============================================================================
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mail, Lock, User, Users, Eye, EyeOff, UserPlus,
  AlertCircle, CheckCircle2, Clock, Loader2, ChevronDown,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [requestedRole, setRequestedRole] = useState('internee') // 'internee' | 'admin'
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSubmitting(true)
    try {
      const result = await signup({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        requestedRole,
      })
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

  // ---- Success screen — copy changes based on requested role -----------------
  const renderSuccess = () => {
    const isAdmin = requestedRole === 'admin'
    const Icon = isAdmin ? Clock : CheckCircle2
    const iconColor = isAdmin ? 'text-amber-400' : 'text-emerald-400'
    const title = isAdmin ? 'Awaiting owner approval' : 'Check your email'
    const body = isAdmin
      ? <>We sent a confirmation link to <span className="text-zinc-200">{email}</span>. After you confirm your email, the owner will review your request to join as an admin. You'll be granted access once approved.</>
      : <>We sent a confirmation link to <span className="text-zinc-200">{email}</span>.</>

    return (
      <div className="text-center py-4">
        <Icon className={`w-12 h-12 ${iconColor} mx-auto mb-3`} />
        <h2 className="text-lg font-semibold text-zinc-100 mb-2">{title}</h2>
        <p className="text-sm text-zinc-400">{body}</p>
        <Link to="/login" className="inline-block mt-6 text-emerald-400 hover:text-emerald-300 text-sm font-medium">
          Back to login →
        </Link>
      </div>
    )
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
          {success ? renderSuccess() : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* First + last name — side-by-side on sm+, stacked on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      First name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jane"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Last name
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Developer"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition"
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

                {/* Role dropdown — native <select> styled to match the inputs.
                    Note: 'owner' is intentionally NOT a registration option;
                    owner accounts are bootstrapped manually in the DB. */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Register as
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <select
                      value={requestedRole}
                      onChange={(e) => setRequestedRole(e.target.value)}
                      className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition cursor-pointer"
                    >
                      <option value="internee">Internee — start learning the path</option>
                      <option value="admin">Admin — manage interns &amp; tasks</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  </div>
                  {requestedRole === 'admin' && (
                    <p className="text-xs text-amber-400/80 mt-2 flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      Admin requests require owner approval. You'll get access once approved.
                    </p>
                  )}
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