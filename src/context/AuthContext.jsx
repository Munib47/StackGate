// =============================================================================
// AUTH CONTEXT
// -----------------------------------------------------------------------------
// Wraps the entire app (see App.jsx). Provides:
//   - session, user        :: from Supabase Auth
//   - profile              :: row from public.profiles (role, phase, etc.)
//   - loading              :: true while the initial session is being resolved
//   - login(email, pwd)    :: throws on error
//   - signup(email, pwd, fullName) :: throws on error; trigger creates profile
//   - logout()             :: clears session
//   - refreshProfile()     :: re-fetches the profile row (use after updates)
//
// PROFILE FETCH FLOW:
//   1. Supabase auth event fires (initial getSession OR onAuthStateChange).
//   2. We grab user.id and SELECT * FROM profiles WHERE id = user.id.
//   3. The DB trigger `on_auth_user_created` ensures this row always exists
//      for any signed-up user, so a missing row = real error worth logging.
// =============================================================================
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // ---- Helper: fetch the profiles row for a given user id ------------------
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

  // ---- Bootstrap: load any existing session, then subscribe to changes -----
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!isMounted) return

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        const profileData = await fetchProfile(currentSession.user.id)
        if (isMounted) setProfile(profileData)
      }
      if (isMounted) setLoading(false)
    }

    initAuth()

    // onAuthStateChange fires on SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id)
          setProfile(profileData)
        } else {
          setProfile(null)
        }
        setLoading(false)
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

  const signup = async (email, password, fullName) => {
    // full_name is passed via raw_user_meta_data; the handle_new_user()
    // SQL trigger reads it when creating the profiles row.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
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

// ---- Custom hook for clean consumption: const { user } = useAuth() --------
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}