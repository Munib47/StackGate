// =============================================================================
// useQuizSession — unit tests
// =============================================================================
// Setup: this project uses Vite, so Vitest is the natural test runner.
//
//   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom
//
// Add to package.json scripts:
//   "test": "vitest"
//
// Add to vite.config.js (or vitest.config.js):
//   test: { environment: 'jsdom', globals: true }
// =============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useQuizSession } from './useQuizSession'

// ---------------------------------------------------------------------------
// Supabase mock — controls what the RPC calls return per test
// ---------------------------------------------------------------------------
const mockRpc = vi.fn()
vi.mock('../lib/supabaseClient', () => ({
  supabase: { rpc: mockRpc },
}))

const MOCK_QUESTIONS = [
  { id: 'q1', question_text: 'What is HTML?', code_snippet: null, options: [{ id: 0, text: 'A' }, { id: 1, text: 'B' }, { id: 2, text: 'C' }, { id: 3, text: 'D' }], time_limit_seconds: 45 },
  { id: 'q2', question_text: 'What is CSS?',  code_snippet: null, options: [{ id: 0, text: 'A' }, { id: 1, text: 'B' }, { id: 2, text: 'C' }, { id: 3, text: 'D' }], time_limit_seconds: 45 },
]

const MOCK_RESULT = { passed: true, score: 100, correct: 2, total: 2, threshold: 80, results: { q1: true, q2: true } }

const UNLOCKED_PROFILE = {
  role: 'internee',
  unlocked_phases: ['html', 'css', 'js', 'liquid'],
}

const OWNER_PROFILE = { role: 'owner' }

beforeEach(() => {
  vi.clearAllMocks()
  // Default: questions load fine, grading returns a pass.
  mockRpc.mockImplementation((rpcName) => {
    if (rpcName === 'get_quiz_questions') return Promise.resolve({ data: MOCK_QUESTIONS, error: null })
    if (rpcName === 'grade_quiz_attempt') return Promise.resolve({ data: MOCK_RESULT, error: null })
    return Promise.resolve({ data: null, error: null })
  })
})

afterEach(() => {
  // Clean up any dangling visibility listeners.
  document.dispatchEvent(new Event('visibilitychange'))
})

// ---------------------------------------------------------------------------
// 1. Initial load
// ---------------------------------------------------------------------------
describe('question loading', () => {
  it('transitions loading → active after questions fetch', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('active'))
    expect(result.current.questions).toHaveLength(2)
    expect(result.current.index).toBe(0)
  })

  it('transitions loading → error for an unknown phase', async () => {
    const { result } = renderHook(() =>
      useQuizSession('unknown', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.errorMsg).toMatch(/unknown quiz phase/i)
  })

  it('transitions loading → error for a locked phase', async () => {
    const lockedProfile = { role: 'internee', unlocked_phases: ['html'] }
    const { result } = renderHook(() =>
      useQuizSession('css', lockedProfile, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.errorMsg).toMatch(/locked/i)
  })

  it('owners bypass the phase-lock check', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', OWNER_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))
  })

  it('sets error when RPC returns no questions', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.errorMsg).toMatch(/no questions/i)
  })
})

// ---------------------------------------------------------------------------
// 2. Answer recording and normal completion
// ---------------------------------------------------------------------------
describe('answer recording', () => {
  it('advances index when an option is selected', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.index).toBe(1))
  })

  it('calls grade_quiz_attempt with all answers after the last question', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    act(() => result.current.handleSelect(1))  // answer q1
    await waitFor(() => expect(result.current.index).toBe(1))

    act(() => result.current.handleSelect(2))  // answer q2 — should trigger submit
    await waitFor(() => expect(result.current.status).toBe('done'))

    expect(mockRpc).toHaveBeenCalledWith('grade_quiz_attempt', expect.objectContaining({
      p_phase: 'html',
      p_auto_submitted: false,
    }))
  })

  it('calls onProfileRefresh when the quiz is passed', async () => {
    const refresh = vi.fn()
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, refresh)
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.index).toBe(1))
    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.status).toBe('done'))

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onProfileRefresh when the quiz is failed', async () => {
    mockRpc.mockImplementation((rpcName) => {
      if (rpcName === 'get_quiz_questions') return Promise.resolve({ data: MOCK_QUESTIONS, error: null })
      if (rpcName === 'grade_quiz_attempt') return Promise.resolve({
        data: { passed: false, score: 50, correct: 1, total: 2, threshold: 80, results: { q1: true, q2: false } },
        error: null,
      })
    })
    const refresh = vi.fn()
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, refresh)
    )
    await waitFor(() => expect(result.current.status).toBe('active'))
    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.index).toBe(1))
    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.status).toBe('done'))

    expect(refresh).not.toHaveBeenCalled()
  })

  it('records a -1 answer (skipped) when the timer expires', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    act(() => result.current.handleExpire())
    await waitFor(() => expect(result.current.index).toBe(1))

    act(() => result.current.handleExpire())
    await waitFor(() => expect(result.current.status).toBe('done'))

    const call = mockRpc.mock.calls.find(([name]) => name === 'grade_quiz_attempt')
    const answers = call[1].p_answers
    expect(Object.values(answers)).toEqual([-1, -1])
  })

  it('double-advance guard prevents two answers for one question', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    // Fire twice synchronously — only the first should count.
    act(() => {
      result.current.handleSelect(0)
      result.current.handleSelect(1)
    })
    await waitFor(() => expect(result.current.index).toBe(1))

    // Now answer the last question to get the grade call.
    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.status).toBe('done'))

    const call = mockRpc.mock.calls.find(([name]) => name === 'grade_quiz_attempt')
    // q1 should have answer 0 (first click), not 1 (second click).
    expect(call[1].p_answers['q1']).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 3. Tab-switch enforcement — the critical stale-ref tests
// ---------------------------------------------------------------------------
describe('tab-switch enforcement', () => {
  const fireTabSwitch = () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  }

  it('sets status to warning on first tab switch', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    act(() => fireTabSwitch())
    expect(result.current.status).toBe('warning')
  })

  it('resumeFromWarning returns status to active', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    act(() => fireTabSwitch())
    expect(result.current.status).toBe('warning')

    act(() => result.current.resumeFromWarning())
    expect(result.current.status).toBe('active')
  })

  it('auto-submits with p_auto_submitted: true on second tab switch', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    act(() => fireTabSwitch())  // first: warning
    act(() => result.current.resumeFromWarning())
    act(() => fireTabSwitch())  // second: auto-submit

    await waitFor(() => expect(result.current.status).toBe('auto'))

    const call = mockRpc.mock.calls.find(([name]) => name === 'grade_quiz_attempt')
    expect(call[1].p_auto_submitted).toBe(true)
    expect(call[1].p_auto_submit_reason).toBe('tab_switch_x2')
  })

  it('fills unanswered questions with -1 on auto-submit', async () => {
    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    // Answer only q1, then double-switch with q2 still open.
    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.index).toBe(1))

    act(() => fireTabSwitch())
    act(() => result.current.resumeFromWarning())
    act(() => fireTabSwitch())

    await waitFor(() => expect(result.current.status).toBe('auto'))

    const call = mockRpc.mock.calls.find(([name]) => name === 'grade_quiz_attempt')
    const answers = call[1].p_answers
    expect(answers['q1']).toBe(0)   // answered
    expect(answers['q2']).toBe(-1)  // skipped, filled by buildFinalAnswers
  })

  // --- Stale-ref safety test -----------------------------------------------
  // This test validates the core reason submitQuizRef exists.
  // Scenario: the user loads phase 'html', the visibility handler is registered,
  // then somehow the hook re-renders with a new phase without re-registering
  // (which can't happen in normal use, but tests the contract).
  // The handler must always call the LATEST submitQuiz, not the stale one.
  it('visibilitychange handler calls the latest submitQuiz after re-render', async () => {
    const { result, rerender } = renderHook(
      ({ phase }) => useQuizSession(phase, OWNER_PROFILE, vi.fn()),
      { initialProps: { phase: 'html' } }
    )
    await waitFor(() => expect(result.current.status).toBe('active'))

    // Spy on the rpc call AFTER questions are loaded to assert the phase used.
    const rpSpy = vi.spyOn({ rpc: mockRpc }, 'rpc')

    act(() => fireTabSwitch())  // warning
    act(() => result.current.resumeFromWarning())
    act(() => fireTabSwitch())  // auto-submit

    await waitFor(() => expect(result.current.status).toBe('auto'))

    // The auto-submit must carry the phase that was active when questions loaded.
    const call = mockRpc.mock.calls.find(([name]) => name === 'grade_quiz_attempt')
    expect(call[1].p_phase).toBe('html')

    rpSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// 4. Error handling
// ---------------------------------------------------------------------------
describe('error handling', () => {
  it('sets error state when grade_quiz_attempt RPC fails', async () => {
    mockRpc.mockImplementation((rpcName) => {
      if (rpcName === 'get_quiz_questions') return Promise.resolve({ data: MOCK_QUESTIONS, error: null })
      if (rpcName === 'grade_quiz_attempt') return Promise.resolve({ data: null, error: { message: 'DB error' } })
    })

    const { result } = renderHook(() =>
      useQuizSession('html', UNLOCKED_PROFILE, vi.fn())
    )
    await waitFor(() => expect(result.current.status).toBe('active'))
    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.index).toBe(1))
    act(() => result.current.handleSelect(0))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.errorMsg).toBe('DB error')
  })
})
