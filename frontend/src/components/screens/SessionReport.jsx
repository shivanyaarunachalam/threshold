import { useSessionStore } from '../../store/sessionStore'
import { generateReportText, downloadReport } from '../../utils/generateReport'
import { toISTDate } from '../../utils/time.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ number, title }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold font-mono text-gray-600 bg-gray-800 border border-gray-700 rounded px-2 py-1">
        {String(number).padStart(2, '0')}
      </span>
      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-gray-800 my-8" />
}

function KV({ label, value, valueClass = 'text-gray-300' }) {
  return (
    <div className="flex gap-3 py-0.5">
      <span className="text-xs text-gray-500 w-40 shrink-0 pt-0.5">{label}</span>
      <span className={`text-sm flex-1 ${valueClass}`}>{value || '—'}</span>
    </div>
  )
}

const RISK_BADGE = {
  HIGH:   'text-red-400 bg-red-950 border-red-800',
  MEDIUM: 'text-amber-400 bg-amber-950 border-amber-800',
  WATCH:  'text-blue-400 bg-blue-950 border-blue-800',
}

const SUPPORT_BADGE = {
  Strong:   'text-green-400 bg-green-950 border-green-800',
  Moderate: 'text-amber-400 bg-amber-950 border-amber-800',
  Weak:     'text-gray-500 bg-gray-800 border-gray-700',
}

const TRAIN_TYPE_COLOR = {
  'Rajdhani':       'text-red-400',
  'Vande Bharat':   'text-red-400',
  'Express':        'text-blue-400',
  'Passenger':      'text-gray-400',
  'Container Freight': 'text-yellow-400',
  'Freight':        'text-yellow-400',
  'Departmental':   'text-gray-500',
}

// ── Main component ────────────────────────────────────────────────────────────

export function SessionReport({ onClose }) {
  const {
    shiftContext, intelligence, whatIf,
    recommendation, reEvaluation, auditLog,
  } = useSessionStore()

  const lastEntry     = auditLog[auditLog.length - 1]
  const challenge     = lastEntry?.humanChallenge ?? ''
  const finalDecision = lastEntry?.finalDecision ?? recommendation?.recommendation ?? '—'

  const conflicts   = intelligence?.conflicts   ?? []
  const crewRisks   = intelligence?.crewRisks   ?? []
  const deptImpacts = intelligence?.deptImpacts ?? []
  const blockWindows= intelligence?.blockWindows ?? []
  const options     = whatIf?.options ?? []

  // Fallback recommendation values — use audit log if store object is incomplete
  const recAction  = recommendation?.recommendation
    || (recommendation?.emergencyMode && 'EMERGENCY BLOCK PROTECTION')
    || lastEntry?.aiRecommendation
    || '—'
  const recSummary = recommendation?.summary || lastEntry?.aiRecommendation || '—'
  const trail      = recommendation?.reasoningTrail ?? []
  const confScore  = recommendation?.operationalConfidence?.score
  const confLabel  = confScore >= 85 ? 'HIGH' : confScore >= 65 ? 'MODERATE' : confScore ? 'LOW' : null

  // Only show crew risks that are genuinely critical (< 90 min)
  const criticalCrewRisks = crewRisks.filter((r) => r.dutyRemainingMinutes < 90)

  // Compound primary risk detection
  const inBlockTrain = shiftContext?.trains?.find((t) => t.currentStation === 'In Block')
  const radioLostConstraint = deptImpacts.find((d) => d.description?.toLowerCase().includes('radio contact lost') || d.type?.toLowerCase().includes('radio'))
  const isEmergency = intelligence?.emergencyMode || conflicts.some((c) => c.type === 'EMERGENCY_HALT')

  function handleDownload() {
    const text = generateReportText({
      shiftContext, intelligence, whatIf,
      recommendation, reEvaluation, challenge, auditLog,
    })
    downloadReport(text, `threshold-report-${toISTDate()}.txt`)
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur overflow-y-auto">

      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-white font-bold text-sm tracking-tight">Shift Decision Report</span>
          <span className="text-gray-600 text-xs font-mono">· Threshold v2</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white text-xs
              font-bold uppercase tracking-widest px-4 py-2 rounded transition-colors"
          >
            ↓ Download .txt
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xs font-medium px-3 py-2
              rounded hover:bg-gray-800 transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Title */}
        <div className="mb-10">
          <p className="text-xs text-gray-600 font-mono uppercase tracking-widest mb-2">
            Threshold Shift Decision Report
          </p>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xl font-bold text-white leading-tight">
              Final Decision: <span className="text-green-400">{finalDecision}</span>
            </h2>
            <span className="text-xs text-gray-600 font-mono shrink-0">{lastEntry?.timestamp}</span>
          </div>
        </div>

        {/* ── Section 1: Shift Context ── */}
        <SectionHeader number={1} title="Shift Context & Handover Note" />
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4 space-y-1">
          <KV label="Shift Start" value={shiftContext?.shiftStart} />
          <KV label="Active Trains" value={`${shiftContext?.trains?.length ?? 0} trains in territory`} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Handover Note</p>
          {(shiftContext?.handoverNote ?? '').split('\n').filter(Boolean).map((line, i) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <span className="text-gray-600 shrink-0">·</span>
              <p className="text-gray-300 text-sm">{line}</p>
            </div>
          ))}
        </div>

        {/* Train table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Active Trains</span>
          </div>
          {(shiftContext?.trains ?? []).map((t) => (
            <div key={t.trainNo} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 last:border-0">
              <span className="font-mono text-sm text-white w-20 shrink-0">{t.trainNo}</span>
              <span className="text-gray-300 text-sm flex-1">{t.trainName}</span>
              <span className={`text-xs font-semibold w-28 shrink-0 ${TRAIN_TYPE_COLOR[t.trainType] ?? 'text-gray-400'}`}>
                {t.trainType}
              </span>
              <span className={`text-xs font-bold w-20 text-right shrink-0 ${
                t.delayMinutes === 0 ? 'text-green-400' :
                t.delayMinutes <= 10 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {t.delayMinutes === 0 ? 'On Time' : `+${t.delayMinutes} min`}
              </span>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── Section 2: Advance Plot ── */}
        <SectionHeader number={2} title="Advance Plot Analysis" />

        {/* Situation summary */}
        <div className={`rounded-xl border px-4 py-3 mb-4 ${
          conflicts.length === 0 && crewRisks.length === 0
            ? 'bg-green-950/30 border-green-900'
            : 'bg-amber-950/30 border-amber-800'
        }`}>
          <p className={`text-sm font-semibold ${
            conflicts.length === 0 && crewRisks.length === 0 ? 'text-green-300' : 'text-amber-300'
          }`}>
            {intelligence?.situationCheck?.explanation ?? '—'}
          </p>
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Crossing Conflicts</p>
            {conflicts.map((c, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {c.trainNames[0]} <span className="text-gray-600">vs</span> {c.trainNames[1]}
                    </p>
                    <p className="text-gray-500 text-xs">Section {c.section}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${RISK_BADGE[c.riskLevel] ?? RISK_BADGE.MEDIUM}`}>
                    {c.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-blue-400 mb-1">
                  Rule {c.precedence?.ruleId}: {c.precedence?.ruleReason}
                </p>
                <p className="text-gray-400 text-xs">{c.recommendedAction}</p>
              </div>
            ))}
          </div>
        )}

        {/* Crew risks — only critical */}
        {criticalCrewRisks.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="text-xs text-red-500 uppercase tracking-widest font-bold">Critical Crew Risks</p>
            {criticalCrewRisks.map((r, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white font-semibold text-sm">{r.trainName}</p>
                  <span className={`text-xs font-bold ${
                    r.level === 'CRITICAL' ? 'text-red-400' :
                    r.level === 'WARNING'  ? 'text-amber-400' : 'text-blue-400'
                  }`}>{r.level}</span>
                </div>
                <p className="text-gray-400 text-xs">{r.recommendedAction}</p>
              </div>
            ))}
          </div>
        )}

        {/* Dept constraints */}
        {deptImpacts.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Department Constraints</p>
            {deptImpacts.map((d, i) => (
              <div key={i} className={`bg-gray-900 border rounded-xl px-4 py-3 border-l-2 ${
                d.blocksMovement ? 'border-l-red-600 border-gray-800' : 'border-l-blue-700 border-gray-800'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white text-sm font-semibold">{d.department} — {d.type}</p>
                  <span className={`text-xs font-bold ${d.blocksMovement ? 'text-red-400' : 'text-blue-400'}`}>
                    {d.blocksMovement ? 'BLOCKS MOVEMENT' : 'ADVISORY'}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">{d.description}</p>
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* ── Section 3: Block Windows ── */}
        {blockWindows.length > 0 && (
          <>
            <SectionHeader number={3} title="Engineering Block Window Analysis" />
            {blockWindows.map((bw, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3">
                <p className="text-amber-400 text-sm font-semibold mb-2">{bw.location}</p>
                <div className="space-y-1.5">
                  {bw.windows.map((w, j) => (
                    <div key={j} className={`flex items-center justify-between text-xs rounded px-2 py-1.5 ${
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
                    ✓ Recommended: shift to {bw.recommendation.startTime} — {bw.recommendation.note}
                  </p>
                )}
              </div>
            ))}
            <Divider />
          </>
        )}

        {/* ── Section 4: What-If Options ── */}
        <SectionHeader number={blockWindows.length > 0 ? 4 : 3} title="What-If Analysis" />
        <div className="space-y-3 mb-0">
          {options.map((opt, i) => (
            <div key={i} className={`bg-gray-900 border border-gray-800 rounded-xl p-4 ${
              opt.id === 'do_nothing' ? 'opacity-70' : ''
            }`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-white font-semibold text-sm">{opt.action}</p>
                  {opt.precedenceRule && (
                    <span className="text-xs font-mono text-blue-500">Rule {opt.precedenceRule}</span>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${SUPPORT_BADGE[opt.supportLevel] ?? SUPPORT_BADGE.Weak}`}>
                  {opt.supportLevel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {Object.entries({
                  'Passenger':   opt.consequences?.passengerPunctuality,
                  'Freight':     opt.consequences?.freightThroughput,
                  'Crew':        opt.consequences?.crewCompliance,
                  'Cascade':     opt.consequences?.cascadeImpact,
                }).map(([label, val]) => (
                  <div key={label}>
                    <span className="text-xs text-gray-600">{label}: </span>
                    <span className="text-xs text-gray-400">{val ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── Section 5: Recommendation ── */}
        <SectionHeader number={blockWindows.length > 0 ? 5 : 4} title="AI Recommendation & Reasoning Trail" />

        {/* Primary compound risk — emergency only */}
        {isEmergency && inBlockTrain && radioLostConstraint && (
          <div className="bg-red-950/20 border border-red-800 rounded-xl px-4 py-3 mb-4">
            <p className="text-red-400 font-bold text-xs uppercase tracking-widest mb-1">Primary Compound Risk</p>
            <p className="text-red-300 text-sm leading-relaxed">
              <span className="font-semibold">{inBlockTrain.trainName}</span> is inside the affected block with radio contact lost.
              Position unconfirmed — cannot determine whether this train has already entered the suspect fracture zone.
              All movement authority suspended until location is physically confirmed.
            </p>
          </div>
        )}

        <div className={`rounded-xl p-5 mb-4 ${isEmergency ? 'bg-red-950/20 border border-red-800' : 'bg-gray-900 border border-blue-900'}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isEmergency ? 'text-red-500' : 'text-blue-500'}`}>
            Recommended Action
          </p>
          <p className={`text-xl font-bold mb-2 ${isEmergency ? 'text-red-300' : 'text-blue-300'}`}>{recAction}</p>
          {confLabel && (
            <p className="text-xs text-gray-500 mb-2">
              Operational Confidence:{' '}
              <span className={confScore >= 85 ? 'text-green-400' : confScore >= 65 ? 'text-amber-400' : 'text-red-400'}>
                {confLabel}{confScore ? ` (${confScore}%)` : ''}
              </span>
            </p>
          )}
          <p className="text-gray-400 text-sm">{recSummary}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">
            Reasoning Trail {trail.length === 0 ? '— Not available' : `(${trail.length} steps)`}
          </p>
          {trail.length === 0 ? (
            <p className="text-gray-600 text-sm">
              Reasoning trail was not captured for this decision.
              The recommendation above was derived from the AI action plan step recorded in the shift log.
            </p>
          ) : trail.map((step, i, arr) => (
            <div key={i} className="flex gap-3 mb-4 last:mb-0">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                  {i + 1}
                </div>
                {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-800 mt-1" />}
              </div>
              <div className="pb-1">
                <p className="text-blue-400 text-xs font-semibold mb-0.5">{step.sourceReference}</p>
                <p className="text-gray-300 text-sm">{step.rationale}</p>
                <p className="text-gray-600 text-xs mt-1 italic">{step.contribution}</p>
              </div>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── Section 6: Challenge & Re-evaluation ── */}
        <SectionHeader number={blockWindows.length > 0 ? 6 : 5} title="Controller Challenge & Re-evaluation" />
        {challenge ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Controller Challenge</p>
            <p className="text-gray-300 text-sm italic">"{challenge}"</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
            <p className="text-gray-600 text-sm">No challenge submitted.</p>
          </div>
        )}
        {reEvaluation ? (
          <div className="bg-gray-900 border border-purple-900 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-xs text-purple-400 uppercase tracking-widest">Re-evaluation</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                reEvaluation.changed
                  ? 'text-amber-400 bg-amber-950 border-amber-800'
                  : 'text-green-400 bg-green-950 border-green-800'
              }`}>
                {reEvaluation.changed ? 'CHANGED' : 'UPHELD'}
              </span>
            </div>
            <div className="flex gap-6 mb-3 text-sm">
              <div>
                <p className="text-gray-600 text-xs mb-0.5">Original</p>
                <p className="text-gray-400 font-semibold">{recAction}</p>
              </div>
              <div>
                <p className="text-gray-600 text-xs mb-0.5">After Challenge</p>
                <p className="text-purple-300 font-semibold">{reEvaluation.recommendation}</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{reEvaluation.explanation}</p>
          </div>
        ) : challenge ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Challenge Submitted — Awaiting Re-evaluation</p>
            <p className="text-gray-400 text-sm italic">"{challenge}"</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-600 text-sm">No challenge was submitted.</p>
          </div>
        )}

        <Divider />

        {/* ── Section 7: Final Decision ── */}
        <SectionHeader number={blockWindows.length > 0 ? 7 : 6} title="Final Decision" />
        <div className="bg-green-950 border border-green-800 rounded-xl p-6">
          <p className="text-xs text-green-600 uppercase tracking-widest mb-2">Controller-Confirmed Decision</p>
          <p className="text-xl font-bold text-green-400 mb-2">{finalDecision}</p>
          <p className="text-green-700 text-xs font-mono">{lastEntry?.timestamp}</p>
          <p className="text-green-600 text-xs mt-3">
            Confirmed with full awareness of the AI recommendation, precedence rules, and consequence simulations.
          </p>
        </div>

        <div className="h-16" />
      </div>
    </div>
  )
}
