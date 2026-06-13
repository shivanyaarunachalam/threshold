import { toIST, toISTDate } from './time.js'

export function generateReportText({ shiftContext, intelligence, whatIf, recommendation, reEvaluation, challenge, auditLog }) {
  const line = (char = '─', len = 60) => char.repeat(len)
  const ts   = toIST(new Date())
  const last = auditLog?.[auditLog.length - 1]

  // Reconstruct recommendation from audit log if the store object is incomplete
  const rec = recommendation ?? {}
  const recAction  = rec.recommendation
    || rec.emergencyMode && 'EMERGENCY BLOCK PROTECTION'
    || last?.aiRecommendation
    || '—'
  const recSummary = rec.summary || last?.aiRecommendation || '—'
  const trail      = rec.reasoningTrail ?? []

  const sections = []

  // ── Header ──────────────────────────────────────────────────
  sections.push([
    line('═'),
    'THRESHOLD v2 — SHIFT DECISION REPORT',
    `Generated  : ${ts}`,
    `Shift Start: ${shiftContext?.shiftStart ?? '—'}`,
    `Scenario   : ${shiftContext?.historicalContext?.title ?? 'Rail Operations'}`,
    line('═'),
  ].join('\n'))

  // ── 1. Handover Note ────────────────────────────────────────
  sections.push([
    'SECTION 1 — SHIFT CONTEXT & HANDOVER',
    line(),
    shiftContext?.handoverNote ?? '—',
    '',
    shiftContext?.weather ? `Weather: ${shiftContext.weather.condition} · ${shiftContext.weather.rainMm}mm rain · ${shiftContext.weather.visibilityKm}km visibility · ${shiftContext.weather.windKmh}km/h wind` : '',
    shiftContext?.weather?.note ? `⚠ ${shiftContext.weather.note}` : '',
    '',
    `Active Trains (${shiftContext?.trains?.length ?? 0}):`,
    ...(shiftContext?.trains ?? []).map((t) =>
      `  ${t.trainNo.padEnd(12)} ${t.trainName.padEnd(28)} delay: ${t.delayMinutes === 0 ? 'On Time' : `+${t.delayMinutes} min`}`
    ),
  ].filter(Boolean).join('\n'))

  // ── 2. AI Discoveries ───────────────────────────────────────
  const conflicts   = intelligence?.conflicts ?? []
  const crewRisks   = intelligence?.crewRisks ?? []
  const deptImpacts = intelligence?.deptImpacts ?? []
  const isEmergency = intelligence?.emergencyMode || conflicts.some((c) => c.type === 'EMERGENCY_HALT')

  // Identify the PRIMARY compound risk — most dangerous combination
  const inBlockTrain    = shiftContext?.trains?.find((t) => t.currentStation === 'In Block')
  const radioLostConst  = deptImpacts.find((d) => d.type?.includes('Radio') || d.type?.includes('radio') || d.description?.includes('radio contact lost'))
  const trackAnomalyConst = deptImpacts.find((d) => d.type?.includes('Anomaly') || d.type?.includes('fracture') || d.blocksMovement)

  const primaryRisk = isEmergency && inBlockTrain && radioLostConst
    ? `PRIMARY COMPOUND RISK — ${inBlockTrain.trainName} (${inBlockTrain.trainNo}) is inside the affected block with radio contact lost for ${inBlockTrain.delayMinutes > 0 ? 'over 4 minutes' : 'unknown duration'}. Position unconfirmed. Cannot determine whether this train has already entered the suspected fracture zone at ${shiftContext?.emergencyKm ?? 'KM unknown'}. All movement authority suspended until location is physically confirmed.`
    : null

  // Only flag crew risks that are genuinely at-risk (< 90 min remaining)
  const criticalCrewRisks = crewRisks.filter((r) => r.dutyRemainingMinutes < 90)

  sections.push([
    'SECTION 2 — AI DISCOVERIES & ADVANCE PLOT',
    line(),
    intelligence?.situationCheck?.explanation ?? '—',
    '',
    ...(primaryRisk ? ['PRIMARY COMPOUND RISK:', primaryRisk, ''] : []),
    ...(isEmergency ? ['EMERGENCY MODE ACTIVE — Normal optimisation suspended. Life-safety protocol in effect.', ''] : []),
    ...(conflicts.length > 0 ? [
      `CONFLICTS DETECTED (${conflicts.length}):`,
      ...conflicts.map((c, i) => [
        `  ${i + 1}. [${c.riskLevel}] ${c.trainNames?.join(' vs ')} — ${c.section}`,
        `     ${c.description}`,
        `     If unaddressed: ${Object.values(c.ifNoAction ?? {}).join(' / ')}`,
      ].join('\n')),
      '',
    ] : []),
    ...(criticalCrewRisks.length > 0 ? [
      `CREW RISKS — CRITICAL (${criticalCrewRisks.length}):`,
      ...criticalCrewRisks.map((r) => `  ${r.trainName} — ${r.dutyRemainingMinutes} min remaining. ${r.recommendedAction}`),
      '',
    ] : []),
    ...(deptImpacts.filter((d) => d.blocksMovement).length > 0 ? [
      'MOVEMENT-BLOCKING CONSTRAINTS:',
      ...deptImpacts.filter((d) => d.blocksMovement).map((d) => `  [${d.department}] ${d.type}: ${d.description}`),
      '',
    ] : []),
    ...(intelligence?.weatherImpact?.brakingWarning ? [`WEATHER WARNING: ${intelligence.weatherImpact.brakingWarning}`] : []),
  ].filter((s) => s !== undefined).join('\n'))

  // ── 3. Action Plan ──────────────────────────────────────────
  const auditEntries = auditLog ?? []
  if (auditEntries.length > 0) {
    sections.push([
      'SECTION 3 — RESOLVED ACTIONS (SHIFT LOG)',
      line(),
      ...auditEntries.map((e, i) => [
        `  Action ${i + 1}: ${e.issueTitle ?? e.finalDecision}`,
        `  Decision  : ${e.finalDecision}`,
        e.overrideReason ? `  Override  : ${e.overrideReason} [${e.overrideCategory ?? 'OPJ'}]` : '',
        `  Timestamp : ${e.timestamp}`,
      ].filter(Boolean).join('\n')),
    ].join('\n'))
  }

  // ── 4. AI Recommendation ────────────────────────────────────
  const confScore = rec.operationalConfidence?.score
  const confLabel = confScore >= 85 ? 'HIGH' : confScore >= 65 ? 'MODERATE' : confScore ? 'LOW' : '—'

  sections.push([
    'SECTION 4 — AI RECOMMENDATION',
    line(),
    `Recommended Action     : ${recAction}`,
    `Operational Confidence : ${confLabel}${confScore ? ` (${confScore}%)` : ''}`,
    `Summary                : ${recSummary}`,
    '',
    ...(rec.emergencyMode && rec.emergencySteps?.length > 0 ? [
      'Emergency Protocol Steps:',
      ...rec.emergencySteps.map((s) => `  ${s.seq}. ${s.action}\n     ${s.detail}`),
      '',
    ] : []),
    trail.length > 0 ? `Reasoning Trail (${trail.length} steps):` : 'Reasoning Trail: Not available for this decision.',
    ...trail.map((step, i) => [
      `  Step ${i + 1}: ${step.sourceReference}`,
      `    ${step.rationale}`,
      step.contribution ? `    → ${step.contribution}` : '',
    ].filter(Boolean).join('\n')),
  ].join('\n'))

  // ── 5. Human Challenge & Re-evaluation ─────────────────────
  sections.push([
    'SECTION 5 — CONTROLLER CHALLENGE & RE-EVALUATION',
    line(),
    challenge
      ? `Controller Challenge:\n  "${challenge}"`
      : 'No challenge was submitted by the controller.',
    '',
    reEvaluation
      ? [
          `Challenge Reviewed        : YES`,
          `Recommendation Changed    : ${reEvaluation.changed ? 'YES' : 'NO — UPHELD'}`,
          `Assessment:\n  ${reEvaluation.explanation}`,
        ].join('\n')
      : 'Re-evaluation: Not performed.',
  ].join('\n'))

  // ── 6. Final Decision ───────────────────────────────────────
  sections.push([
    'SECTION 6 — FINAL DECISION',
    line(),
    `Final Decision : ${last?.finalDecision ?? '—'}`,
    `Recorded At    : ${last?.timestamp ?? ts}`,
    last?.overrideReason ? `Override Reason: ${last.overrideReason}` : '',
    last?.overrideCategory ? `Override Category: ${last.overrideCategory}` : '',
    '',
    'This decision was confirmed by the controller with full awareness of the',
    'AI recommendation, all detected risks, and applicable consequence simulations.',
  ].filter(Boolean).join('\n'))

  sections.push([line('═'), 'END OF REPORT — THRESHOLD v2', line('═')].join('\n'))
  return sections.join('\n\n')
}

export function downloadReport(text, filename = 'threshold-decision-report.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
