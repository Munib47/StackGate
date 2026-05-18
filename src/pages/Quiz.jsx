// =============================================================================
// QUIZ RUNNER  (full-screen focus mode)
// -----------------------------------------------------------------------------
// Route: /quiz/:phase
//
// FLOW:
//   loading    → fetch 15 random questions via the get_quiz_questions RPC
//   active     → one question at a time: Canvas question + 4 option buttons +
//                45s timer. Selecting an option (or timer expiring) records
//                the answer and advances.
//   submitting → all 15 answered → grade_quiz_attempt RPC grades server-side
//   done       → result screen (score, pass/fail, per-question review)
//   auto       → terminated by tab-switch enforcement (Path B). Shows a clear
//                message and the partial score. Always fails.
//   error      → friendly message + a way back
//
// TAB-SWITCH ENFORCEMENT (Path B — warning, then strike):
//   1st tab switch → quiz pauses (kind of — UI shows a full-screen warning).
//                    Continue button re-enters the quiz.
//   2nd tab switch → quiz auto-submits with current answers, marked as
//                    auto_submitted on the server. Always fails regardless
//                    of partial score. Admin/owner sees this in /notifications.
//
//   The "tab switch" is really document.visibilitychange — covers both
//   clicking another browser tab AND Alt+Tab to another app.
//
// SECURITY:
//   The correct answers never reach this component. get_quiz_questions returns
//   questions WITHOUT correct_option_index; grade_quiz_attempt does the marking
//   on the server.
// =============================================================================
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, ShieldAlert, CheckCircle2, XCircle, Home, RotateCcw,
  ShieldCheck, AlertTriangle, Ban,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { PHASES, PHASE_LABELS } from '../utils/constants'
import CanvasQuestion from '../components/quiz/CanvasQuestion'
import QuizTimer from '../components/quiz/QuizTimer'

const VALID_PHASES = Object.values(PHASES)

export default function Quiz() {
  const { phase } = useParams()
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()

  const [status, setStatus] = useState('loading')
  // status: loading | active | warning | submitting | done | auto | error
  const [errorMsg, setErrorMsg] = useState('')
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  // Refs (not state) so they don't trigger re-renders.
  const tabSwitchesRef = useRef(0)
  const startTimeRef = useRef(null)
  const advancingRef = useRef(false)
  const didLoadRef = useRef(false)

  // Latest values used by event handlers — refs so the visibility listener
  // (registered ONCE at mount) always reads the freshest data without needing
  // to re-bind. Updated on every render via the syncing useEffect below.
  const statusRef = useRef(status)
  const answersRef = useRef(answers)
  const currentRef = useRef(null)
  useEffect(() => {
    statusRef.current = status
    answersRef.current = answers
    currentRef.current = questions[index]
  })

  // Reset guards when phase / question changes.
  useEffect(() => { advancingRef.current = false }, [index])
  useEffect(() => { didLoadRef.current = false }, [phase])

  // ---- load questions ------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (didLoadRef.current) return

      setStatus('loading')
      setErrorMsg('')

      if (!VALID_PHASES.includes(phase)) {
        setErrorMsg('Unknown quiz phase.')
        setStatus('error')
        return
      }
      if (profile?.role === 'internee') {
        const unlocked = profile?.unlocked_phases || []
        if (!unlocked.includes(phase)) {
          setErrorMsg(`The ${PHASE_LABELS[phase]} phase is locked. Pass the previous phase to unlock it.`)
          setStatus('error')
          return
        }
      }

      const { data, error } = await supabase.rpc('get_quiz_questions', { p_phase: phase })
      if (cancelled) return

      if (error) {
        setErrorMsg(error.message || 'Could not load questions.')
        setStatus('error')
        return
      }
      if (!data || data.length === 0) {
        setErrorMsg('No questions are available for this phase yet.')
        setStatus('error')
        return
      }

      didLoadRef.current = true
      setQuestions(data)
      setIndex(0)
      setAnswers({})
      tabSwitchesRef.current = 0
      startTimeRef.current = Date.now()
      setStatus('active')
    }

    load()
    return () => { cancelled = true }
  }, [phase, profile])

  // ---- submit (shared by normal end + auto-submit) ------------------------
  const submitQuiz = async (finalAnswers, autoSubmitted = false, reason = null) => {
    setStatus(autoSubmitted ? 'submitting' : 'submitting')
    const totalTime = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null

    const { data, error } = await supabase.rpc('grade_quiz_attempt', {
      p_phase: phase,
      p_answers: finalAnswers,
      p_cheat_signals: { tab_switches: tabSwitchesRef.current },
      p_total_time_seconds: totalTime,
      p_auto_submitted: autoSubmitted,
      p_auto_submit_reason: reason,
    })

    if (error) {
      setErrorMsg(error.message || 'Could not submit the quiz.')
      setStatus('error')
      return
    }

    setResult(data)
    setStatus(autoSubmitted ? 'auto' : 'done')
    if (data?.passed) refreshProfile?.()
  }

  // ---- record an answer and advance --------------------------------------
  const advance = (selectedIndex) => {
    if (status !== 'active' || advancingRef.current) return
    const current = questions[index]
    if (!current) return
    advancingRef.current = true

    const updated = { ...answers, [current.id]: selectedIndex }
    setAnswers(updated)

    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
    } else {
      submitQuiz(updated, false, null)
    }
  }

  const handleSelect = (optionIndex) => advance(optionIndex)
  const handleExpire = () => advance(-1)

  // ---- TAB-SWITCH ENFORCEMENT (the new piece) -----------------------------
  useEffect(() => {
    // Build a "complete answers" object for a partial submission. For
    // questions the intern hadn't answered yet, we record -1 (skipped).
    const buildFinalAnswers = () => {
      const complete = { ...answersRef.current }
      for (const q of questions) {
        if (!(q.id in complete)) complete[q.id] = -1
      }
      return complete
    }

    const onVis = () => {
      if (!document.hidden) return
      // Only react during an active quiz or on the first warning screen.
      const s = statusRef.current
      if (s !== 'active' && s !== 'warning') return

      tabSwitchesRef.current += 1

      if (tabSwitchesRef.current === 1) {
        // First strike — show warning.
        setStatus('warning')
      } else {
        // Second strike — auto-submit. Use the latest answers from the ref.
        submitQuiz(buildFinalAnswers(), true, 'tab_switch_x2')
      }
    }

    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // We intentionally only depend on `questions` (used by buildFinalAnswers).
    // All other reads use refs so the handler stays stable.
  }, [questions])

  // =========================================================================
  // RENDER
  // =========================================================================

  // ---- loading ----
  if (status === 'loading') {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Loading {PHASE_LABELS[phase] || ''} questions…</p>
        </div>
      </FullScreen>
    )
  }

  // ---- error ----
  if (status === 'error') {
    return (
      <FullScreen>
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Can't start this quiz</h2>
          <p className="text-sm text-zinc-400 mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/quizzes')}
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-2.5 rounded-lg transition"
          >
            Back to quizzes
          </button>
        </div>
      </FullScreen>
    )
  }

  // ---- submitting ----
  if (status === 'submitting') {
    return (
      <FullScreen>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Grading your answers…</p>
        </div>
      </FullScreen>
    )
  }

  // ---- WARNING screen (after first tab switch) ----
  if (status === 'warning') {
    return (
      <FullScreen>
        <div className="max-w-md w-full bg-amber-500/5 border border-amber-500/30 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Tab switch detected</h2>
          <p className="text-sm text-zinc-400 mb-1">
            Leaving the quiz window is treated as suspicious activity.
          </p>
          <p className="text-sm text-amber-300 font-medium mb-6">
            This is your only warning. The next tab switch will end the quiz immediately.
          </p>
          <button
            onClick={() => setStatus('active')}
            className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-5 py-2.5 rounded-lg transition"
          >
            I understand — resume quiz
          </button>
        </div>
      </FullScreen>
    )
  }

  // ---- AUTO-SUBMITTED screen (after second tab switch) ----
  if (status === 'auto' && result) {
    return (
      <FullScreen>
        <div className="max-w-md w-full">
          <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-8 text-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Ban className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-sm text-red-400 font-medium mb-1">Quiz terminated</p>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Auto-submitted
            </h2>
            <p className="text-sm text-zinc-400 mb-2">
              You switched away from the quiz window after a warning. The attempt has been
              submitted and recorded.
            </p>
            <p className="text-xs text-zinc-500 mt-4">
              Score: <span className="text-zinc-300 font-medium">{result.score}%</span> ·
              Result: <span className="text-red-400 font-medium">Did not pass</span>
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold py-2.5 rounded-lg transition"
          >
            <Home className="w-4 h-4" /> Back to dashboard
          </button>
        </div>
      </FullScreen>
    )
  }

  // ---- DONE (normal completion) ----
  if (status === 'done' && result) {
    const passed = result.passed
    return (
      <FullScreen>
        <div className="max-w-2xl w-full">
          <div className={`
            rounded-2xl border p-8 text-center mb-4
            ${passed
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-red-500/5 border-red-500/30'}
          `}>
            <div className={`
              w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4
              ${passed ? 'bg-emerald-500/10' : 'bg-red-500/10'}
            `}>
              {passed
                ? <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                : <XCircle className="w-7 h-7 text-red-400" />}
            </div>
            <p className={`text-sm font-medium mb-1 ${passed ? 'text-emerald-400' : 'text-red-400'}`}>
              {passed ? 'Phase passed' : 'Not passed yet'}
            </p>
            <h2 className="text-4xl font-bold tracking-tight text-zinc-100">
              {result.score}%
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              {result.correct} of {result.total} correct · {result.threshold}% needed to pass
            </p>
            {passed && result.next_phase_unlocked && (
              <p className="text-emerald-300 text-sm mt-3">
                🎉 You've unlocked the {PHASE_LABELS[result.next_phase_unlocked]} phase.
              </p>
            )}
            {!passed && (
              <p className="text-zinc-500 text-sm mt-3">
                Review the questions below, then retake the quiz when you're ready.
              </p>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Question review
            </h3>
            <ul className="space-y-2">
              {questions.map((q, i) => {
                const correct = result.results?.[q.id] === true
                return (
                  <li key={q.id} className="flex items-start gap-3 text-sm">
                    {correct
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                    <span className="text-zinc-300">
                      <span className="text-zinc-500">Q{i + 1}.</span> {q.question_text}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold py-2.5 rounded-lg transition"
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => navigate(0)}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" /> Retake quiz
            </button>
          </div>
        </div>
      </FullScreen>
    )
  }

  // ---- ACTIVE (the actual quiz) ----
  const current = questions[index]
  if (status === 'active' && current) {
    return (
      <FullScreen>
        <div
          className="max-w-2xl w-full"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {/* Progress + proctor pill */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-zinc-400">
              Question <span className="text-zinc-100 font-semibold">{index + 1}</span> of {questions.length}
            </p>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {PHASE_LABELS[phase]} · proctored
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>

          {/* Soft anti-cheat reminder — only shown if no strikes yet */}
          {tabSwitchesRef.current === 0 && (
            <div className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              Do not switch tabs or windows. One warning, then auto-submit.
            </div>
          )}

          {/* Timer */}
          <div className="mb-5">
            <QuizTimer
              seconds={current.time_limit_seconds || 45}
              questionKey={current.id}
              onExpire={handleExpire}
            />
          </div>

          {/* Canvas question */}
          <CanvasQuestion question={current.question_text} code={current.code_snippet} />

          {/* Options */}
          <div className="grid grid-cols-1 gap-2.5 mt-5">
            {current.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                className="text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 rounded-xl px-4 py-3 text-sm text-zinc-200 transition"
              >
                {opt.text}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-600 mt-4 text-center">
            Selecting an answer moves you to the next question. You can't go back.
          </p>
        </div>
      </FullScreen>
    )
  }

  // ---- fallback ----
  return (
    <FullScreen>
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </FullScreen>
  )
}

// ---- Centered full-screen wrapper (no sidebar) -----------------------------
function FullScreen({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      {children}
    </div>
  )
}