// =============================================================================
// AUTH CONTEXT
// -----------------------------------------------------------------------------
// Wraps the entire app (see App.jsx). Provides:
//   - session, user        :: from Supabase Auth
//   - profile              :: row from public.profiles (role, phase, etc.)
//   - loading              :: true while the initial session is being resolved
//   - login(email, pwd)    :: throws on error
//   - signup({ email, password, firstName, lastName, requestedRole })
//                          :: throws on error; trigger creates profile
//   - logout()             :: clears session
//   - refreshProfile()     :: re-fetches the profile row (use after updates)
//
// ⚠️  DEADLOCK WARNING — see comment in the useEffect below before editing.
// =============================================================================
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('[Auth] fetchProfile error:', error.message)
      return null
    }
    return data
  }

  useEffect(() => {
    let isMounted = true

    // NOTE: callback is intentionally NOT async. See deadlock warning above.
    // Supabase holds an internal lock while running this callback; awaiting a
    // supabase.* call inside it would deadlock with signInWithPassword().
    // setTimeout(fn, 0) defers the DB call to the next tick after the lock
    // is released.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(newSession.user.id)
            if (isMounted) {
              setProfile(profileData)
              setLoading(false)
            }
          }, 0)
        } else {
          if (isMounted) {
            setProfile(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ---- Public API ----------------------------------------------------------
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  // signup now takes an object so we can pass first/last name + requested role
  // without a long positional argument list. The fields land in
  // raw_user_meta_data and are read by the handle_new_user() SQL trigger.
  //
  // IMPORTANT: requestedRole here is just the user's PREFERENCE. The trigger
  // always sets profiles.role = 'internee' regardless. Only owner approval
  // (Round 3) can promote to admin.
  const signup = async ({ email, password, firstName, lastName, requestedRole }) => {
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          requested_role: requestedRole,
        },
      },
    })
    if (error) throw error
    return data
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const refreshProfile = async () => {
    if (!user) return
    const profileData = await fetchProfile(user.id)
    setProfile(profileData)
  }

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, login, signup, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}