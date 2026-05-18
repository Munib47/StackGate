// =============================================================================
// DASHBOARD PAGE
// -----------------------------------------------------------------------------
// Landing page after login. The sidebar/navbar shell now lives in
// DashboardLayout — this file is just the page CONTENT.
// =============================================================================
import { useNavigate } from 'react-router-dom'
import {
  ListChecks, GraduationCap, Users, ChevronRight,
  Code2, Palette, Zap, Layers,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PHASE_LABELS, ROLE_LABELS, PHASES } from '../utils/constants'
import DashboardLayout from '../components/layout/DashboardLayout'

// Phase icon mapping — single source so it stays consistent across the app.
const PHASE_ICONS = {
  html: Code2,
  css: Palette,
  js: Zap,
  liquid: Layers,
}

export default function Dashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  return (
    <DashboardLayout title="Dashboard">
      {/* Welcome card */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-6">
        <p className="text-sm text-emerald-400 font-medium mb-1">Welcome back</p>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          {profile?.full_name || 'Developer'}
        </h2>
        <p className="text-zinc-400 mt-2 text-sm md:text-base">
          You're signed in as <span className="text-zinc-200 font-medium">{ROLE_LABELS[profile?.role]}</span>.
          {profile?.role === 'internee' && profile?.current_phase && (
            <> Currently progressing through{' '}
              <span className="text-emerald-400 font-medium">{PHASE_LABELS[profile.current_phase]}</span>.
            </>
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
          <ActionTile
            icon={ListChecks}
            title="My Tasks"
            desc="View and submit task documentation."
            onClick={() => navigate('/tasks')}
          />
          <ActionTile
            icon={GraduationCap}
            title="Take a quiz"
            desc="Unlock the next phase of the path."
            onClick={() => navigate('/quizzes')}
          />
          {(profile?.role === 'owner' || profile?.role === 'admin') && (
            <ActionTile
              icon={Users}
              title="Manage team"
              desc="Add interns, assign tasks, review progress."
              onClick={() => navigate('/team')}
            />
          )}
        </div>
      </section>
    </DashboardLayout>
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