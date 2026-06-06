// =============================================================================
// useQuizSession — quiz state machine
// -----------------------------------------------------------------------------
// Owns all quiz logic: question loading, answer recording, tab-switch
// enforcement, and server-side grading. Quiz.jsx is left as pure render code.
//
// PARAMS:
//   phase           :: string   — route param, e.g. 'html'
//   profile         :: object   — from AuthContext (role, unlocked_phases, etc.)
//   onProfileRefresh:: fn       — called after a passing attempt to sync context
//
// RETURNS:
//   status          :: 'loading' | 'active' | 'warning' | 'submitting' |
//                      'done' | 'auto' | 'error'
//   errorMsg        :: string
//   questions       :: array
//   index           :: number   — 0-based index of the current question
//   result          :: object | null — from grade_quiz_attempt RPC
//   tabSwitchesRef  :: MutableRefObject<number> — read .current in render
//   handleSelect    :: (optionIndex: number) => void
//   handleExpire    :: () => void
//   resumeFromWarning :: () => void
//
// STALE-CLOSURE SAFETY:
//   The visibilitychange handler is registered once per `questions` change and
//   reads state via refs (statusRef, answersRef) that are synced on every
//   render. submitQuiz is also mirrored into submitQuizRef so the handler
//   always calls the latest version without needing to be re-registered.
// =============================================================================
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PHASES, PHASE_LABELS } from '../utils/constants'

const VALID_PHASES = Object.values(PHASES)

export function useQuizSession(phase, profile, onProfileRefresh) {
  const [status, setStatus]       = useState('loading')
  const [errorMsg, setErrorMsg]   = useState('')
  const [questions, setQuestions] = useState([])
  const [index, setIndex]         = useState(0)
  const [answers, setAnswers]     = useState({})
  const [result, setResult]       = useState(null)

  // Persistent refs that survive re-renders without triggering them.
  const tabSwitchesRef = useRef(0)
  const startTimeRef   = useRef(null)
  const advancingRef   = useRef(false)   // guard: prevents double-advance
  const didLoadRef     = useRef(false)   // guard: prevents double-load

  // Snapshot refs — updated every render so event handlers always have
  // the latest values without being re-registered.
  const statusRef      = useRef(status)
  const answersRef     = useRef(answers)
  // submitQuizRef lets the visibilitychange handler always call the latest
  // version of submitQuiz (which closes over `phase`) without rebinding.
  const submitQuizRef  = useRef(null)

  // Sync snapshot refs after every render (intentionally no dep array).
  useEffect(() => {
    statusRef.current  = status
    answersRef.current = answers
  })

  // Reset guards when phase or index changes.
  useEffect(() => { advancingRef.current = false }, [index])
  useEffect(() => { didLoadRef.current   = false }, [phase])

  // ---- question loading -----------------------------------------------------
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
          setErrorMsg(
            `The ${PHASE_LABELS[phase]} phase is locked. Pass the previous phase to unlock it.`
          )
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

      didLoadRef.current      = true
      tabSwitchesRef.current  = 0
      startTimeRef.current    = Date.now()
      setQuestions(data)
      setIndex(0)
      setAnswers({})
      setStatus('active')
    }

    load()
    return () => { cancelled = true }
  }, [phase, profile])

  // ---- submission -----------------------------------------------------------
  const submitQuiz = async (finalAnswers, autoSubmitted = false, reason = null) => {
    setStatus('submitting')

    const totalTime = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : null

    const { data, error } = await supabase.rpc('grade_quiz_attempt', {
      p_phase:              phase,
      p_answers:            finalAnswers,
      p_cheat_signals:      { tab_switches: tabSwitchesRef.current },
      p_total_time_seconds: totalTime,
      p_auto_submitted:     autoSubmitted,
      p_auto_submit_reason: reason,
    })

    if (error) {
      setErrorMsg(error.message || 'Could not submit the quiz.')
      setStatus('error')
      return
    }

    setResult(data)
    setStatus(autoSubmitted ? 'auto' : 'done')
    if (data?.passed) onProfileRefresh?.()
  }

  // Keep the ref current every render so the visibility handler always calls
  // the latest closure (which captures the current `phase`).
  submitQuizRef.current = submitQuiz

  // ---- answer recording & advance ------------------------------------------
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
  const handleExpire = ()            => advance(-1)

  // ---- tab-switch enforcement -----------------------------------------------
  useEffect(() => {
    // Fill unanswered questions with -1 (skipped) for partial auto-submission.
    const buildFinalAnswers = () => {
      const complete = { ...answersRef.current }
      for (const q of questions) {
        if (!(q.id in complete)) complete[q.id] = -1
      }
      return complete
    }

    const onVis = () => {
      if (!document.hidden) return
      const s = statusRef.current
      if (s !== 'active' && s !== 'warning') return

      tabSwitchesRef.current += 1

      if (tabSwitchesRef.current === 1) {
        setStatus('warning')
      } else {
        // Second strike: auto-submit via ref so we always call the latest
        // submitQuiz closure without re-registering this handler.
        submitQuizRef.current(buildFinalAnswers(), true, 'tab_switch_x2')
      }
    }

    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // Only `questions` is needed — all other reads go through refs.
  }, [questions])

  // ---- public surface -------------------------------------------------------
  return {
    status,
    errorMsg,
    questions,
    index,
    result,
    tabSwitchesRef,
    handleSelect,
    handleExpire,
    resumeFromWarning: () => setStatus('active'),
  }
}
