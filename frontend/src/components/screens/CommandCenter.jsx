import { useState } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { reEvaluate, simulateOverride } from '../../api/threshold'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'
import { SessionReport } from './SessionReport'

const MAX_CHALLENGE_CHARS = 1000

// ── Sub-components ────────────────────────────────────────────────────────────

function ReasoningStep({ step, index, isLast }) {
  // Clean up raw data key strings the AI sometimes returns as sourceReference
  // e.g. "emergency.type = TRACK_ANOMALY" → "Emergency Type: Track Anomaly"
  function humanize(raw) {
    if (!raw) return ''
    // If it looks like a data key (contains = or []), format it nicely
    if (/[=\[\]{}]/.test(raw)) {
      return raw
        .replace(/([a-z])([A-Z])/g, '$1 $2')          // camelCase → words
        .replace(/\./g, ' › ')                          // dots → arrows
        .replace(/\[.*?\]/g, '')                        // remove array indices
        .replace(/\s*=\s*/g, ': ')                      // = → :
        .replace(/['"]/g, '')                           // remove quotes
        .replace(/\s+/g, ' ')
        .trim()
    }
    return raw
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
          {index + 1}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-800 mt-1" />}
      </div>
      <div className="pb-4 flex-1">
        <p className="text-blue-400 text-xs font-semibold mb-1 leading-snug">
          {humanize(step.sourceReference)}
        </p>
        <p className="text-gray-200 text-sm leading-relaxed">{step.rationale}</p>
        {step.contribution && (
          <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
            <span className="text-gray-600 font-semibold">Impact: </span>
            {step.contribution}
          </p>
        )}
      </div>
    </div>
  )
}

function ControlOrderDraft({ order }) {
  const [confirmed, setConfirmed] = useState(false)
  return (
    <div className="bg-gray-950 border border-amber-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-900 bg-amber-950/30">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold font-mono text-sm">{order.number}</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className="text-xs text-gray-400 font-mono">{order.time}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
          confirmed ? 'text-green-400 bg-green-950 border-green-800'
                    : 'text-amber-400 bg-amber-950 border-amber-800'
        }`}>
          {confirmed ? 'CONFIRMED' : 'DRAFT'}
        </span>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">To</p>
          <p className="text-gray-200 text-sm">{order.to?.join('  ·  ')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Instruction</p>
          <p className="text-white font-semibold text-sm">{order.instruction}</p>
          <p className="text-gray-400 text-xs mt-1">{order.detail}</p>
        </div>
        {order.precedenceRule && (
          <p className="text-xs text-blue-500 font-mono">Authority: Precedence Rule {order.precedenceRule}</p>
        )}
        <p className="text-xs text-gray-600 italic">{order.issuedBy}</p>
      </div>
      {!confirmed && (
        <div className="px-4 pb-4">
          <button
            onClick={() => setConfirmed(true)}
            className="w-full py-2 bg-amber-800 hover:bg-amber-700 text-white text-xs font-bold
              uppercase tracking-widest rounded transition-colors"
          >
            ✓ Confirm & Issue Control Order
          </button>
        </div>
      )}
    </div>
  )
}

function OperationalConfidence({ confidence }) {
  if (!confidence) return null
  const color = confidence.score >= 90 ? 'text-green-400' : confidence.score >= 75 ? 'text-amber-400' : 'text-red-400'
  const bar   = confidence.score >= 90 ? 'bg-green-600'  : confidence.score >= 75 ? 'bg-amber-600'  : 'bg-red-600'
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Operational Confidence</p>
        <span className={`text-l font-bold font-mono ${color}`}>{confidence.score}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full mb-3">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${confidence.score}%` }} />
      </div>
      <div className="space-y-1">
        {(confidence.factors ?? []).map((f, i) => (
          <p key={i} className={`text-xs ${f.startsWith('✓') ? 'text-gray-400' : 'text-gray-600'}`}>{f}</p>
        ))}
      </div>
    </div>
  )
}

function CrewAvailabilityPanel({ crewAvailability, shiftContext }) {
  // Prefer data from shiftContext crew when AI returns empty array
  const { crew = [], trains = [] } = shiftContext ?? {}

  const crewAtRisk = crew.filter((c) => c.dutyRemainingMinutes < 120)
  if (crewAtRisk.length === 0 && !crewAvailability?.length) return null

  // Build display items — use shiftContext as source of truth
  const items = crewAtRisk.map((c) => {
    const train = trains.find((t) => t.trainNo === c.trainNo)
    return {
      trainNo:        c.trainNo,
      trainName:      train?.trainName ?? c.trainNo,
      level:          c.dutyRemainingMinutes < 60 ? 'CRITICAL' : c.dutyRemainingMinutes < 90 ? 'WARNING' : 'WATCH',
      dutyRemaining:  c.dutyRemainingMinutes,
      reliefAvailable:c.reliefAvailable,
      reliefLocation: c.reliefLocation,
      reliefEta:      c.reliefEtaMinutes != null ? `${c.reliefEtaMinutes} min` : null,
    }
  })

  if (items.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-800">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Crew Status</p>
      </div>
      <div className="divide-y divide-gray-800">
        {items.map((c, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">{c.trainName}</p>
              <p className={`text-xs font-bold mt-0.5 ${
                c.level === 'CRITICAL' ? 'text-red-400' :
                c.level === 'WARNING'  ? 'text-amber-400' : 'text-blue-400'
              }`}>{c.level} — {c.dutyRemaining} min duty remaining</p>
            </div>
            {c.reliefAvailable ? (
              <div className="text-right shrink-0">
                <p className="text-green-400 text-xs font-bold">Relief Available</p>
                {c.reliefLocation && <p className="text-gray-400 text-xs">{c.reliefLocation}</p>}
                {c.reliefEta      && <p className="text-gray-500 text-xs">ETA: {c.reliefEta}</p>}
              </div>
            ) : (
              <div className="text-right shrink-0">
                <p className="text-red-400 text-xs font-bold">No Relief</p>
                <p className="text-gray-600 text-xs">Contact TLC</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Override Impact Panel ─────────────────────────────────────────────────────

function OverrideImpactPanel({ analysis, aiRecommendation, onConfirm }) {
  if (!analysis) return null

  const { classification, trainImpacts, crewImpact, conflictStatus, networkSummary } = analysis
  const riskColor = networkSummary.operationalRisk === 'Low'    ? 'text-green-400' :
                    networkSummary.operationalRisk === 'Medium' ? 'text-amber-400' : 'text-red-400'
  const confColor = networkSummary.operationalConfidence >= 80  ? 'text-green-400' :
                    networkSummary.operationalConfidence >= 65  ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="bg-amber-950/10 border border-amber-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-950/30 border-b border-amber-900">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-amber-300 font-bold text-sm">Override Impact Analysis</p>
            <p className="text-amber-600 text-xs mt-0.5">
              Category: {classification.category}
              <span className="ml-2 font-mono">[{classification.code}]</span>
            </p>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold font-mono ${confColor}`}>
              {networkSummary.operationalConfidence}%
            </p>
            <p className="text-gray-600 text-xs">confidence</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* AI vs Controller comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5">
            <p className="text-xs text-gray-500 mb-1">AI Recommended</p>
            <p className="text-blue-400 text-sm font-semibold">{aiRecommendation}</p>
          </div>
          <div className="bg-gray-900 border border-amber-900 rounded-lg px-3 py-2.5">
            <p className="text-xs text-gray-500 mb-1">Controller Override</p>
            <p className="text-amber-300 text-sm font-semibold">{analysis.overrideReason.slice(0, 50)}</p>
          </div>
        </div>

        {/* Per-train impact */}
        <div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Train Impact Assessment</p>
          <div className="space-y-1.5">
            {trainImpacts.map((ti, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-xs font-semibold truncate">{ti.trainName}</p>
                  <p className="text-gray-500 text-xs">{ti.impactNote}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-gray-500">
                    {ti.delayBefore} min
                    <span className={`ml-1 font-bold ${
                      ti.additionalDelay > 0 ? 'text-red-400' :
                      ti.additionalDelay < 0 ? 'text-green-400' : 'text-gray-600'
                    }`}>
                      {ti.additionalDelay > 0 ? `+${ti.additionalDelay}` :
                       ti.additionalDelay < 0 ? `${ti.additionalDelay}` : '±0'}
                    </span>
                    {' '}→{' '}
                    <span className="text-white font-bold">{ti.delayAfter} min</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crew compliance */}
        {crewImpact.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Crew Compliance</p>
            <div className="space-y-1.5">
              {crewImpact.map((c, i) => (
                <div key={i} className={`flex items-center justify-between bg-gray-900 border rounded-lg px-3 py-2 ${
                  c.status === 'Exceeded' ? 'border-red-800' :
                  c.status === 'At Risk'  ? 'border-amber-800' : 'border-gray-800'
                }`}>
                  <div>
                    <p className="text-gray-200 text-xs font-semibold">{c.trainName}</p>
                    <p className="text-gray-500 text-xs">{c.note}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ml-3 ${
                    c.status === 'Exceeded' ? 'text-red-400 bg-red-950 border-red-800' :
                    c.status === 'At Risk'  ? 'text-amber-400 bg-amber-950 border-amber-800' :
                                              'text-green-400 bg-green-950 border-green-800'
                  }`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflict resolution */}
        {conflictStatus.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Conflict Status</p>
            <div className="space-y-1.5">
              {conflictStatus.map((cs, i) => (
                <div key={i} className="flex items-start gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                  <span className={`text-xs shrink-0 mt-0.5 ${cs.resolved ? 'text-green-400' : 'text-amber-400'}`}>
                    {cs.resolved ? '✓' : '⚠'}
                  </span>
                  <div>
                    <p className="text-gray-300 text-xs font-semibold">{cs.trains} — {cs.section}</p>
                    <p className="text-gray-500 text-xs">{cs.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Network summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-800 rounded-lg overflow-hidden">
          {[
            { label: 'Delay Before', value: `${networkSummary.totalDelayBefore} min`, color: 'text-gray-300' },
            { label: 'Delay After',  value: `${networkSummary.totalDelayAfter} min`,
              color: networkSummary.totalDelayAfter > networkSummary.totalDelayBefore ? 'text-red-400' : 'text-green-400' },
            { label: 'Operational Risk', value: networkSummary.operationalRisk, color: riskColor },
            { label: 'Crew Violations',  value: networkSummary.crewViolations,
              color: networkSummary.crewViolations > 0 ? 'text-red-400' : 'text-green-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className={`text-sm font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Confirm override button */}
        <button
          onClick={onConfirm}
          className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-white rounded-lg
            font-bold text-sm tracking-widest uppercase transition-colors"
        >
          ✓ Record Override Decision
        </button>
      </div>
    </div>
  )
}

function AuditEntry({ entry, index }) {
  const [open, setOpen] = useState(false)

  // Truncate long decision strings for the header
  const shortDecision = (entry.finalDecision ?? '').length > 50
    ? entry.finalDecision.slice(0, 50) + '…'
    : entry.finalDecision

  const shortIssue = entry.issueTitle
    ? (entry.issueTitle.length > 40 ? entry.issueTitle.slice(0, 40) + '…' : entry.issueTitle)
    : null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.overrideReason ? 'bg-amber-400' : 'bg-blue-500'}`} />
          <span className="text-gray-300 text-sm font-medium truncate">
            #{index + 1}{shortIssue ? ` — ${shortIssue}` : ''}
          </span>
          <span className={`text-xs shrink-0 ${entry.overrideReason ? 'text-amber-400' : 'text-blue-400'}`}>
            {entry.overrideReason ? 'Override' : shortDecision}
          </span>
        </div>
        <span className="text-gray-600 text-xs shrink-0 ml-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-gray-400 space-y-2 border-t border-gray-800 pt-3">
          {entry.issueTitle && (
            <p className="text-gray-300 font-medium text-xs uppercase tracking-widest">{entry.issueTitle}</p>
          )}
          {entry.aiRecommendation && (
            <p><span className="text-gray-500 text-xs">AI recommended: </span><span className="text-gray-300">{entry.aiRecommendation.slice(0, 150)}{entry.aiRecommendation.length > 150 ? '…' : ''}</span></p>
          )}
          <p><span className="text-gray-500 text-xs">Decision: </span><span className="text-gray-200 font-medium">{entry.finalDecision}</span></p>
          {entry.overrideReason && (
            <p><span className="text-amber-500 text-xs">Override: </span><span className="text-amber-300">{entry.overrideReason}</span></p>
          )}
          {entry.humanChallenge && (
            <p><span className="text-gray-500 text-xs">Challenge: </span><span className="text-gray-300">{entry.humanChallenge.slice(0, 120)}{entry.humanChallenge.length > 120 ? '…' : ''}</span></p>
          )}
          <p className="text-gray-600 text-xs">{entry.timestamp}</p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommandCenter() {
  const {
    recommendation, reEvaluation, overrideAnalysis,
    shiftContext, intelligence, whatIf,
    activeIssue, resolvedIssues,
    auditLog,
    setReEvaluation, setOverrideAnalysis, appendAuditLog,
    markScreenComplete, resolveIssue, navigateTo,
  } = useSessionStore()

  const [challenge,           setChallenge]          = useState('')
  const [challengeError,      setChallengeError]      = useState('')
  const [reEvalLoading,       setReEvalLoading]       = useState(false)
  const [reEvalError,         setReEvalError]         = useState('')
  const [reEvalRetry,         setReEvalRetry]         = useState(0)

  const [overrideMode,        setOverrideMode]        = useState(false)
  const [overrideReason,      setOverrideReason]      = useState('')
  const [overrideReasonError, setOverrideReasonError] = useState('')
  const [overrideLoading,     setOverrideLoading]     = useState(false)

  const [finalDone,  setFinalDone]  = useState(false)
  const [showReport, setShowReport] = useState(false)

  if (!recommendation) return null

  const rec              = recommendation
  const trail            = rec.reasoningTrail ?? []
  const controlOrder     = rec.controlOrder
  const opConf           = rec.operationalConfidence
  const crewAvailability = rec.crewAvailability ?? []
  const finalRecommended = reEvaluation?.recommendation ?? rec.recommendation

  // ── Handlers ───────────────────────────────────────────────

  async function handleChallenge() {
    if (!challenge.trim()) { setChallengeError('Enter your challenge before submitting.'); return }
    setChallengeError('')
    setReEvalLoading(true)
    try {
      const result = await reEvaluate(shiftContext, intelligence, whatIf, recommendation, challenge)
      setReEvaluation(result)
      setReEvalRetry(0)
    } catch (err) {
      setReEvalRetry((n) => n + 1)
      setReEvalError(`Re-evaluation failed: ${err.message}`)
    } finally {
      setReEvalLoading(false)
    }
  }

  function handleConfirmDecision() {
    const decision = finalRecommended
    appendAuditLog({
      finalDecision:    decision,
      aiRecommendation: rec.recommendation,
      humanChallenge:   challenge || null,
      reEvaluation:     reEvaluation?.explanation ?? null,
      overrideReason:   null,
      issueId:          activeIssue?.id ?? null,
      issueTitle:       activeIssue?.title ?? null,
    })
    if (activeIssue) {
      resolveIssue(activeIssue.id, decision)
      navigateTo('simulator')
    } else {
      markScreenComplete('command')
      setFinalDone(true)
    }
  }

  async function handleOverrideSubmit() {
    if (!overrideReason.trim()) {
      setOverrideReasonError('Provide a reason — Threshold needs it to analyse the impact.')
      return
    }
    setOverrideReasonError('')
    setOverrideLoading(true)
    try {
      const result = await simulateOverride(shiftContext, intelligence, recommendation, overrideReason)
      setOverrideAnalysis(result)
    } catch (err) {
      setOverrideReasonError(`Impact analysis failed: ${err.message}`)
    } finally {
      setOverrideLoading(false)
    }
  }

  function handleConfirmOverride() {
    const cls = overrideAnalysis?.classification
    const decision = `Override [${cls?.code ?? 'OPJ'}] — ${overrideReason.slice(0, 80)}`
    appendAuditLog({
      finalDecision:    decision,
      aiRecommendation: rec.recommendation,
      humanChallenge:   challenge || null,
      reEvaluation:     reEvaluation?.explanation ?? null,
      overrideReason,
      overrideCategory: cls?.category ?? 'Operational Judgement',
      issueId:          activeIssue?.id ?? null,
      issueTitle:       activeIssue?.title ?? null,
    })
    if (activeIssue) {
      resolveIssue(activeIssue.id, decision)
      navigateTo('simulator')
    } else {
      markScreenComplete('command')
      setFinalDone(true)
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {showReport && <SessionReport onClose={() => setShowReport(false)} />}

      <div className="mb-2">
        <h2 className="text-lg font-bold text-white tracking-tight">Command Center</h2>
        <p className="text-gray-500 text-xs mt-0.5">
          Review · Issue order · Challenge if needed · Confirm decision
        </p>
      </div>

      {/* Step guide */}
      <div className="grid grid-cols-4 gap-px bg-gray-800 border border-gray-700 rounded-xl overflow-hidden text-center">
        {[
          { n: '1', label: 'Review',     sub: 'Read the AI recommendation and reasoning' },
          { n: '2', label: 'Challenge',  sub: 'Optional — push back with local knowledge' },
          { n: '3', label: 'Decide',     sub: 'Accept the AI or override with your call' },
          { n: '4', label: 'Issue Order',sub: 'Send the control order to station masters' },
        ].map(({ n, label, sub }) => (
          <div key={n} className="bg-gray-900 px-2 py-2.5">
            <p className="text-xs font-bold font-mono text-blue-500 mb-0.5">{n}</p>
            <p className="text-xs font-semibold text-white">{label}</p>
            <p className="text-gray-600 text-xs leading-tight mt-0.5 hidden sm:block">{sub}</p>
          </div>
        ))}
      </div>

      {/* Active issue context */}
      {activeIssue && (
        <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
          activeIssue.priority === 'CRITICAL' ? 'bg-red-950/20 border-red-800' :
          activeIssue.priority === 'HIGH'     ? 'bg-amber-950/15 border-amber-800' :
                                                'bg-blue-950/10 border-blue-800'
        }`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                activeIssue.priority === 'CRITICAL' ? 'text-red-400 bg-red-950 border-red-800' :
                activeIssue.priority === 'HIGH'     ? 'text-amber-400 bg-amber-950 border-amber-800' :
                                                      'text-blue-400 bg-blue-950 border-blue-800'
              }`}>{activeIssue.priority}</span>
              <span className="text-xs text-gray-500">{activeIssue.issueType}</span>
            </div>
            <p className="text-white font-semibold text-sm">{activeIssue.title}</p>
          </div>
          <button
            onClick={() => navigateTo('simulator')}
            className="text-gray-600 hover:text-gray-400 text-xs shrink-0 transition-colors"
          >
            ← Back to Plan
          </button>
        </div>
      )}

      {/* Step 1 — Review */}
      <section className="bg-gray-900 border border-blue-900 rounded-xl p-5">
        <p className="text-xs text-blue-500 font-bold uppercase tracking-widest mb-1">Step 1 — Review AI Recommendation</p>
        <p className={`font-bold leading-tight mt-1 ${rec.emergencyMode ? 'text-l text-red-400' : 'text-l text-blue-300'}`}>
          {rec.emergencyMode ? 'EMERGENCY BLOCK PROTECTION' : rec.recommendation}
        </p>
        {rec.summary && !rec.emergencyMode && (
          <p className="text-gray-400 text-sm mt-2">{rec.summary}</p>
        )}
      </section>

      {/* Emergency Steps — shown instead of normal flow when emergencyMode is true */}
      {rec.emergencyMode && (
        <section className="bg-red-950/20 border border-red-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-red-950/30 border-b border-red-900">
            <p className="text-red-300 font-bold text-sm">Emergency Block Protection — Required Actions</p>
            <p className="text-red-600 text-xs mt-0.5">Execute in order. Do not skip steps. Normal operations resume only after P-Way clearance.</p>
          </div>
          <div className="divide-y divide-red-900/30">
            {(() => {
              // Use structured steps if available, otherwise parse from recommendation text
              const steps = rec.emergencySteps?.length
                ? rec.emergencySteps
                : (rec.recommendation ?? '')
                    .split(/\(\d+\)/)
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((text, i) => ({ seq: i + 1, action: text.split('.')[0].trim(), detail: text.split('.').slice(1).join('.').trim() || text }))

              return steps.map((step, i) => (
                <div key={i} className="px-4 py-3 flex gap-3">
                  <span className="text-red-500 font-bold font-mono text-sm shrink-0 w-6">{step.seq ?? i + 1}.</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{step.action}</p>
                    {step.detail && step.detail !== step.action && (
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{step.detail}</p>
                    )}
                  </div>
                </div>
              ))
            })()}
          </div>
          {rec.summary && (
            <div className="px-4 py-3 border-t border-red-900/30 bg-red-950/10">
              <p className="text-red-400 text-xs leading-relaxed">{rec.summary}</p>
            </div>
          )}
        </section>
      )}

      {/* Operational Confidence */}
      <OperationalConfidence confidence={opConf} />

      {/* Crew Status */}
      <CrewAvailabilityPanel crewAvailability={crewAvailability} shiftContext={shiftContext} />

      {/* Reasoning Trail */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">Reasoning</p>
        {trail.length === 0
          ? <LoadingSpinner label="Loading reasoning trail…" />
          : trail.map((step, i) => (
              <ReasoningStep key={i} step={step} index={i} isLast={i === trail.length - 1} />
            ))
        }
      </section>

      {/* Step 2 — Challenge (optional) */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-0.5">
          Step 2 — Challenge <span className="text-gray-700 font-normal normal-case tracking-normal">(optional)</span>
        </p>
        <p className="text-gray-500 text-xs mb-3">
          Have local knowledge the AI doesn't? Challenge it here — Threshold re-evaluates and shows if the recommendation changes.
          <span className="text-gray-600"> Skip if you agree.</span>
        </p>
        <textarea
          rows={3}
          maxLength={MAX_CHALLENGE_CHARS}
          placeholder="e.g. Station C loop is actually occupied — the freight cannot be held there…"
          value={challenge}
          onChange={(e) => { setChallenge(e.target.value); setChallengeError('') }}
          disabled={!!reEvaluation}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-gray-100 text-sm
            placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-700
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-red-400">{challengeError}</span>
          <span className="text-xs text-gray-600">{challenge.length}/{MAX_CHALLENGE_CHARS}</span>
        </div>
        {reEvalError && (
          <div className="mt-2">
            <ErrorBanner message={reEvalError} onRetry={reEvalRetry < 2 ? handleChallenge : undefined}
              retryCount={reEvalRetry} maxRetries={2} />
          </div>
        )}
        {!reEvaluation && (
          reEvalLoading
            ? <LoadingSpinner label="Re-evaluating…" />
            : <button onClick={handleChallenge} disabled={reEvalRetry >= 2}
                className="mt-3 w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg
                  font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Submit Challenge
              </button>
        )}
      </section>

      {/* Re-evaluation result */}
      {reEvaluation && (
        <section className="bg-gray-900 border border-purple-900 rounded-xl p-5">
          <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mb-3">Re-evaluation</p>
          <div className="flex gap-6 mb-3">
            <div>
              <p className="text-xs text-gray-600 mb-1">Original</p>
              <p className="text-l font-bold text-gray-400">{rec.recommendation}</p>
            </div>
            <div className="w-px bg-gray-800" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Revised</p>
              <p className="text-m font-bold text-purple-300">{reEvaluation.recommendation}</p>
            </div>
            <div className="ml-auto">
              <span className={`text-xs font-bold px-2 py-1 rounded border ${
                reEvaluation.changed
                  ? 'text-amber-400 bg-amber-950 border-amber-800'
                  : 'text-green-400 bg-green-950 border-green-800'
              }`}>{reEvaluation.changed ? 'CHANGED' : 'UPHELD'}</span>
            </div>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{reEvaluation.explanation}</p>
        </section>
      )}

      {/* Final Decision */}
      {!finalDone ? (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">
            Step 3 — Decide
          </p>
          <p className="text-gray-500 text-xs mb-4">
            {activeIssue
              ? 'Accept the AI recommendation or override with your own call. Either way it gets logged and you return to the Action Plan for the next issue.'
              : 'Confirm your final decision for this session.'}
          </p>

          {/* Override impact panel — shown after reason submitted */}
          {overrideAnalysis && (
            <div className="mb-4">
              <OverrideImpactPanel
                analysis={overrideAnalysis}
                aiRecommendation={rec.recommendation}
                onConfirm={handleConfirmOverride}
              />
            </div>
          )}

          {!overrideAnalysis && (
            <div className="space-y-3">
              {/* Accept */}
              <button onClick={handleConfirmDecision}
                className="w-full py-3 bg-green-700 hover:bg-green-600 text-white rounded-xl
                  font-bold text-sm tracking-wide transition-colors">
                ✓ Accept Recommendation
              </button>

              {/* Override */}
              {!overrideMode ? (
                <button onClick={() => setOverrideMode(true)}
                  className="w-full py-2.5 text-amber-400 border border-amber-900/60 hover:bg-amber-950/20
                    rounded-xl text-sm font-semibold transition-colors">
                  ✕ Disagree — Override with my own decision
                </button>
              ) : (
                <div className="bg-amber-950/20 border border-amber-800 rounded-xl p-4">
                  <p className="text-amber-300 text-sm font-bold mb-1">Your Override Reason</p>
                  <p className="text-gray-400 text-xs mb-3">
                    AI recommended: <span className="text-blue-400">{rec.recommendation}</span>.
                    Explain your decision — Threshold will simulate the impact before you confirm.
                  </p>
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. Rajdhani cannot wait — VIP movement at Ramagundam. Issuing caution order instead of full stop…"
                    value={overrideReason}
                    onChange={(e) => { setOverrideReason(e.target.value); setOverrideReasonError('') }}
                    className="w-full bg-gray-800 border border-amber-800 rounded-lg px-3 py-2.5 text-gray-100
                      text-sm placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-amber-700"
                  />
                  {overrideReasonError && <p className="text-red-400 text-xs mt-1">{overrideReasonError}</p>}
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => { setOverrideMode(false); setOverrideReason('') }}
                      className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg
                        text-xs font-semibold transition-colors">
                      Cancel
                    </button>
                    {overrideLoading
                      ? <div className="flex-1 flex items-center justify-center"><LoadingSpinner label="Analysing…" /></div>
                      : <button onClick={handleOverrideSubmit}
                          className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-600 text-white rounded-lg
                            font-bold text-xs uppercase tracking-wide transition-colors">
                          Simulate Impact →
                        </button>
                    }
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-4">
          {/* Step 4 — Control Order — only shown after decision confirmed */}
          {controlOrder && (
            <section>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">
                Step 4 — Issue Control Order
              </p>
              <p className="text-gray-600 text-xs mb-2">
                Decision confirmed. Now send the official instruction to station masters.
              </p>
              <ControlOrderDraft order={controlOrder} />
            </section>
          )}

          <div className="bg-green-950 border border-green-800 rounded-xl p-5 text-center">
            <p className="text-green-400 font-bold text-lg">Decision Recorded</p>
            <p className="text-green-600 text-sm mt-1">Appended to shift log.</p>
            <div className="mt-4">
              <button onClick={() => setShowReport(true)}
                className="flex items-center gap-2 mx-auto bg-blue-700 hover:bg-blue-600 text-white
                  text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded transition-colors">
                ⬡ View Full Decision Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Log */}
      {auditLog.length > 0 && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Shift Log</p>
          <div className="space-y-2">
            {auditLog.map((entry, i) => <AuditEntry key={i} entry={entry} index={i} />)}
          </div>
        </section>
      )}
    </div>
  )
}
