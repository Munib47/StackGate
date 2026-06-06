// =============================================================================
// DASHBOARD PAGE
// -----------------------------------------------------------------------------
// Landing page after login. The sidebar/navbar shell now lives in
// DashboardLayout — this file is just the page CONTENT.
// =============================================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListChecks, GraduationCap, Users, ChevronRight, ChevronDown,
  Code2, Palette, Zap, Layers, BookOpen, Clock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PHASE_LABELS, ROLE_LABELS, PHASES, PHASE_ROADMAP } from '../utils/constants'
import DashboardLayout from '../components/layout/DashboardLayout'

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

      {/* Deadline tracker + Learning roadmap — internees with an active phase */}
      {profile?.role === 'internee' && profile?.current_phase && (
        <section className="mb-6 space-y-4">
          <DeadlineCard
            phase={profile.current_phase}
            phaseDeadlines={profile.phase_deadlines}
          />
          <RoadmapPanel phase={profile.current_phase} />
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

// ---- Local subcomponents ----------------------------------------------------

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

// Renders only when a deadline entry exists for the current phase.
// Reads phase_deadlines[phase].{ start_date?, deadline } from the JSONB column.
function DeadlineCard({ phase, phaseDeadlines }) {
  const entry = phaseDeadlines?.[phase]
  if (!entry?.deadline) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(entry.deadline)
  const start = entry.start_date ? new Date(entry.start_date) : null

  const daysRemaining = Math.ceil((deadline - today) / 86400000)
  const isOverdue = daysRemaining < 0

  let progress = null
  if (start) {
    const totalDays = Math.ceil((deadline - start) / 86400000)
    const elapsed = Math.ceil((today - start) / 86400000)
    progress = totalDays > 0 ? Math.min(100, Math.max(0, (elapsed / totalDays) * 100)) : 100
  }

  const urgency = isOverdue || daysRemaining <= 3 ? 'red' : daysRemaining <= 7 ? 'amber' : 'emerald'
  const barColor   = { red: 'bg-red-500',   amber: 'bg-amber-400',   emerald: 'bg-emerald-500'   }[urgency]
  const textColor  = { red: 'text-red-400', amber: 'text-amber-400', emerald: 'text-emerald-400' }[urgency]
  const borderColor = { red: 'border-red-500/20', amber: 'border-amber-500/20', emerald: 'border-zinc-800' }[urgency]
  const bgColor    = { red: 'bg-red-500/5',  amber: 'bg-amber-500/5',  emerald: 'bg-zinc-900'      }[urgency]

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-zinc-500" />
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
          {PHASE_LABELS[phase]} Deadline
        </p>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <p className={`text-3xl font-bold tracking-tight ${textColor}`}>
            {isOverdue ? 'Overdue' : daysRemaining}
            {!isOverdue && (
              <span className="text-sm font-normal text-zinc-500 ml-2">
                {daysRemaining === 1 ? 'day' : 'days'} remaining
              </span>
            )}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Due {deadline.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        {isOverdue && (
          <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg font-medium">
            Past due
          </span>
        )}
      </div>

      {progress !== null && (
        <div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1.5">
            {Math.round(progress)}% of time elapsed
            {start && (
              <span>
                {' '}· started {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// Collapsible checklist of topics for the current phase.
// Topic data comes from PHASE_ROADMAP constant — no DB fetch needed.
function RoadmapPanel({ phase }) {
  const [open, setOpen] = useState(false)
  const topics = PHASE_ROADMAP?.[phase] ?? []

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/50 transition"
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-zinc-100 text-sm">
            {PHASE_LABELS[phase]} Learning Roadmap
          </span>
          <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
            {topics.length} topics
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-5 py-4">
          <ul className="space-y-3">
            {topics.map((topic, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-medium text-zinc-500">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{topic.title}</p>
                  {topic.desc && (
                    <p className="text-xs text-zinc-500 mt-0.5">{topic.desc}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-600 mt-4 pt-3 border-t border-zinc-800">
            Master these topics before taking the {PHASE_LABELS[phase]} quiz.
          </p>
        </div>
      )}
    </div>
  )
}
