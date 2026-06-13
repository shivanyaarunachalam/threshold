import { useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { getIssueRecommendation } from '../../api/threshold'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'
import { SessionReport } from './SessionReport'

const PRIORITY_STYLES = {
  CRITICAL: { border: 'border-red-800',   bg: 'bg-red-950/20',   badge: 'text-red-400 bg-red-950 border-red-800',     dot: 'bg-red-500',    seq: 'text-red-500'   },
  HIGH:     { border: 'border-amber-800', bg: 'bg-amber-950/15', badge: 'text-amber-400 bg-amber-950 border-amber-800', dot: 'bg-amber-500',  seq: 'text-amber-500' },
  MEDIUM:   { border: 'border-blue-800',  bg: 'bg-blue-950/10',  badge: 'text-blue-400 bg-blue-950 border-blue-800',   dot: 'bg-blue-500',   seq: 'text-blue-500'  },
  LOW:      { border: 'border-gray-700',  bg: 'bg-gray-900',     badge: 'text-gray-400 bg-gray-800 border-gray-700',   dot: 'bg-gray-500',   seq: 'text-gray-500'  },
}

const IMPACT_KEYS = [
  { key: 'passengerPunctuality', label: 'Passenger', icon: '👤' },
  { key: 'freightThroughput',    label: 'Freight',   icon: '📦' },
  { key: 'crewCompliance',       label: 'Crew',      icon: '🧑‍✈️' },
  { key: 'cascadeImpact',        label: 'Cascade',   icon: '🔗' },
  { key: 'departmentImpact',     label: 'Dept',      icon: '🏛' },
]

function IssueCard({ item, onSelect, isResolved, resolvedDecision }) {
  const s = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.LOW

  if (isResolved) {
    return (
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60">
        <span className="text-green-500 text-lg shrink-0">✓</span>
        <div className="flex-1 min-w-0">
          <p className="text-gray-400 text-sm font-semibold line-through">{item.title}</p>
          <p className="text-gray-600 text-xs mt-0.5">{resolvedDecision}</p>
        </div>
        <span className="text-xs text-green-600 font-bold shrink-0">RESOLVED</span>
      </div>
    )
  }

  return (
    <div className={`border rounded-xl overflow-hidden ${s.border} ${s.bg}`}>
      {/* Header */}
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className={`text-xs font-bold font-mono ${s.seq}`}>#{item.seq}</span>
          <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-white font-bold text-sm leading-tight">{item.title}</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${s.badge}`}>
              {item.priority}
            </span>
          </div>
          <p className="text-gray-500 text-xs">{item.issueType}</p>
        </div>
      </div>

      {/* Recommended action */}
      <div className="px-4 pb-3 border-t border-white/5 pt-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">AI Recommendation</p>
        <p className="text-gray-200 text-sm">{item.recommendedAction}</p>
        {item.precedenceRule && (
          <span className="inline-block mt-1 text-xs font-mono text-blue-500 bg-blue-950/40 border border-blue-900 rounded px-1.5 py-0.5">
            Rule {item.precedenceRule}
          </span>
        )}
      </div>

      {/* Consequences */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/5 pt-2">
        {IMPACT_KEYS.slice(0, 4).map(({ key, label, icon }) => (
          <div key={key} className="flex gap-1.5 items-start">
            <span className="text-xs shrink-0">{icon}</span>
            <div>
              <p className="text-xs text-gray-600">{label}</p>
              <p className="text-xs text-gray-400 leading-tight">{item.consequences[key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden weakness */}
      <details className="group border-t border-white/5">
        <summary className="px-4 py-2 flex items-center gap-2 cursor-pointer list-none text-xs
          text-amber-600 hover:text-amber-400 transition-colors select-none">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Hidden weakness
        </summary>
        <div className="px-4 pb-3 bg-amber-950/10 border-t border-amber-900/30">
          <p className="text-amber-400/80 text-xs leading-relaxed">{item.hiddenWeakness}</p>
        </div>
      </details>

      {/* CTA */}
      <div className="px-4 pb-4 pt-2">
        <button
          onClick={() => onSelect(item)}
          className="w-full py-2.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg
            font-bold text-xs tracking-widest uppercase transition-colors"
        >
          Resolve This Issue →
        </button>
      </div>
    </div>
  )
}

export function ActionPlan() {
  const {
    actionPlan, shiftContext, intelligence,
    resolvedIssues,
    loading, error, retryCount,
    setLoading, setError, clearError,
    incrementRetry, resetRetry,
    setActiveIssue, setRecommendation,
    markScreenComplete, navigateTo,
    setSystemStatus,
  } = useSessionStore()

  const [showReport, setShowReport] = useState(false)

  if (!actionPlan) return null

  const items    = actionPlan.items ?? []
  const resolved = new Set(resolvedIssues.map((r) => r.issueId))
  const pending  = items.filter((i) => !resolved.has(i.id))
  const done     = items.filter((i) => resolved.has(i.id))
  const allDone  = pending.length === 0

  async function handleSelectIssue(item) {
    clearError()
    setLoading(true)
    setSystemStatus('recommending')
    try {
      const result = await getIssueRecommendation(shiftContext, intelligence, item)
      setRecommendation(result)
      setActiveIssue(item)
      resetRetry()
      setSystemStatus('complete')
      // Mark simulator complete so nav guard allows command
      markScreenComplete('simulator')
      navigateTo('command')
    } catch (err) {
      incrementRetry()
      setSystemStatus('error')
      setError(`Recommendation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  function handleFinish() {
    markScreenComplete('simulator')
    navigateTo('command')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {showReport && <SessionReport onClose={() => setShowReport(false)} />}

      <div className="mb-2">
        <h2 className="text-lg font-bold text-white tracking-tight">AI Action Plan</h2>
        <p className="text-gray-500 text-xs mt-0.5">
          {allDone
            ? 'All issues resolved. Review the shift log or close the session.'
            : `${pending.length} issue${pending.length !== 1 ? 's' : ''} require action. Select one to open the Command Center for that specific issue.`}
        </p>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 rounded-full transition-all duration-500"
              style={{ width: `${(done.length / items.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 tabular-nums shrink-0">
            {done.length}/{items.length} resolved
          </span>
        </div>
      )}

      {error && (
        <ErrorBanner message={error}
          onRetry={retryCount < 2 ? undefined : undefined}
          retryCount={retryCount} maxRetries={2} />
      )}

      {loading ? (
        <LoadingSpinner label="Generating recommendation…" />
      ) : (
        <>
          {/* Pending issues */}
          {pending.length > 0 && (
            <div className="space-y-4">
              {pending.map((item) => (
                <IssueCard
                  key={item.id}
                  item={item}
                  onSelect={handleSelectIssue}
                  isResolved={false}
                />
              ))}
            </div>
          )}

          {/* Resolved issues */}
          {done.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-bold uppercase tracking-widest">Resolved</p>
              {done.map((item) => {
                const r = resolvedIssues.find((r) => r.issueId === item.id)
                return (
                  <IssueCard
                    key={item.id}
                    item={item}
                    onSelect={() => {}}
                    isResolved={true}
                    resolvedDecision={r?.decision}
                  />
                )
              })}
            </div>
          )}

          {/* All done */}
          {allDone && (
            <div className="bg-green-950/30 border border-green-800 rounded-xl p-5 text-center">
              <p className="text-green-400 font-bold text-lg mb-1">All Issues Resolved</p>
              <p className="text-green-600 text-sm mb-4">
                Every detected risk has been addressed. The shift log has been updated.
              </p>
              <button
                onClick={() => setShowReport(true)}
                className="mx-auto flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white
                  text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded transition-colors"
              >
                ⬡ View Full Decision Report
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
