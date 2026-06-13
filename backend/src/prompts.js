'use strict'

const SYSTEM_PROMPT = `You are Threshold — an AI Operational Intelligence system for rail safety.
You analyze shift contexts, detect compound risk patterns, and generate structured recommendations.

EMERGENCY MODE (highest priority):
Activate if ANY of these exist: unverified track anomaly, train in block with lost radio contact, safety-critical infrastructure failure with trains approaching.
In Emergency Mode: skip all scheduling optimisation. Output Emergency Block Protection steps only.
Steps: 1) Stop all approaching trains. 2) Establish contact with in-block train. 3) Cancel movement authority. 4) Dispatch inspection. 5) Resume only after clearance.

RULES:
- Never invent signals not present in the input.
- Every risk signal needs evidence from at least 2 separate input fields.
- Normal conditions do not generate alerts.
- Use Strong/Moderate/Weak instead of percentages.
- Zero signals is valid — never fabricate to fill a response.
- No hallucinated details.
- Unknown situations must escalate clearly.

Always respond with valid JSON matching the requested schema exactly. No markdown, no extra text.`

// ── Compact context serialiser ────────────────────────────────────────────────
// Sends only what Claude needs — keeps prompt small and fast.

function serializeContext(ctx) {
  const trains = (ctx.trains ?? []).map((t) => ({
    no: t.trainNo,
    name: t.trainName,
    type: t.trainType,
    priority: t.priority,
    from: t.currentStation,
    to: t.nextStation,
    speed: t.currentSpeedKmh,
    delay: t.delayMinutes,
    minsToHazard: ctx.minutesToImpact?.[t.trainNo] ?? null,
  }))

  const crew = (ctx.crew ?? []).map((c) => ({
    train: c.trainNo,
    dutyMins: c.dutyRemainingMinutes,
    relief: c.reliefAvailable,
    reliefAt: c.reliefStation,
    reliefEta: c.reliefEtaMinutes,
  }))

  const constraints = (ctx.departmentConstraints ?? []).map((d) => ({
    dept: d.department,
    type: d.type,
    desc: d.description,
    until: d.until,
    blocksMovement: d.blocksMovement,
  }))

  const blocks = (ctx.maintenanceBlocks ?? []).map((m) => ({
    id: m.id,
    location: m.location,
    start: m.startTime,
    end: m.endTime,
    dept: m.department,
  }))

  const restrictions = (ctx.speedRestrictions ?? []).map((s) => ({
    location: s.location,
    limit: s.limitKmh,
    reason: s.reason,
  }))

  const weather = ctx.weather ? {
    condition: ctx.weather.condition,
    rainMm: ctx.weather.rainMm,
    visKm: ctx.weather.visibilityKm,
    windKmh: ctx.weather.windKmh,
    note: ctx.weather.note,
  } : null

  return {
    shiftStart: ctx.shiftStart,
    emergency: ctx.emergencyActive ? { type: ctx.emergencyType, km: ctx.emergencyKm } : null,
    trains,
    crew,
    constraints,
    blocks,
    restrictions,
    weather,
    loops: (ctx.stations ?? []).map((s) => ({ id: s.id, name: s.name, free: s.totalLoops - s.occupiedLoops })),
  }
}

// ── Prompts ───────────────────────────────────────────────────────────────────

function buildAnalyzePrompt(shiftContext) {
  const ctx = serializeContext(shiftContext)

  return `Analyze this rail shift. Check for emergency conditions first.

SHIFT:
${JSON.stringify(ctx)}

Return ONLY this JSON:
{
  "emergencyMode": boolean,
  "emergencyReason": "string or null",
  "conflicts": [{ "type": "HEAD_ON|OVERTAKE|EMERGENCY_HALT", "trains": [], "trainNames": [], "section": "", "riskLevel": "HIGH|MEDIUM", "description": "", "recommendedAction": "", "ifNoAction": {}, "loopAvailable": boolean, "loopStation": "string or null", "precedence": { "ruleId": "", "ruleReason": "", "pass": null, "loop": null } }],
  "crewRisks": [{ "trainNo": "", "trainName": "", "level": "CRITICAL|WARNING|WATCH", "dutyRemainingMinutes": 0, "minutesToNextStation": 0, "expiresBeforeNext": boolean, "reliefAvailable": boolean, "reliefStation": "string or null", "recommendedAction": "" }],
  "deptImpacts": [{ "department": "", "category": "Safety|Operational|Resource", "type": "", "description": "", "until": "", "blocksMovement": boolean, "affectedTrains": [], "operationalNote": "" }],
  "blockWindows": [],
  "weatherImpact": { "condition": "", "brakingWarning": "string or null", "affectsConflicts": boolean },
  "situationCheck": { "classification": "within known patterns|unknown/novel|emergency", "explanation": "" },
  "cascade": { "affectedTrainCount": 0, "estimatedDelayMinutes": 0, "summary": "", "trainImpacts": [{ "trainNo": "", "trainName": "", "addedDelay": 0, "delayBefore": 0, "delayAfter": 0, "impact": "" }] }
}`
}

function buildActionPlanPrompt(shiftContext, intelligence) {
  const ctx = serializeContext(shiftContext)
  const intel = {
    emergency: intelligence.emergencyMode,
    conflicts: (intelligence.conflicts ?? []).map((c) => ({ trains: c.trains, section: c.section, risk: c.riskLevel, action: c.recommendedAction })),
    crewRisks: (intelligence.crewRisks ?? []).map((r) => ({ train: r.trainNo, level: r.level, dutyMins: r.dutyRemainingMinutes, relief: r.reliefAvailable, reliefAt: r.reliefStation })),
    deptBlocks: (intelligence.deptImpacts ?? []).filter((d) => d.blocksMovement).map((d) => ({ dept: d.department, type: d.type, until: d.until })),
  }

  return `Generate a prioritised action plan. Emergency items first. Crew/scheduling issues must not rank above life-safety.
IMPORTANT: Return a MAXIMUM of 5 items. Keep each description under 80 words. Keep hiddenWeakness under 40 words.

SHIFT: ${JSON.stringify(ctx)}
INTELLIGENCE: ${JSON.stringify(intel)}

Return ONLY this JSON:
{
  "items": [{
    "id": "string",
    "seq": 1,
    "priority": "CRITICAL|HIGH|MEDIUM|LOW",
    "issueType": "string",
    "title": "string (max 12 words)",
    "description": "string (max 80 words)",
    "recommendedAction": "string (max 60 words)",
    "precedenceRule": "string or null",
    "ruleReason": "string (max 30 words)",
    "consequences": { "passengerPunctuality": "string (max 20 words)", "freightThroughput": "string (max 15 words)", "crewCompliance": "string (max 20 words)", "cascadeImpact": "string (max 20 words)", "departmentImpact": "string (max 20 words)" },
    "hiddenWeakness": "string (max 40 words)",
    "resolved": false
  }]
}`
}

function buildIssueRecommendationPrompt(shiftContext, intelligence, issue) {
  const ctx = serializeContext(shiftContext)
  const isEmergency = issue.issueType?.includes('Emergency') || issue.precedenceRule === 'PR-EMERGENCY'

  if (isEmergency) {
    return `EMERGENCY MODE. Generate Emergency Block Protection recommendation.

ISSUE: ${issue.title}
CONTEXT: ${JSON.stringify(ctx)}
EMERGENCY KM: ${shiftContext.emergencyKm ?? 'unknown'}
TRAINS APPROACHING: ${JSON.stringify((shiftContext.trains ?? []).filter((t) => t.currentSpeedKmh > 0 && t.currentStation !== 'In Block').map((t) => ({ no: t.trainNo, name: t.trainName, minsToHazard: shiftContext.minutesToImpact?.[t.trainNo] })))}

Return ONLY this JSON:
{
  "emergencyMode": true,
  "recommendation": "EMERGENCY BLOCK PROTECTION",
  "summary": "string",
  "emergencySteps": [{ "seq": 1, "action": "string", "detail": "string" }],
  "reasoningTrail": [{ "sourceReference": "string", "rationale": "string", "contribution": "string" }],
  "operationalConfidence": { "score": 45, "factors": ["string"] },
  "crewAvailability": [],
  "controlOrder": { "number": "CO-EMRG-001", "time": "${shiftContext.shiftStart}", "to": [], "instruction": "string", "detail": "string", "precedenceRule": "PR-EMERGENCY", "issuedBy": "Threshold AI", "status": "DRAFT" }
}`
  }

  return `Generate a recommendation for this operational issue. Ground every step in actual data.
Use plain English labels for sourceReference — e.g. "Rajdhani 12723 — 11 min to hazard", not raw data keys.

ISSUE: ${JSON.stringify({ title: issue.title, type: issue.issueType, action: issue.recommendedAction, rule: issue.precedenceRule })}
CONTEXT: ${JSON.stringify(ctx)}
ACTIVE RISKS: conflicts=${intelligence.conflicts?.length ?? 0}, crewRisks=${intelligence.crewRisks?.length ?? 0}

Return ONLY this JSON:
{
  "emergencyMode": false,
  "recommendation": "string",
  "summary": "string",
  "reasoningTrail": [{ "sourceReference": "plain English label", "rationale": "what this means operationally", "contribution": "how it affects the recommendation" }],
  "operationalConfidence": { "score": 80, "factors": ["string"] },
  "crewAvailability": [],
  "controlOrder": { "number": "string", "time": "string", "to": [], "instruction": "string", "detail": "string", "precedenceRule": "string or null", "issuedBy": "Threshold AI", "status": "DRAFT" }
}`
}

function buildReEvaluatePrompt(shiftContext, intelligence, actionPlan, recommendation, challenge) {
  const isEmergency = shiftContext?.emergencyActive || intelligence?.emergencyMode ||
    (intelligence?.conflicts ?? []).some((c) => c.type === 'EMERGENCY_HALT')

  return `A controller has challenged the AI recommendation. You MUST provide a substantive response — never say "no re-evaluation performed".

Evaluate whether the challenge introduces new safety-relevant information.
If emergency mode is active, explain clearly why it cannot be overridden — do not just refuse.
If the challenge raises a valid operational point, acknowledge it explicitly before explaining why the recommendation stands or changes.

ORIGINAL RECOMMENDATION: ${recommendation.recommendation ?? 'EMERGENCY BLOCK PROTECTION'}
EMERGENCY MODE ACTIVE: ${isEmergency}
CHALLENGE: "${challenge}"
ACTIVE CONFLICTS: ${(intelligence?.conflicts ?? []).length}
DEPT CONSTRAINTS BLOCKING: ${(intelligence?.deptImpacts ?? []).filter((d) => d.blocksMovement).length}

Return ONLY this JSON:
{
  "recommendation": "string — the final recommendation after considering the challenge",
  "changed": boolean,
  "explanation": "string — 2-4 sentences. Acknowledge the challenge directly. If unchanged: explain why the safety concern outweighs the challenge. If changed: explain what new information drove the change."
}`
}

module.exports = {
  SYSTEM_PROMPT,
  buildAnalyzePrompt,
  buildActionPlanPrompt,
  buildIssueRecommendationPrompt,
  buildReEvaluatePrompt,
}
