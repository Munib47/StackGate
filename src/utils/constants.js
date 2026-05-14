// =============================================================================
// CONSTANTS — single source of truth for role names, phases, and thresholds.
// Any check like `if (role === 'owner')` should import from here instead.
// =============================================================================

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  INTERNEE: 'internee',
}

export const PHASES = {
  HTML: 'html',
  CSS: 'css',
  JS: 'js',
  LIQUID: 'liquid',
}

// Display labels — matches enums in the DB but pretty-printed for UI.
export const PHASE_LABELS = {
  html: 'HTML',
  css: 'CSS',
  js: 'JavaScript',
  liquid: 'Shopify Liquid',
}

export const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  internee: 'Internee',
}

// Pass threshold for quizzes (must match grade_quiz_attempt RPC in SQL).
export const QUIZ_PASS_THRESHOLD = 80
export const QUIZ_TIME_LIMIT_SECONDS = 45