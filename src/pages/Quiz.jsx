// =============================================================================
// QUIZ RUNNER  (full-screen focus mode)
// -----------------------------------------------------------------------------
// Route: /quiz/:phase
//
// FLOW:
//   loading    → fetch 15 random questions via the get_quiz_questions RPC
//   active     → one question at a time: Canvas question + 4 option buttons +
//                45s timer. Selecting an option (or the timer expiring)
//                records the answer and advances.
//   submitting → all 15 answered → grade_quiz_attempt RPC grades server-side
//   done       → result screen (score, pass/fail, per-question review)
//   error      → friendly message + a way back
//
// SECURITY:
//   The correct answers never reach this component. get_quiz_questions returns
//   questions WITHOUT correct_option_index; grade_quiz_attempt does the marking
//   on the server and returns only per-question true/false plus the score.
//
// ANTI-CHEAT:
//   - Questions are drawn to a <canvas> (see CanvasQuestion) so they can't be
//     selected or copied.
//   - Tab switches are counted via the visibilitychange event and sent to the
//     server with the attempt as cheat_signals.
//   - Text selection and right-click are disabled on the quiz surface.
// =============================================================================
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2, ShieldAlert, CheckCircle2, XCircle, Home, RotateCcw, ShieldCheck,
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

  const [status, setStatus] = useState('loading') // loading | active | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [questions, setQuestions] = useState([])
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})      // questionId -> selected option index (-1 = timed out)
  const [result, setResult] = useState(null)

  const tabSwitchesRef = useRef(0)
  const startTimeRef = useRef(null)
  // Guards against a double-advance if a click and the timer fire together.
  const advancingRef = useRef(false)
  // Ensures we only load a quiz ONCE per phase. Without this, refreshProfile()
  // after a pass would change `profile`, re-fire the load effect, and wipe the
  // result screen with a fresh quiz.
  const didLoadRef = useRef(false)

  // Reset the advance guard whenever we move to a new question.
  useEffect(() => { advancingRef.current = false }, [index])

  // Reset the load guard when the phase changes (e.g. navigating quiz → quiz).
  useEffect(() => { didLoadRef.current = false }, [phase])

  // ---- anti-cheat: count tab/window switches -------------------------------
  useEffect(() => {
    const onVis = () => { if (document.hidden) tabSwitchesRef.current += 1 }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // ---- load questions ------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // Already loaded this phase — don't reload (e.g. when profile updates).
      if (didLoadRef.current) return

      setStatus('loading')
      setErrorMsg('')

      if (!VALID_PHASES.includes(phase)) {
        setErrorMsg('Unknown quiz phase.')
        setStatus('error')
        return
      }

      // Client-side early check for a nicer message. The real enforcement is
      // server-side in the get_quiz_questions RPC, which raises if locked.
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

  const current = questions[index]

  // ---- submit -------------------------------------------------------------
  const submitQuiz = async (finalAnswers) => {
    setStatus('submitting')
    const totalTime = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null

    const { data, error } = await supabase.rpc('grade_quiz_attempt', {
      p_phase: phase,
      p_answers: finalAnswers,
      p_cheat_signals: { tab_switches: tabSwitchesRef.current },
      p_total_time_seconds: totalTime,
    })

    if (error) {
      setErrorMsg(error.message || 'Could not submit the quiz.')
      setStatus('error')
      return
    }

    setResult(data)
    setStatus('done')

    // If they passed, a new phase may be unlocked — refresh the profile so the
    // sidebar / dashboard / quiz picker all reflect it immediately.
    if (data?.passed) refreshProfile?.()
  }

  // ---- record an answer and advance (shared by click + timeout) -----------
  const advance = (selectedIndex) => {
    if (status !== 'active' || advancingRef.current || !current) return
    advancingRef.current = true

    const updated = { ...answers, [current.id]: selectedIndex }
    setAnswers(updated)

    if (index + 1 < questions.length) {
      setIndex((i) => i + 1)
    } else {
      submitQuiz(updated)
    }
  }

  const handleSelect = (optionIndex) => advance(optionIndex)
  const handleExpire = () => advance(-1) // -1 = no answer given in time

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

  // ---- done (result screen) ----
  if (status === 'done' && result) {
    const passed = result.passed
    return (
      <FullScreen>
        <div className="max-w-2xl w-full">
          {/* Score header */}
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

          {/* Per-question review */}
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

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold py-2.5 rounded-lg transition"
            >
              <Home className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => navigate(0)} // reload the route → fresh random 15
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold py-2.5 rounded-lg transition"
            >
              <RotateCcw className="w-4 h-4" /> Retake quiz
            </button>
          </div>
        </div>
      </FullScreen>
    )
  }

  // ---- active (the actual quiz) ----
  if (status === 'active' && current) {
    // current.options is a JSONB array: [{ id, text }, ...]
    return (
      <FullScreen>
        <div
          className="max-w-2xl w-full"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {/* Progress + anti-cheat badge */}
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
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>

          {/* Timer — keyed to the question id so it resets each question */}
          <div className="mb-5">
            <QuizTimer
              seconds={current.time_limit_seconds || 45}
              questionKey={current.id}
              onExpire={handleExpire}
            />
          </div>

          {/* The question, drawn to a canvas */}
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

  // Fallback (should not normally hit this).
  return (
    <FullScreen>
      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
    </FullScreen>
  )
}

// ---- Local layout wrapper: centered full-screen, no sidebar (focus mode) ----
function FullScreen({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
      {children}
    </div>
  )
}