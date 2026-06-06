# StackGate — Project Context File
> **Single source of truth.** Updated at the end of every significant session.
> At session start, paste this file or say "read the context file."
> Roles: Lead Trainer · Senior Developer · Tester

---

## 1. Executive Summary

**StackGate** is a proctored internee assessment and training platform. Interns progress through four web-dev phases — HTML → CSS → JavaScript → Shopify Liquid — by passing timed, server-graded quizzes. Owners and admins manage interns, approve admin role requests, and monitor flagged quiz attempts.

The platform is in active early development. Core auth, quiz runner, and dashboard are built. The three planned management pages (`/tasks`, `/team`, `/settings`) are routed but not implemented.

**Stack:** React 19 · Vite 8 · Tailwind CSS 3 · Supabase (Auth + Postgres + RPCs) · React Router 7  
**Deployment:** Vercel (`vercel.json` configured for SPA routing)  
**No TypeScript** — plain JS throughout.

---

## 2. Tech Architecture Reference

### Routing (`src/App.jsx`)
| Route | Component | Access |
|---|---|---|
| `/login` | Login.jsx | Public |
| `/register` | Register.jsx | Public |
| `/dashboard` | Dashboard.jsx | Protected |
| `/quizzes` | Quizzes.jsx | Protected |
| `/quiz/:phase` | Quiz.jsx | Protected |
| `/notifications` | Notifications.jsx | Protected |
| `/tasks` | — | Stubbed → redirects to `/dashboard` |
| `/team` | — | Stubbed → redirects to `/dashboard` |
| `/settings` | — | Stubbed → redirects to `/dashboard` |

### File Tree (key files only)
```
src/
  App.jsx                         # Root router + AuthProvider wrapper
  context/
    AuthContext.jsx               # session, user, profile, login, signup, logout, refreshProfile
  lib/
    supabaseClient.jsx            # Supabase client (fail-fast guard if env vars missing)
  pages/
    Login.jsx
    Register.jsx
    Dashboard.jsx                 # Welcome + phase strip + DeadlineCard + RoadmapPanel
    Quizzes.jsx                   # Phase listing, lock/unlock gating
    Quiz.jsx                      # Pure render — all logic delegated to useQuizSession
    Notifications.jsx             # Owner/admin — flagged auto-submitted attempts
  hooks/
    useQuizSession.js             # Full quiz state machine (loading→active→done/auto/error)
    useQuizSession.test.js        # Vitest test suite (see Testing section)
  components/
    ProtectedRoute.jsx
    layout/
      DashboardLayout.jsx         # Sidebar + navbar shell shared by all protected pages
    quiz/
      CanvasQuestion.jsx          # Question + optional code snippet renderer
      QuizTimer.jsx               # Per-question countdown, fires onExpire
    common/
      Loader.jsx
  utils/
    constants.js                  # ROLES, PHASES, PHASE_LABELS, ROLE_LABELS, PHASE_ROADMAP,
                                  # QUIZ_PASS_THRESHOLD, QUIZ_TIME_LIMIT_SECONDS
```

### Database (`public.profiles` table)
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | FK → auth.users.id |
| `email` | TEXT | |
| `full_name` | TEXT | |
| `first_name` | TEXT | |
| `last_name` | TEXT | |
| `role` | `user_role` enum | `owner \| admin \| internee` — set by trigger, never by client |
| `requested_role` | `user_role` enum | What the user asked to be at signup |
| `admin_approval_status` | `admin_approval_state` enum | `pending \| approved \| rejected` — NULL for internees |
| `admin_approval_token` | UUID | Approval link token minted at signup for admin requests |
| `approval_requested_at` | TIMESTAMPTZ | |
| `current_phase` | `phase_type` enum | `html \| css \| js \| liquid` — defaults to `html` |
| `unlocked_phases` | `phase_type[]` | NOT NULL — defaults to `{html}` |
| `phase_deadlines` | JSONB | `{"html": {"start_date": "YYYY-MM-DD", "deadline": "YYYY-MM-DD"}}` |

**Custom enums:**
- `user_role`: `owner`, `admin`, `internee`
- `phase_type`: `html`, `css`, `js`, `liquid`
- `admin_approval_state`: `pending`, `approved`, `rejected`

### Database Functions / RPCs
| Name | Trigger / RPC | Purpose |
|---|---|---|
| `handle_new_user()` | AFTER INSERT ON auth.users | Creates `public.profiles` row from `raw_user_meta_data` |
| `get_quiz_questions(p_phase)` | RPC | Returns questions with `correct_option_index` stripped |
| `grade_quiz_attempt(...)` | RPC | Grades server-side, returns score/pass/unlock info |

### Auth Pattern
- `supabase.auth.signUp()` → GoTrue creates `auth.users` row → `handle_new_user` trigger fires → `public.profiles` row created.
- `AuthContext` uses `onAuthStateChange` (intentionally NOT async — deadlock guard documented in the file).
- `fetchProfile` does `select('*')` — any new column added to `profiles` automatically appears in `profile` without AuthContext changes.
- `refreshProfile()` re-fetches the profile row (call after grading a quiz to reflect unlocked phases).

---

## 3. Feature Timeline (Chronological)

| # | Session | Feature | Status |
|---|---|---|---|
| 1 | S1 | Project scaffold: React 19 + Vite + Tailwind + Supabase + React Router | ✅ Done |
| 2 | S1 | Auth system: Login, Register, AuthContext, ProtectedRoute | ✅ Done |
| 3 | S1 | `handle_new_user` DB trigger (creates profile on signup) | ✅ Done |
| 4 | S1 | First/last name fields + `requested_role` added to signup | ✅ Done |
| 5 | S1 | Admin approval workflow: pending status + approval token minted at signup | ✅ Done |
| 6 | S1 | Core pages: Dashboard, Quizzes, Quiz runner, Notifications | ✅ Done |
| 7 | S1 | DashboardLayout: sidebar + navbar shell | ✅ Done |
| 8 | S1 | Tab-switch enforcement in quiz (1st → warning, 2nd → auto-submit) | ✅ Done |
| 9 | S2 | Removed unused `resend` dependency (API key exposure risk) | ✅ Done |
| 10 | S2 | Refactored Quiz.jsx: extracted all state logic into `useQuizSession.js` hook | ✅ Done |
| 11 | S2 | Fixed dead-code ternary bug in Quiz.jsx line 134 | ✅ Done |
| 12 | S2 | Vitest test suite for `useQuizSession` (12 test cases, stale-ref safety covered) | ✅ Done |
| 13 | S2 | Fixed `handle_new_user` trigger: NOT NULL violation on `unlocked_phases` | ✅ Done |
| 14 | S3 | Added `phase_deadlines JSONB` column to `public.profiles` | ✅ Done |
| 15 | S3 | Added `PHASE_ROADMAP` to `constants.js` (7 topics per phase) | ✅ Done |
| 16 | S3 | Dashboard: `DeadlineCard` component (days remaining + progress bar) | ✅ Done |
| 17 | S3 | Dashboard: `RoadmapPanel` component (collapsible topic checklist) | ✅ Done |

---

## 4. Current Phase

**Phase: Dashboard Enhancement — COMPLETE**

The dashboard now shows all internee-facing content:
1. Welcome card with current phase name
2. Phase progression strip (HTML / CSS / JS / Liquid — locked/unlocked/current states)
3. `DeadlineCard` — renders only when `phase_deadlines[phase]` is set in the DB; color-coded green → amber → red by urgency; progress bar if `start_date` is also stored
4. `RoadmapPanel` — always visible for internees; collapsible; 7 curriculum topics per phase from `PHASE_ROADMAP` constant; zero DB fetch
5. Quick action tiles (My Tasks, Take a quiz, Manage team for owner/admin)

**Next up: `/tasks` page** — Interns view assigned tasks and submit documentation.

---

## 5. Pending Tasks / Backlog

### High Priority
- [ ] **`/tasks` page** — Intern view: list of tasks assigned by admin, ability to submit task documentation/links. Requires a `tasks` table (schema TBD).
- [ ] **`/team` page** — Owner/admin view: list all interns, see current phase, assign tasks, view quiz history. Pending `tasks` table design.
- [ ] **Admin approval UI** — Owner dashboard: approve or reject pending admin requests (currently only via Supabase Table Editor). Token-based approval link already exists in the DB.

### Medium Priority
- [ ] **`/settings` page** — User profile settings (name, password change).
- [ ] **Admin: Set phase deadlines UI** — Currently set via Supabase Table Editor. Needs an owner/admin form that writes to `phase_deadlines` JSONB via an RPC or direct update.
- [ ] **Vitest setup** — Dependencies not yet installed. Run: `npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom`. Add `test: { environment: 'jsdom', globals: true }` to `vite.config.js`.

### Low Priority / Future
- [ ] **RoadmapPanel: per-topic completion tracking** — Let interns check off topics as they study. Requires either a DB column or localStorage. Not requested yet.
- [ ] **Quiz attempt history** — Show past attempts (score, date, pass/fail) on the Quizzes page.
- [ ] **TypeScript migration** — No TS currently. Worth adding if team grows.
- [ ] **Email confirmation flow** — Supabase email confirmation may be on/off; confirm intended behavior for production.

---

## 6. Known Issues / Debugging Log

| # | Issue | Root Cause | Resolution | Status |
|---|---|---|---|---|
| 1 | "Database error saving new user" on registration | `handle_new_user` trigger INSERT omitted `unlocked_phases` (NOT NULL column) and `current_phase`. Postgres threw a constraint violation; GoTrue wrapped it as the generic error. | Rewrote trigger INSERT to explicitly include `current_phase = 'html'::phase_type` and `unlocked_phases = ARRAY['html'::phase_type]`. | ✅ Fixed |
| 2 | Dead-code ternary in Quiz.jsx | `setStatus(autoSubmitted ? 'submitting' : 'submitting')` — both branches identical. No functional bug but misleads the reader. | Removed ternary; `submitQuiz` now calls `setStatus('submitting')` directly. | ✅ Fixed |
| 3 | Stale closure in `visibilitychange` handler | Handler registered once (keyed to `questions` array). Any function it closes over becomes stale after re-renders. | Used `submitQuizRef` pattern: ref is reassigned every render (`submitQuizRef.current = submitQuiz`); handler calls `submitQuizRef.current()`, never a stale copy. | ✅ Resolved by design |
| 4 | `resend` package in dependencies | Never imported in `src/` but was in `package.json`. Risk: a future dev might import it client-side and expose the API key in the browser bundle. | Ran `npm uninstall resend`. | ✅ Removed |

---

## 7. Architecture Invariants (Do Not Break)

These are non-obvious rules that must be preserved when adding features:

1. **Auth callback must stay synchronous.** `onAuthStateChange` in `AuthContext` holds a Supabase internal lock. Awaiting any `supabase.*` call inside the callback deadlocks `signInWithPassword`. The `setTimeout(fn, 0)` deferral is intentional — do not remove it.

2. **Quiz answers never reach the client.** `get_quiz_questions` RPC strips `correct_option_index` server-side. Never add a query that fetches raw question rows with answers from the client.

3. **Role is always set by the DB trigger, never by client code.** `handle_new_user` hardcodes `role = 'internee'`. Only the owner can promote a user to admin via the approval workflow. Client code must never write to the `role` column.

4. **`select('*')` in `fetchProfile` is intentional.** Adding columns to `profiles` automatically surfaces them in `profile` throughout the app. Do not switch to a column list without auditing every consumer.

5. **`useQuizSession` owns all quiz state.** `Quiz.jsx` is pure render. Do not add business logic, timers, or state back into the component — put it in the hook.

6. **`phase_deadlines` JSONB structure:** `{ "<phase>": { "start_date": "YYYY-MM-DD", "deadline": "YYYY-MM-DD" } }`. `start_date` is optional (DeadlineCard hides the progress bar if absent). `deadline` is required for the card to render.

---

## 8. Testing Reference

**Test file:** `src/hooks/useQuizSession.test.js`  
**Runner:** Vitest (not yet installed — see Pending Tasks)

**Install command:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
```

**`vite.config.js` addition needed:**
```js
test: {
  environment: 'jsdom',
  globals: true,
}
```

**Coverage:** loading states, answer recording, double-advance guard, timer expiry (−1 answers), tab-switch warning, tab-switch auto-submit, stale-ref safety, RPC error handling.

**Run tests:**
```bash
npm run test
```

---

## 9. Environment & Local Dev

**Required `.env` variables** (copy from `.env.example`):
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Both variables are validated at startup — the app throws immediately if either is missing.

**Dev server:**
```bash
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the dist/ build locally
```

---

*Last updated: 2026-06-06 · Session 3*
