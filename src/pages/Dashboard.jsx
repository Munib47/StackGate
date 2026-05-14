// =============================================================================
// DASHBOARD PAGE
// -----------------------------------------------------------------------------
// Main landing page after login. Layout: fixed sidebar on md+, drawer on
// mobile, top navbar with user menu + logout, main content area with
// role-aware welcome card and placeholder feature tiles.
//
// Sidebar/Navbar are inlined here for the MVP. Extract to
// components/layout/ when the dashboard grows past ~250 LOC.
// =============================================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, GraduationCap, Users, Settings,
  LogOut, Menu, X, Shield, ChevronRight, Code2, Palette, Zap, Layers,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PHASE_LABELS, ROLE_LABELS, PHASES } from '../utils/constants'

// Phase icon mapping — single source so it stays consistent across the app.
const PHASE_ICONS = {
  html: Code2,
  css: Palette,
  js: Zap,
  liquid: Layers,
}

export default function Dashboard() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Build the nav items list once. Role-gated items are filtered below.
  const navItems = [
    { label: 'Dashboard',  icon: LayoutDashboard, path: '/dashboard',  roles: ['owner', 'admin', 'internee'] },
    { label: 'Tasks',      icon: ListChecks,      path: '/tasks',      roles: ['owner', 'admin', 'internee'] },
    { label: 'Quizzes',    icon: GraduationCap,   path: '/quizzes',    roles: ['owner', 'admin', 'internee'] },
    { label: 'Team',       icon: Users,           path: '/team',       roles: ['owner', 'admin'] },
    { label: 'Settings',   icon: Settings,        path: '/settings',   roles: ['owner'] },
  ].filter((item) => item.roles.includes(profile?.role))

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* ============ SIDEBAR (desktop + mobile drawer) ============ */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40 w-64 bg-zinc-900 border-r border-zinc-800
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Brand */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold tracking-tight">StackGate</span>
          </div>
          <button
            className="md:hidden text-zinc-400 hover:text-zinc-100"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.path === '/dashboard'  // wire up with useLocation later
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                  ${isActive
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border border-transparent'}
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* User pill at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-zinc-800">
          <div className="px-3 py-2 rounded-lg bg-zinc-950/50">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="text-sm font-medium text-zinc-100 truncate">{profile?.full_name || user?.email}</p>
            <p className="text-xs text-emerald-400 mt-0.5">{ROLE_LABELS[profile?.role] || '—'}</p>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============ MAIN COLUMN ============ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
        <header className="h-16 bg-zinc-900/50 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-zinc-400 hover:text-zinc-100"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold">Dashboard</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Welcome card */}
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-6">
            <p className="text-sm text-emerald-400 font-medium mb-1">Welcome back</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {profile?.full_name || 'Developer'}
            </h2>
            <p className="text-zinc-400 mt-2 text-sm md:text-base">
              You're signed in as <span className="text-zinc-200 font-medium">{ROLE_LABELS[profile?.role]}</span>.
              {profile?.role === 'internee' && profile?.current_phase && (
                <> Currently progressing through <span className="text-emerald-400 font-medium">{PHASE_LABELS[profile.current_phase]}</span>.</>
              )}
            </p>
          </div>

          {/* Phase progression strip — only for internees */}
          {profile?.role === 'internee' && (
            <section className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Learning path
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.values(PHASES).map((phase) => {
                  const Icon = PHASE_ICONS[phase]
                  const isUnlocked = profile.unlocked_phases?.includes(phase)
                  const isCurrent = profile.current_phase === phase
                  return (
                    <div
                      key={phase}
                      className={`
                        p-4 rounded-xl border transition
                        ${isCurrent
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : isUnlocked
                            ? 'bg-zinc-900 border-zinc-800'
                            : 'bg-zinc-900/30 border-zinc-800/50 opacity-50'}
                      `}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isCurrent ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <p className="text-sm font-medium text-zinc-100">{PHASE_LABELS[phase]}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {isCurrent ? 'In progress' : isUnlocked ? 'Unlocked' : 'Locked'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Quick-action tiles */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Quick actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ActionTile icon={ListChecks} title="My Tasks" desc="View and submit task documentation." onClick={() => navigate('/tasks')} />
              <ActionTile icon={GraduationCap} title="Take a quiz" desc="Unlock the next phase of the path." onClick={() => navigate('/quizzes')} />
              {(profile?.role === 'owner' || profile?.role === 'admin') && (
                <ActionTile icon={Users} title="Manage team" desc="Add interns, assign tasks, review progress." onClick={() => navigate('/team')} />
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

// ---- Local subcomponent ----------------------------------------------------
function ActionTile({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-zinc-900 border border-zinc-800 hover:border-emerald-500/30 rounded-xl p-5 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition" />
      </div>
      <p className="font-semibold text-zinc-100">{title}</p>
      <p className="text-sm text-zinc-500 mt-1">{desc}</p>
    </button>
  )
}