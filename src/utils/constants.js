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

// Topics an internee must master before taking each phase quiz.
// Kept in code (not DB) — curriculum is managed by the dev team, not dynamically.
export const PHASE_ROADMAP = {
  html: [
    { title: 'Semantic Structure', desc: 'header, main, section, article, nav, aside, footer' },
    { title: 'Forms & Input Types', desc: 'input types, labels, fieldset, validation attributes' },
    { title: 'Tables & Lists', desc: 'thead/tbody, accessible tables, ordered/definition lists' },
    { title: 'Media Elements', desc: 'img, video, audio, picture, srcset, lazy loading' },
    { title: 'Accessibility & ARIA', desc: 'roles, aria-label, tabindex, keyboard navigation' },
    { title: 'SEO Fundamentals', desc: 'meta tags, heading hierarchy, Open Graph, canonical' },
    { title: 'HTML5 APIs', desc: 'data-* attributes, contenteditable, localStorage' },
  ],
  css: [
    { title: 'Box Model & Display', desc: 'block/inline, box-sizing, margin, padding, overflow' },
    { title: 'Flexbox', desc: 'flex-direction, justify-content, align-items, flex-grow/shrink' },
    { title: 'CSS Grid', desc: 'grid-template, fr units, grid-area, auto-placement' },
    { title: 'Responsive Design', desc: 'media queries, rem/em, viewport units, clamp()' },
    { title: 'CSS Custom Properties', desc: '--variable declaration, var() usage, :root scope' },
    { title: 'Animations & Transitions', desc: 'transition, @keyframes, animation, will-change' },
    { title: 'Specificity & Architecture', desc: 'selector weight, BEM naming, utility-first (Tailwind)' },
  ],
  js: [
    { title: 'DOM Manipulation', desc: 'querySelector, createElement, classList, innerHTML vs textContent' },
    { title: 'Events & Delegation', desc: 'addEventListener, bubbling, event.target, preventDefault' },
    { title: 'Async JavaScript', desc: 'callbacks, Promises, async/await, Promise.all, error flow' },
    { title: 'Array Methods', desc: 'map, filter, reduce, find, flat, Object.entries/keys' },
    { title: 'ES6+ Features', desc: 'destructuring, spread, optional chaining, nullish coalescing' },
    { title: 'Error Handling', desc: 'try/catch, custom Error classes, global error handlers' },
    { title: 'Fetch & REST APIs', desc: 'fetch, response.json(), headers, CRUD patterns' },
  ],
  liquid: [
    { title: 'Liquid Syntax', desc: '{{ output }}, {% tags %}, filters, whitespace control with -' },
    { title: 'Shopify Theme Architecture', desc: 'layout/, templates/, sections/, snippets/ file roles' },
    { title: 'JSON Templates', desc: 'content_for_index, sections_for_all_pages, preset structures' },
    { title: 'Section Schema & Settings', desc: 'schema settings, block types, presets, translations' },
    { title: 'Metafields & Metaobjects', desc: 'namespace.key syntax, types, referencing in Liquid output' },
    { title: 'AJAX & Dynamic Features', desc: 'Storefront API, predictive search, AJAX cart with fetch' },
    { title: 'Theme Performance', desc: 'render tag, lazy sections, asset_url, Lighthouse optimisation' },
  ],
}