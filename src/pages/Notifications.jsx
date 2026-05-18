// =============================================================================
// NOTIFICATIONS PAGE  (flagged quiz attempts)
// -----------------------------------------------------------------------------
// Route: /notifications
// Access: owners + admins only (gated in DashboardLayout's nav AND App.jsx)
//
// Shows every quiz attempt that was auto-submitted due to tab-switch
// enforcement. Each row shows who, what phase, the partial score, when it
// happened, and how many tab switches were recorded. Clicking a row expands
// to show full details. An "Acknowledge" button marks the flag as reviewed,
// which clears the unread badge in the sidebar.
//
// DATA: reads from public.flagged_attempts_view (defined in
// migration_flagged_attempts.sql) — joins quiz_attempts to profiles in one
// query.
// =============================================================================
import { useState, useEffect } from 'react'
import {
  Loader2, AlertTriangle, CheckCircle2, Clock, Mail, Layers,
  Hash, Eye, ChevronDown, ChevronUp,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { PHASE_LABELS } from '../utils/constants'
import DashboardLayout from '../components/layout/DashboardLayout'

export default function Notifications() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [ackingId, setAckingId] = useState(null)
  const [filter, setFilter] = useState('unreviewed') // 'unreviewed' | 'all'

  // ---- fetch flagged attempts ---------------------------------------------
  const load = async () => {
    setLoading(true)
    setErrorMsg('')
    const { data, error } = await supabase
      .from('flagged_attempts_view')
      .select('*')

    if (error) {
      setErrorMsg(error.message || 'Could not load notifications.')
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ---- acknowledge a flag (mark as reviewed) ------------------------------
  const acknowledge = async (attemptId) => {
    setAckingId(attemptId)
    const { error } = await supabase.rpc('acknowledge_flag', {
      p_attempt_id: attemptId,
    })
    setAckingId(null)
    if (error) {
      setErrorMsg(error.message || 'Could not acknowledge flag.')
      return
    }
    // Optimistic update: stamp it locally so the UI reflects it instantly.
    setRows((prev) =>
      prev.map((r) =>
        r.attempt_id === attemptId
          ? { ...r, reviewed_at: new Date().toISOString() }
          : r
      )
    )
  }

  // ---- derived list (filtered) --------------------------------------------
  const visible = filter === 'unreviewed'
    ? rows.filter((r) => !r.reviewed_at)
    : rows

  const unreviewedCount = rows.filter((r) => !r.reviewed_at).length

  // =========================================================================
  return (
    <DashboardLayout title="Notifications">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Flagged attempts</h2>
          <p className="text-zinc-400 mt-1 text-sm">
            Quiz attempts that were auto-submitted because the intern switched tabs after a warning.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <FilterPill active={filter === 'unreviewed'} onClick={() => setFilter('unreviewed')}>
            Unreviewed {unreviewedCount > 0 && (
              <span className="ml-1.5 bg-red-500/20 text-red-300 text-xs px-1.5 py-0.5 rounded">
                {unreviewedCount}
              </span>
            )}
          </FilterPill>
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </FilterPill>
        </div>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
          <p className="text-sm text-red-300">{errorMsg}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          <p className="text-sm text-zinc-500">Loading flags…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-zinc-100 font-medium">All clear</p>
          <p className="text-sm text-zinc-500 mt-1">
            {filter === 'unreviewed'
              ? 'No unreviewed flags. Nice and quiet.'
              : 'No flagged attempts yet.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((row) => (
            <FlagRow
              key={row.attempt_id}
              row={row}
              expanded={expandedId === row.attempt_id}
              onToggle={() =>
                setExpandedId((cur) => (cur === row.attempt_id ? null : row.attempt_id))
              }
              onAcknowledge={() => acknowledge(row.attempt_id)}
              acking={ackingId === row.attempt_id}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}

// ---- subcomponents ---------------------------------------------------------

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        text-xs font-medium px-3 py-1.5 rounded-md transition
        ${active
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'text-zinc-400 hover:text-zinc-100'}
      `}
    >
      {children}
    </button>
  )
}

function FlagRow({ row, expanded, onToggle, onAcknowledge, acking }) {
  const reviewed = !!row.reviewed_at
  const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email
  const switches = row.cheat_signals?.tab_switches ?? '—'
  const timeAgo = formatTimeAgo(row.attempted_at)

  return (
    <div className={`
      bg-zinc-900 border rounded-xl transition
      ${reviewed ? 'border-zinc-800 opacity-60' : 'border-amber-500/20'}
    `}>
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-zinc-900/60 transition rounded-xl"
      >
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
          ${reviewed ? 'bg-zinc-800' : 'bg-amber-500/10 border border-amber-500/20'}
        `}>
          <AlertTriangle className={`w-5 h-5 ${reviewed ? 'text-zinc-500' : 'text-amber-400'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-zinc-100 truncate">{fullName}</p>
            <span className="text-xs text-zinc-500">·</span>
            <span className="text-xs text-zinc-400">{PHASE_LABELS[row.phase]}</span>
            {reviewed && (
              <span className="text-xs text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                Reviewed
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {switches} tab switches · score {row.score}% · {timeAgo}
          </p>
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Detail icon={Mail}  label="Email"          value={row.email} />
          <Detail icon={Layers} label="Phase"          value={PHASE_LABELS[row.phase]} />
          <Detail icon={Hash}  label="Score"          value={`${row.score}% (auto-submit always fails)`} />
          <Detail icon={Eye}   label="Tab switches"   value={switches} />
          <Detail icon={Hash}  label="Answered"       value={`${row.questions_answered ?? '—'} questions before termination`} />
          <Detail icon={Clock} label="Time taken"     value={row.total_time_seconds != null ? `${row.total_time_seconds}s` : '—'} />
          <Detail icon={Clock} label="Submitted at"   value={new Date(row.attempted_at).toLocaleString()} />
          {row.reviewed_at && (
            <Detail icon={CheckCircle2} label="Reviewed at" value={new Date(row.reviewed_at).toLocaleString()} />
          )}

          {!reviewed && (
            <div className="sm:col-span-2 flex justify-end mt-2">
              <button
                onClick={onAcknowledge}
                disabled={acking}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-zinc-950 font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                {acking
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Marking…</>
                  : <><CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-zinc-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-zinc-200 text-sm truncate">{value}</p>
      </div>
    </div>
  )
}

// ---- helpers --------------------------------------------------------------
function formatTimeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60)        return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)        return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)          return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7)            return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}