// =============================================================================
// SUPABASE CLIENT (singleton)
// -----------------------------------------------------------------------------
// Import this anywhere a Supabase call is needed:
//   import { supabase } from '@/lib/supabaseClient'
//
// Env vars MUST be prefixed with VITE_ to be exposed to client code by Vite.
// Anything not prefixed stays server-side only and will be undefined here.
// =============================================================================
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail fast in dev — far better than a cryptic 401 at runtime.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[StackGate] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Check your .env file against .env.example.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // Keep session in localStorage across reloads
    autoRefreshToken: true,    // Refresh JWT before it expires
    detectSessionInUrl: true,  // Required for magic-link / OAuth callbacks
  },
})