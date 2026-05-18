// =============================================================================
// QUIZ TIMER
// -----------------------------------------------------------------------------
// A per-question countdown bar. Resets whenever `questionKey` changes (pass the
// current question's id). Calls `onExpire` exactly once when it hits zero.
//
// PROPS:
//   seconds      :: number  — countdown length (e.g. 45)
//   questionKey  :: any     — changes per question; resets the timer
//   onExpire     :: fn      — called once when the timer reaches 0
//
// NOTE: onExpire is held in a ref so the interval does not need to be torn
// down and rebuilt every time the parent re-renders with a new function
// identity. The interval is keyed only to `questionKey` + `seconds`.
// =============================================================================
import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

export default function QuizTimer({ seconds, questionKey, onExpire }) {
  const [remaining, setRemaining] = useState(seconds)

  // Keep the latest onExpire without making it an effect dependency.
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    setRemaining(seconds)
    const startedAt = Date.now()

    // Tick 4x/second for a smooth bar; compute from elapsed wall-clock time
    // so the countdown stays accurate even if a tick is delayed.
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const left = seconds - elapsed

      if (left <= 0) {
        clearInterval(id)
        setRemaining(0)
        onExpireRef.current?.()
      } else {
        setRemaining(left)
      }
    }, 250)

    return () => clearInterval(id)
  }, [questionKey, seconds])

  const pct = Math.max(0, (remaining / seconds) * 100)
  const danger = remaining <= 10

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          Time remaining
        </span>
        <span className={danger ? 'text-red-400 font-semibold tabular-nums' : 'text-zinc-400 tabular-nums'}>
          {remaining}s
        </span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-linear ${
            danger ? 'bg-red-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}