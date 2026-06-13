import { useSessionStore } from '../../store/sessionStore'
import { buildActionPlan } from '../../api/threshold'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'

const RISK_STYLES = {
  HIGH:   'bg-red-950 border-red-800 text-red-300',
  MEDIUM: 'bg-amber-950 border-amber-800 text-amber-300',
  WATCH:  'bg-blue-950 border-blue-800 text-blue-300',
}

const CREW_STYLES = {
  CRITICAL: 'bg-red-950 border-red-800',
  WARNING:  'bg-amber-950 border-amber-800',
  WATCH:    'bg-blue-950 border-blue-800',
}

const CREW_LABEL_STYLES = {
  CRITICAL: 'text-red-400',
  WARNING:  'text-amber-400',
  WATCH:    'text-blue-400',
}

export function AdvancePlot() {
  const {
    intelligence, shiftContext,
    loading, error, retryCount,
    setLoading, setError, clearError,
    incrementRetry, resetRetry,
    setActionPlan, markScreenComplete, navigateTo,
    setSystemStatus,
  } = useSessionStore()

  if (!intelligence) return null

  const { conflicts, crewRisks, cascade, situationCheck } = intelligence

  async function handleProceed() {
    clearError()
    setLoading(true)
    setSystemStatus('simulating')
    try {
      const result = await buildActionPlan(shiftContext, intelligence)
      setActionPlan(result)
      resetRetry()
      setSystemStatus('complete')
      markScreenComplete('intelligence')
      navigateTo('simulator')
    } catch (err) {
      incrementRetry()
      setSystemStatus('error')
      setError(`Action plan failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const allClear = conflicts.length === 0 && crewRisks.length === 0

  // Build the AI Discoveries — the hero section
  // Each discovery is a named, cross-signal finding with a risk level and a "so what"
  const discoveries = []

  // Multi-signal compound discoveries
  const hasConflict    = conflicts.length > 0
  const hasCrewRisk    = crewRisks.length > 0
  const hasBlock       = (intelligence.blockWindows ?? []).length > 0
  const hasMovingBlock = (intelligence.deptImpacts ?? []).some((d) => d.blocksMovement)
  const hasCascade     = !!intelligence.cascade
  const isEmergency    = conflicts.some((c) => c.type === 'EMERGENCY_HALT')

  // Emergency compound discovery — takes over if active
  if (isEmergency) {
    const emergencyConflicts = conflicts.filter((c) => c.type === 'EMERGENCY_HALT')
    const minMins = emergencyConflicts.reduce((m, c) => {
      const vals = Object.values(c.ifNoAction ?? {})
      const n = vals[0]?.match?.(/(\d+) min/)?.[1]
      return n ? Math.min(m, parseInt(n)) : m
    }, 99)
    discoveries.push({
      level: 'HIGH',
      title: 'EMERGENCY — Unverified Track Anomaly. Multiple Trains Converging.',
      signals: [
        `${emergencyConflicts.length} train${emergencyConflicts.length > 1 ? 's' : ''} approaching suspect section`,
        minMins < 99 ? `Fastest arrival: ${minMins} min` : 'Arrival time unknown',
        'P-Way inspection required',
        intelligence.weatherImpact?.brakingWarning ? 'Wet track — extended stopping distances' : null,
      ].filter(Boolean),
      consequence: `If trains enter the suspect section before P-Way inspection: potential derailment risk. Emergency stops on wet track will overshoot significantly.`,
      actionable: true,
    })
  } else if (hasConflict && hasCrewRisk) {
    const highestConflict = conflicts.find((c) => c.riskLevel === 'HIGH') ?? conflicts[0]
    const criticalCrew    = crewRisks.find((r) => r.level === 'CRITICAL') ?? crewRisks[0]
    const conflictName    = highestConflict?.trainNames?.[0] ?? 'Train'
    discoveries.push({
      level: 'HIGH',
      title: 'Compound Network Risk Detected',
      signals: [
        `${conflictName} conflict`,
        `${criticalCrew.trainName} crew expiry`,
        hasBlock ? 'Active maintenance block' : null,
      ].filter(Boolean),
      consequence: `May create a ${intelligence.cascade?.estimatedDelayMinutes ?? '30+'}-minute network disruption within the next ${criticalCrew.dutyRemainingMinutes} minutes if unaddressed.`,
      actionable: true,
    })
  }

  // Non-emergency conflict-only discovery
  if (hasConflict && !hasCrewRisk && !isEmergency) {
    const top = conflicts.find((c) => c.riskLevel === 'HIGH') ?? conflicts[0]
    const nameA = top.trainNames?.[0] ?? top.trains?.[0] ?? 'Train A'
    const nameB = top.trainNames?.[1] ?? top.trains?.[1] ?? 'Train B'
    const noActionVals = Object.values(top.ifNoAction ?? {})
    discoveries.push({
      level: top.riskLevel ?? 'MEDIUM',
      title: `Crossing Conflict: ${nameA} vs ${nameB}`,
      signals: [
        top.section ? `Section ${top.section}` : null,
        top.precedence?.ruleId ? `Rule ${top.precedence.ruleId}` : null,
        top.loopAvailable ? `Loop available at Station ${top.loopStation}` : 'No loop available',
      ].filter(Boolean),
      consequence: noActionVals.length > 0
        ? `Without a crossing arrangement: ${noActionVals.join(', ')}.`
        : 'Conflict will cause schedule compression if unresolved.',
      actionable: true,
    })
  }

  // Crew-only discovery — show ALL critical crew, not just first
  if (!hasConflict && hasCrewRisk) {
    const critical = crewRisks.find((r) => r.level === 'CRITICAL') ?? crewRisks[0]
    if (critical) {
      discoveries.push({
        level: crewRisks.filter((r) => r.level === 'CRITICAL').length > 1 ? 'CRITICAL' : 'HIGH',
        title: crewRisks.filter((r) => r.level === 'CRITICAL').length > 1
          ? `${crewRisks.filter((r) => r.level === 'CRITICAL').length} Crews Expiring — Coordination Required`
          : `Crew Duty Expiry: ${critical.trainName}`,
        signals: crewRisks.slice(0, 4).map((r) =>
          `${r.trainName}: ${r.dutyRemainingMinutes} min${r.reliefAvailable ? ` (relief at ${r.reliefStation})` : ' — no relief'}`
        ),
        consequence: crewRisks.filter((r) => r.level === 'CRITICAL').length > 1
          ? `${crewRisks.filter((r) => r.level === 'CRITICAL').length} trains will violate crew duty limits if relief is not coordinated within the next 30–60 minutes. All require Bhusawal relief crews — scheduling conflict likely.`
          : critical.expiresBeforeNext
            ? 'Crew will expire before reaching the next station. Immediate action required.'
            : `Crew expires before destination. Relief must be arranged at Station ${critical.reliefStation}.`,
        actionable: true,
      })
    }
  }

  // Block discovery
  if (hasBlock) {
    const bw = intelligence.blockWindows[0]
    const affectedCount = bw?.windows?.[0]?.affectedTrainCount ?? 0
    if (affectedCount > 0) {
      discoveries.push({
        level: 'MEDIUM',
        title: `Engineering Block Impacting Operations`,
        signals: [
          bw.location ?? 'Unknown location',
          `${affectedCount} train(s) queued`,
          bw.recommendation ? `Better window: ${bw.recommendation.startTime}` : 'No alternative window',
        ],
        consequence: bw.recommendation
          ? `Shifting to the ${bw.recommendation.startTime} window reduces passenger impact by ~${(bw.windows?.[0]?.estimatedDelayMinutes ?? 0) - (bw.recommendation.estimatedDelayMinutes ?? 0)} min.`
          : `Current window affects ${affectedCount} train(s).`,
        actionable: !!bw.recommendation,
      })
    }
  }

  // Department movement block
  if (hasMovingBlock) {
    const blocker = intelligence.deptImpacts.find((d) => d.blocksMovement)
    discoveries.push({
      level: 'MEDIUM',
      title: `Movement Blocked: ${blocker.department} — ${blocker.type}`,
      signals: [
        blocker.department,
        `Until ${blocker.until}`,
        (blocker.affectedTrains?.length) ? `Affects: ${blocker.affectedTrains.join(', ')}` : 'Affected trains pending',
      ],
      consequence: blocker.operationalNote,
      actionable: true,
    })
  }

  // Weather discovery
  const wx = intelligence.weatherImpact
  if (wx?.brakingWarning && conflicts.length > 0) {
    discoveries.push({
      level: 'MEDIUM',
      title: `Weather — ${wx.condition} Reducing Braking Margins`,
      signals: [
        `${wx.rainMm} mm/hr rain`,
        `Visibility ${wx.visibilityKm} km`,
        'Active crossing conflicts in affected section',
      ],
      consequence: wx.brakingWarning,
      actionable: false,
    })
  }

  const DISC_STYLES = {
    HIGH:     { border: 'border-red-800',    bg: 'bg-red-950/20',    badge: 'text-red-400 bg-red-950 border-red-800',     dot: 'bg-red-500'    },
    CRITICAL: { border: 'border-red-800',    bg: 'bg-red-950/20',    badge: 'text-red-400 bg-red-950 border-red-800',     dot: 'bg-red-500'    },
    MEDIUM:   { border: 'border-amber-800',  bg: 'bg-amber-950/20',  badge: 'text-amber-400 bg-amber-950 border-amber-800',dot: 'bg-amber-500'  },
    LOW:      { border: 'border-blue-800',   bg: 'bg-blue-950/20',   badge: 'text-blue-400 bg-blue-950 border-blue-800',   dot: 'bg-blue-500'   },
    WATCH:    { border: 'border-gray-700',   bg: 'bg-gray-900',      badge: 'text-gray-400 bg-gray-800 border-gray-700',   dot: 'bg-gray-500'   },
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Page heading */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-white tracking-tight">AI Discoveries</h2>
        <p className="text-gray-500 text-xs mt-0.5">
          Threshold scanned your territory and identified the following emerging risk patterns.
        </p>
      </div>

      {/* ── AI DISCOVERIES — hero section ── */}
      {discoveries.length > 0 ? (
        <section>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">
            AI Discovered {discoveries.length} Risk Pattern{discoveries.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {discoveries.map((d, i) => {
              const s = DISC_STYLES[d.level] ?? DISC_STYLES.WATCH
              return (
                <div key={i} className={`border rounded-xl overflow-hidden ${s.border} ${s.bg}`}>
                  {/* Discovery header */}
                  <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">{d.title}</p>
                        {/* Contributing signals */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {d.signals.map((sig, j) => (
                            <span key={j} className="text-xs text-gray-400 bg-gray-800/80 border border-gray-700 rounded px-2 py-0.5">
                              {sig}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${s.badge}`}>
                      {d.level}
                    </span>
                  </div>
                  {/* Consequence */}
                  <div className="px-5 pb-4 border-t border-white/5 pt-3">
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">
                      If unaddressed
                    </p>
                    <p className="text-gray-300 text-sm">{d.consequence}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="bg-green-950/20 border border-green-900 rounded-xl px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-green-300 font-bold text-sm">No Risk Patterns Detected</p>
              <p className="text-green-600 text-xs mt-1">
                Threshold scanned all trains, crew states, sections, and constraints.
                No compound risk combinations were identified in the next 30 minutes.
                This is a positive signal — the territory is operating within normal parameters.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Cascade Risk — if unaddressed ── */}
      {intelligence.cascade && (
        <section className="bg-gray-900 border border-red-900/50 rounded-xl px-5 py-4">
          <p className="text-xs font-bold font-mono text-red-500 uppercase tracking-widest mb-2">
            Cascade Risk — Network Impact if No Action Taken
          </p>
          <p className="text-gray-300 text-sm">{intelligence.cascade.summary}</p>
          {intelligence.cascade.trainImpacts?.length > 0 && (
            <div className="mt-3 space-y-1">
              {intelligence.cascade.trainImpacts.map((ti, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{ti.trainName}</span>
                  <span className={ti.addedDelay > 0 ? 'text-red-400 font-mono' : 'text-gray-600 font-mono'}>
                    {ti.delayBefore} min → {ti.delayBefore + ti.addedDelay} min
                    {ti.addedDelay > 0 && <span className="text-red-500 ml-1">(+{ti.addedDelay})</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Supporting Evidence — collapsible detail ── */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer list-none text-xs text-gray-600
          hover:text-gray-400 transition-colors select-none py-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Supporting signal detail — conflicts, crew, blocks, constraints
        </summary>

        <div className="space-y-4 mt-4">

          {/* Conflicts detail */}
          {conflicts.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-800">
                <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">
                  Crossing Conflicts
                </span>
              </div>
              <div className="divide-y divide-gray-800">
                {conflicts.map((c, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="text-white text-sm font-semibold">
                        {c.trainNames[0]} <span className="text-gray-600">vs</span> {c.trainNames[1]}
                        <span className="text-gray-500 text-xs ml-2">· Section {c.section}</span>
                      </p>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded border shrink-0 ${RISK_STYLES[c.riskLevel] ?? RISK_STYLES.WATCH}`}>
                        {c.riskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-blue-400 mb-1.5">
                      Rule {c.precedence?.ruleId}: {c.precedence?.ruleReason}
                    </p>
                    <p className="text-gray-500 text-xs">{c.recommendedAction}</p>
                    {c.loopAvailable && (
                      <p className="text-xs text-green-400 mt-1">✓ Loop available at Station {c.loopStation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Crew risks detail */}
          {crewRisks.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-800">
                <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">
                  Crew Expiry Detail
                </span>
              </div>
              <div className="divide-y divide-gray-800">
                {crewRisks.map((r, i) => (
                  <div key={i} className={`px-4 py-3 border-l-2 ${
                    r.level === 'CRITICAL' ? 'border-red-600' :
                    r.level === 'WARNING'  ? 'border-amber-600' : 'border-blue-600'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm font-semibold">{r.trainName}</p>
                      <span className={`text-xs font-bold ${CREW_LABEL_STYLES[r.level]}`}>{r.level}</span>
                    </div>
                    <p className="text-gray-400 text-xs">{r.recommendedAction}</p>
                    {r.expiresBeforeNext && (
                      <p className="text-red-400 text-xs mt-1">⚠ Expires before next station</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Block windows */}
          {(intelligence.blockWindows ?? []).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-800">
                <span className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">Block Windows</span>
              </div>
              {intelligence.blockWindows.map((bw, i) => (
                <div key={i} className="px-4 py-3">
                  <p className="text-amber-400 text-sm font-semibold mb-2">{bw.location}</p>
                  <div className="space-y-1.5">
                  {(bw.windows ?? []).map((w, j) => (
                      <div key={j} className={`flex justify-between text-xs rounded px-2 py-1.5 ${
                        w.active ? 'bg-amber-950/40 border border-amber-900' : 'bg-gray-800 border border-gray-700'
                      }`}>
                        <span className={w.active ? 'text-amber-300' : 'text-gray-400'}>
                          {w.active ? '▶ ' : ''}{w.startTime}–{w.endTime}
                        </span>
                        <span className={w.estimatedDelayMinutes === 0 ? 'text-green-400' : 'text-amber-400'}>
                          {w.estimatedDelayMinutes === 0 ? 'No delay' : `~${w.estimatedDelayMinutes} min`}
                        </span>
                      </div>
                    ))}
                  </div>
                  {bw.recommendation && (
                    <p className="text-green-400 text-xs mt-2">
                      ✓ Shift to {bw.recommendation.startTime} — {bw.recommendation.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Department constraints */}
          {(intelligence.deptImpacts ?? []).length > 0 && (() => {
            const safety      = intelligence.deptImpacts.filter((d) => d.category === 'Safety')
            const operational = intelligence.deptImpacts.filter((d) => d.category === 'Operational')
            const resource    = intelligence.deptImpacts.filter((d) => d.category === 'Resource')
            const Group = ({ label, color, items }) => items.length === 0 ? null : (
              <div className="mb-3 last:mb-0">
                <p className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${color}`}>{label}</p>
                {items.map((d, i) => (
                  <div key={i} className={`bg-gray-800 border rounded-lg px-3 py-2 mb-1.5 border-l-2 ${
                    d.blocksMovement ? 'border-l-red-600 border-gray-700' : 'border-l-blue-700 border-gray-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className="text-gray-200 text-xs font-semibold">{d.department} — {d.type}</p>
                      <span className={`text-xs font-bold ${d.blocksMovement ? 'text-red-400' : 'text-blue-400'}`}>
                        {d.blocksMovement ? 'BLOCKS' : 'ADVISORY'}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{d.description} · until {d.until}</p>
                  </div>
                ))}
              </div>
            )
            return (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-3">
                  Department Constraints
                </p>
                <Group label="Safety"      color="text-red-400"   items={safety} />
                <Group label="Operational" color="text-amber-400" items={operational} />
                <Group label="Resource"    color="text-blue-400"  items={resource} />
              </div>
            )
          })()}

          {/* Speed restrictions */}
          {(shiftContext.speedRestrictions ?? []).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-2">Speed Restrictions</p>
              {shiftContext.speedRestrictions.map((sr, i) => (
                <p key={i} className="text-xs text-gray-400">
                  <span className="text-red-400 font-semibold">{sr.location}</span> · {sr.limitKmh} km/h until {sr.until} · {sr.reason}
                </p>
              ))}
            </div>
          )}
        </div>
      </details>

      {error && (
        <ErrorBanner message={error} onRetry={retryCount < 2 ? handleProceed : undefined}
          retryCount={retryCount} maxRetries={2} />
      )}

      {loading ? (
        <LoadingSpinner label="Simulating consequences…" />
      ) : (
        <button onClick={handleProceed}
          className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg
            font-bold text-sm tracking-widest uppercase transition-colors shadow-lg shadow-blue-950/40"
        >
          ▶  Simulate Risk Responses
        </button>
      )}
    </div>
  )
}
