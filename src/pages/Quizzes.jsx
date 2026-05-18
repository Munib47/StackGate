// =============================================================================
// QUIZZES PAGE  (phase picker)
// -----------------------------------------------------------------------------
// Lists the four learning phases. For an internee, only phases in their
// profile.unlocked_phases are startable; the rest show as locked. Owners and
// admins can start any phase (useful for reviewing the question bank).
//
// Best score / passed status per phase is pulled from intern_progress. That
// fetch is best-effort — if it fails, the page still renders, just without
// the stats.
// =============================================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Code2, Palette, Zap, Layers, Lock, Play, CheckCircle2, Loader2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { PHASES, PHASE_LABELS, ROLES } from '../utils/constants'
import DashboardLayout from '../components/layout/DashboardLayout'

const PHASE_ICONS = { html: Code2, css: Palette, js: Zap, liquid: Layers }

const PHASE_ORDER = [PHASES.HTML, PHASES.CSS, PHASES.JS, PHASES.LIQUID]

export default function Quizzes() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()

  const [progress, setProgress] = useState({})   // phase -> { best_score, passed, quiz_attempts }
  const [loadingProgress, setLoadingProgress] = useState(true)

  // ---- fetch this intern's progress rows (best-effort) ----------------------
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!user) return
      setLoadingProgress(true)
      const { data, error } = await supabase
        .from('intern_progress')
        .select('phase, best_score, passed, quiz_attempts')
        .eq('intern_id', user.id)

      if (cancelled) return
      if (error) {
        console.error('[Quizzes] progress fetch error:', error.message)
        setProgress({})
      } else {
        const map = {}
        for (const row of data || []) map[row.phase] = row
        setProgress(map)
      }
      setLoadingProgress(false)
    }
    load()
    return () => { cancelled = true }
  }, [user])

  const isInternee = profile?.role === ROLES.INTERNEE
  const unlocked = profile?.unlocked_phases || []

  const canStart = (phase) => !isInternee || unlocked.includes(phase)

  return (
    <DashboardLayout title="Quizzes">
      {/* Intro */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Phase quizzes</h2>
        <p className="text-zinc-400 mt-1 text-sm">
          Each quiz draws 15 random questions. Score 80% or higher to pass and unlock the next phase.
          Every question is timed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHASE_ORDER.map((phase) => {
          const Icon = PHASE_ICONS[phase]
          const startable = canStart(phase)
          const stats = progress[phase]
          const passed = stats?.passed

          return (
            <div
              key={phase}
              className={`
                rounded-2xl border p-6 transition
                ${startable
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-zinc-900/30 border-zinc-800/50'}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`
                    w-11 h-11 rounded-xl flex items-center justify-center border
                    ${startable
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-zinc-800/50 border-zinc-800'}
                  `}>
                    <Icon className={`w-5 h-5 ${startable ? 'text-emerald-400' : 'text-zinc-600'}`} />
                  </div>
                  <div>
                    <p className={`font-semibold ${startable ? 'text-zinc-100' : 'text-zinc-500'}`}>
                      {PHASE_LABELS[phase]}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {!startable
                        ? 'Locked — pass the previous phase'
                        : loadingProgress
                          ? 'Loading…'
                          : stats
                            ? `${stats.quiz_attempts} attempt${stats.quiz_attempts === 1 ? '' : 's'} · best ${stats.best_score}%`
                            : 'Not attempted yet'}
                    </p>
                  </div>
                </div>

                {passed && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                  </span>
                )}
              </div>

              <div className="mt-5">
                {startable ? (
                  <button
                    onClick={() => navigate(`/quiz/${phase}`)}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-lg transition"
                  >
                    <Play className="w-4 h-4" />
                    {passed ? 'Retake quiz' : 'Start quiz'}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800/50 text-zinc-600 font-semibold py-2.5 rounded-lg cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" /> Locked
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </DashboardLayout>
  )
}