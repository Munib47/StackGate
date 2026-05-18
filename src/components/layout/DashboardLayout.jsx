// =============================================================================
// DASHBOARD LAYOUT
// -----------------------------------------------------------------------------
// The shared app shell: fixed sidebar on md+, drawer on mobile, top navbar
// with logout. Extracted from Dashboard.jsx so every internal page (Dashboard,
// Quizzes, and later Tasks/Team/Settings) renders inside the same nav instead
// of each page re-implementing it.
//
// PROPS:
//   title    :: string — shown in the top navbar
//   children :: node   — the page content
//
// The active sidebar item is now derived from the real URL via useLocation,
// which fixes the old hardcoded "Dashboard is always active" placeholder.
// =============================================================================
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, GraduationCap, Users, Settings,
  LogOut, Menu, X, Shield,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ROLE_LABELS } from '../../utils/constants'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['owner', 'admin', 'internee'] },
  { label: 'Tasks',     icon: ListChecks,      path: '/tasks',     roles: ['owner', 'admin', 'internee'] },
  { label: 'Quizzes',   icon: GraduationCap,   path: '/quizzes',   roles: ['owner', 'admin', 'internee'] },
  { label: 'Team',      icon: Users,           path: '/team',      roles: ['owner', 'admin'] },
  { label: 'Settings',  icon: Settings,        path: '/settings',  roles: ['owner'] },
]

export default function DashboardLayout({ title, children }) {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(profile?.role))

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
            // Active if the current path matches or is nested under the item.
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/')
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
            <p className="text-sm font-medium text-zinc-100 truncate">
              {profile?.full_name || user?.email}
            </p>
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
            <h1 className="text-lg font-semibold">{title}</h1>
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
          {children}
        </main>
      </div>
    </div>
  )
}