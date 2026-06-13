/**
 * Threshold v2 — Mock AI Engine
 *
 * Replaces the 7-field signal detectors with shift-context-aware logic:
 *   - detectConflicts: which trains will meet without a loop solution
 *   - detectCrewRisk:  which crews expire before reaching destination
 *   - detectCascade:   downstream delay if worst conflict is unresolved
 *   - generateWhatIfOptions: dynamic action cards for the actual situation
 *
 * Same rules as v1: only report what the data says. Zero invented events.
 */

import { getCrewStatus, ACTION_TYPES } from '../types/entities.js'

const DELAY_MS = 1400
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesToHHMM(base, addMinutes) {
  const [h, m] = base.split(':').map(Number)
  const total = h * 60 + m + addMinutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function hmToMinutes(hhmm) {
  if (!hhmm) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Estimate minutes until a train reaches a given station
// Uses distance from timetable comparison (simplified for mock)
function etaMinutes(train, targetStationId, timetable) {
  const entry = timetable.find(
    (t) => t.trainNo === train.trainNo && t.stationId === targetStationId
  )
  if (!entry?.scheduledArrival) return null
  const now = hmToMinutes('14:00')  // shift start = current time for demo
  const arrival = hmToMinutes(entry.scheduledArrival)
  const eta = arrival - now + train.delayMinutes
  return Math.max(0, eta)
}

// ── Conflict Detection ────────────────────────────────────────────────────────

function detectConflicts(ctx) {
  const { trains, stations, timetable } = ctx
  const conflicts = []

  // Find trains heading to the same next station at similar times
  const trainsByNextStation = {}
  for (const train of trains) {
    if (!trainsByNextStation[train.nextStation]) trainsByNextStation[train.nextStation] = []
    trainsByNextStation[train.nextStation].push(train)
  }

  for (const [stationId, stationTrains] of Object.entries(trainsByNextStation)) {
    if (stationTrains.length < 2) continue

    const station = stations.find((s) => s.id === stationId)
    const freeLoops = station ? station.loops - station.loopsOccupied : 0

    // Compare each pair
    for (let i = 0; i < stationTrains.length; i++) {
      for (let j = i + 1; j < stationTrains.length; j++) {
        const a = stationTrains[i]
        const b = stationTrains[j]

        const etaA = etaMinutes(a, stationId, timetable)
        const etaB = etaMinutes(b, stationId, timetable)

        if (etaA === null || etaB === null) continue

        const gap = Math.abs(etaA - etaB)

        // Trains arriving within 20 minutes of each other on a single/limited section
        if (gap <= 20) {
          const higher = a.priority >= b.priority ? a : b
          const lower  = a.priority >= b.priority ? b : a
          const riskLevel = freeLoops === 0 ? 'HIGH' : gap <= 8 ? 'HIGH' : 'MEDIUM'

          conflicts.push({
            trainA:       higher.trainNo,
            trainB:       lower.trainNo,
            location:     station?.name ?? stationId,
            stationId,
            riskLevel,
            minutesUntil: Math.min(etaA, etaB),
            freeLoops,
            description:  `${higher.trainName ?? higher.trainNo} (priority ${higher.priority}) and ${lower.trainName ?? lower.trainNo} (priority ${lower.priority}) both arrive at ${station?.name ?? stationId} within ${gap} min. ${freeLoops === 0 ? 'No loops available.' : `${freeLoops} loop${freeLoops > 1 ? 's' : ''} available.`}`,
          })
        }
      }
    }
  }

  return conflicts
}

// ── Crew Risk Detection ───────────────────────────────────────────────────────

function detectCrewRisks(ctx) {
  const { trains, crew, timetable } = ctx
  const warnings = []

  for (const crewRecord of crew) {
    const train = trains.find((t) => t.trainNo === crewRecord.trainNo)
    if (!train) continue

    const destEta = etaMinutes(train, train.destination, timetable)
    if (destEta === null) continue

    const margin = crewRecord.remainingMinutes - destEta

    if (crewRecord.remainingMinutes <= 120) {
      warnings.push({
        trainNo:          crewRecord.trainNo,
        trainName:        train.trainName ?? crewRecord.trainNo,
        remainingMinutes: crewRecord.remainingMinutes,
        etaMinutes:       destEta,
        marginMinutes:    margin,
        status:           getCrewStatus(crewRecord.remainingMinutes),
        reliefAvailable:  crewRecord.reliefAvailable,
        reliefStationId:  crewRecord.reliefStationId,
        willExpire:       margin < 0,
        description:      margin < 0
          ? `Crew will exceed duty by ${Math.abs(margin)} min. Relief ${crewRecord.reliefAvailable ? `available at ${crewRecord.reliefStationId}` : 'NOT available'}.`
          : `Crew remaining: ${crewRecord.remainingMinutes} min. ETA destination: ${destEta} min. Margin: ${margin} min.`,
      })
    }
  }

  return warnings.sort((a, b) => a.remainingMinutes - b.remainingMinutes)
}

// ── Cascade Risk ──────────────────────────────────────────────────────────────

function calculateCascade(conflicts, trains) {
  if (conflicts.length === 0) return null

  const worst = conflicts.find((c) => c.riskLevel === 'HIGH') ?? conflicts[0]
  const higherPriority = trains.find((t) => t.trainNo === worst.trainA)
  const lowerPriority  = trains.find((t) => t.trainNo === worst.trainB)

  if (!higherPriority || !lowerPriority) return null

  // Simplified cascade: lower-priority train delays → affects trains behind it
  const directDelay    = 18  // realistic loop wait in minutes
  const downstreamRisk = conflicts.length > 1 ? 'Multiple conflicts detected — cascading delays likely.' : null

  return {
    worstConflict:      worst,
    ifUnresolved: {
      trainDelayed:     lowerPriority.trainNo,
      delayMinutes:     directDelay,
      affectedTrains:   conflicts.length + 1,
      downstreamRisk,
      description:      `If no action: ${lowerPriority.trainName ?? lowerPriority.trainNo} delayed +${directDelay} min at ${worst.location}. ${conflicts.length + 1} trains affected downstream.`,
    },
  }
}

// ── Data Completeness ─────────────────────────────────────────────────────────

function assessCompleteness(ctx) {
  const issues = []

  const trainsWithoutCrew = ctx.trains.filter(
    (t) => !ctx.crew.find((c) => c.trainNo === t.trainNo)
  )
  if (trainsWithoutCrew.length > 0) {
    issues.push({
      field: 'Crew Records',
      concern: `${trainsWithoutCrew.length} train(s) have no crew record: ${trainsWithoutCrew.map((t) => t.trainNo).join(', ')}. Crew expiry analysis may be incomplete.`,
    })
  }

  const trainsWithoutTimetable = ctx.trains.filter(
    (t) => !ctx.timetable.find((e) => e.trainNo === t.trainNo)
  )
  if (trainsWithoutTimetable.length > 0) {
    issues.push({
      field: 'Timetable',
      concern: `${trainsWithoutTimetable.length} train(s) have no timetable entries. Conflict timing analysis may be imprecise.`,
    })
  }

  const vagueCount = issues.length
  const overallRating = vagueCount === 0 ? 'good' : vagueCount === 1 ? 'adequate' : 'poor'

  return {
    overallRating,
    summary: overallRating === 'good'
      ? `All ${ctx.trains.length} trains have complete crew and timetable data. Analysis confidence is high.`
      : `Data is usable but some records are incomplete. See flagged fields.`,
    fieldFlags: issues,
  }
}

// ── What-If Option Generator ──────────────────────────────────────────────────

function buildWhatIfOptions(ctx, conflicts, crewWarnings) {
  const options = []

  // ── Option: Loop lower-priority freight at conflict station ──
  for (const conflict of conflicts.filter((c) => c.riskLevel === 'HIGH' || c.riskLevel === 'MEDIUM')) {
    const freightTrain = [conflict.trainA, conflict.trainB]
      .map((no) => ctx.trains.find((t) => t.trainNo === no))
      .filter(Boolean)
      .sort((a, b) => a.priority - b.priority)[0]

    if (!freightTrain) continue
    const station = ctx.stations.find((s) => s.id === conflict.stationId)
    if (!station || station.loops - station.loopsOccupied < 1) continue

    const passengerTrain = ctx.trains.find((t) => t.trainNo === (
      conflict.trainA === freightTrain.trainNo ? conflict.trainB : conflict.trainA
    ))

    const freightDelay  = 7
    const passengerSave = 10

    options.push({
      id:           `LOOP-${freightTrain.trainNo}-${station.id}`,
      action:       `Loop ${freightTrain.trainName ?? freightTrain.trainNo} at ${station.name}`,
      actionType:   ACTION_TYPES.LOOP_FREIGHT,
      supportLevel: 'Strong',
      recommended:  true,
      passengerImpact:  `${passengerTrain?.trainName ?? 'Passenger train'} delay: ${passengerTrain?.delayMinutes ?? 0} min → ${Math.max(0, (passengerTrain?.delayMinutes ?? 0) - passengerSave)} min  ▲ ${passengerSave} min saved`,
      freightImpact:    `${freightTrain.trainName ?? freightTrain.trainNo} delay: ${freightTrain.delayMinutes} min → ${freightTrain.delayMinutes + freightDelay} min  ▼ +${freightDelay} min added`,
      crewImpact:       'No crew duty impact.',
      downstreamImpact: 'Downstream trains unaffected. Conflict fully resolved.',
    })

    // ── Option: Hold higher-priority train instead ──
    if (passengerTrain) {
      const holdMinutes = 8
      options.push({
        id:           `HOLD-${passengerTrain.trainNo}`,
        action:       `Hold ${passengerTrain.trainName ?? passengerTrain.trainNo} for ${holdMinutes} min`,
        actionType:   ACTION_TYPES.HOLD_TRAIN,
        supportLevel: 'Moderate',
        recommended:  false,
        passengerImpact:  `${passengerTrain.trainName ?? passengerTrain.trainNo} delay: ${passengerTrain.delayMinutes} min → ${passengerTrain.delayMinutes + holdMinutes} min  ▼ +${holdMinutes} min added`,
        freightImpact:    `${freightTrain.trainName ?? freightTrain.trainNo} passes without delay. ▲ Freight unaffected.`,
        crewImpact:       'Monitor crew status if hold extends.',
        downstreamImpact: `${passengerTrain.trainName ?? 'Passenger train'} will arrive ${holdMinutes} min late. Connecting services may be affected.`,
      })
    }
  }

  // ── Option: Arrange crew relief ──
  for (const warning of crewWarnings.filter((w) => w.willExpire || w.status === 'CRITICAL')) {
    options.push({
      id:           `CREW-${warning.trainNo}`,
      action:       `Arrange crew relief for ${warning.trainName} at ${warning.reliefStationId ?? 'nearest station'}`,
      actionType:   ACTION_TYPES.ARRANGE_RELIEF,
      supportLevel: warning.reliefAvailable ? 'Strong' : 'Moderate',
      recommended:  true,
      passengerImpact:  warning.reliefAvailable
        ? `Brief stop at ${warning.reliefStationId} — expected delay: 3–5 min.`
        : 'Relief not currently confirmed. Dispatch TLC for nearest available crew.',
      freightImpact:    'No freight impact.',
      crewImpact:       `Resolves crew expiry risk. Crew remaining: ${warning.remainingMinutes} min. ETA: ${warning.etaMinutes} min. ${warning.willExpire ? '⚠ Will exceed duty without action.' : ''}`,
      downstreamImpact: 'Prevents safety violation. No downstream cascade.',
    })
  }

  // ── Do Nothing — always present, always shows the worst case ──
  const worstConflict = conflicts.find((c) => c.riskLevel === 'HIGH') ?? conflicts[0]
  const worstCrew     = crewWarnings.find((w) => w.willExpire)

  const doNothingRisks = []
  if (worstConflict) doNothingRisks.push(`${worstConflict.trainA} vs ${worstConflict.trainB} conflict at ${worstConflict.location} — estimated +18 min delay.`)
  if (worstCrew)     doNothingRisks.push(`${worstCrew.trainName} crew will exceed duty by ${Math.abs(worstCrew.marginMinutes)} min — safety violation.`)

  options.push({
    id:           'DO-NOTHING',
    action:       'Do Nothing — take no action',
    actionType:   ACTION_TYPES.DO_NOTHING,
    supportLevel: conflicts.length > 0 || crewWarnings.some((w) => w.willExpire) ? 'Weak' : 'Moderate',
    recommended:  false,
    passengerImpact:  worstConflict
      ? `Rajdhani delay grows to +${(ctx.trains.find((t) => t.trainNo === worstConflict.trainA)?.delayMinutes ?? 12) + 18} min.`
      : 'No immediate passenger impact.',
    freightImpact:    'Freight proceeds without intervention.',
    crewImpact:       worstCrew
      ? `⚠ ${worstCrew.trainName} crew exceeds duty limit. Safety violation.`
      : 'No immediate crew risk.',
    downstreamImpact: doNothingRisks.length > 0
      ? doNothingRisks.join(' ')
      : 'No downstream impact under current conditions.',
  })

  return options
}

// ── Exported Mock Functions ───────────────────────────────────────────────────

export async function mockAnalyzeShift(shiftContext) {
  await delay(DELAY_MS)

  const conflicts     = detectConflicts(shiftContext)
  const crewWarnings  = detectCrewRisks(shiftContext)
  const cascade       = calculateCascade(conflicts, shiftContext.trains)
  const completeness  = assessCompleteness(shiftContext)

  const hasHighRisk  = conflicts.some((c) => c.riskLevel === 'HIGH')
  const hasCrewRisk  = crewWarnings.some((w) => w.willExpire)
  const isNovel      = false // shift scenarios are within known patterns

  const whyConcerned = conflicts.length === 0 && crewWarnings.length === 0
    ? ''
    : [
        conflicts.length > 0 && `${conflicts.length} train conflict${conflicts.length > 1 ? 's' : ''} detected in the next 30 minutes.`,
        crewWarnings.some((w) => w.willExpire) && `${crewWarnings.filter((w) => w.willExpire).length} crew expiry risk${crewWarnings.filter((w) => w.willExpire).length > 1 ? 's' : ''} require immediate attention.`,
        cascade && `If the worst conflict is left unresolved: ${cascade.ifUnresolved.description}`,
      ].filter(Boolean).join(' ')

  return {
    conflicts,
    crewWarnings,
    cascade,
    whyConcerned,
    dataCompleteness: completeness,
    situationCheck: {
      classification: isNovel ? 'unknown/novel' : 'within known patterns',
      explanation:    'Shift context falls within known operational patterns. AI confidence is adequate for decision support.',
    },
  }
}

export async function mockGenerateWhatIf(shiftContext, intelligence) {
  await delay(DELAY_MS)

  const options = buildWhatIfOptions(
    shiftContext,
    intelligence.conflicts ?? [],
    intelligence.crewWarnings ?? []
  )

  return { options }
}

export async function mockGetShiftRecommendation(shiftContext, intelligence, whatIf) {
  await delay(DELAY_MS)

  const rank    = { Strong: 3, Moderate: 2, Weak: 1 }
  const options = whatIf.options ?? []
  const recommended = options.filter((o) => o.recommended && o.actionType !== ACTION_TYPES.DO_NOTHING)
  const top = recommended.sort((a, b) => (rank[b.supportLevel] ?? 0) - (rank[a.supportLevel] ?? 0))[0]
    ?? options.sort((a, b) => (rank[b.supportLevel] ?? 0) - (rank[a.supportLevel] ?? 0))[0]

  const trail = []

  for (const conflict of intelligence.conflicts ?? []) {
    trail.push({
      sourceReference: `Conflict: ${conflict.trainA} vs ${conflict.trainB} at ${conflict.location}`,
      rationale:       conflict.description,
      contribution:    `Risk level ${conflict.riskLevel} — options that resolve this conflict received higher support.`,
    })
  }

  for (const crew of (intelligence.crewWarnings ?? []).filter((w) => w.willExpire)) {
    trail.push({
      sourceReference: `Crew Expiry: ${crew.trainName}`,
      rationale:       crew.description,
      contribution:    'Actions that include crew relief were elevated in the assessment.',
    })
  }

  if (intelligence.cascade) {
    trail.push({
      sourceReference: 'Cascade Risk Assessment',
      rationale:       intelligence.cascade.ifUnresolved.description,
      contribution:    'Do Nothing option was downgraded due to cascading delay risk.',
    })
  }

  trail.push({
    sourceReference: `Selected Action: ${top.action} — Evidence Strength: ${top.supportLevel}`,
    rationale:       top.passengerImpact,
    contribution:    `This action received ${top.supportLevel} support. It resolves the highest-priority operational risk with the lowest passenger impact.`,
  })

  if (intelligence.conflicts?.length === 0 && intelligence.crewWarnings?.length === 0) {
    trail.length = 0
    trail.push({
      sourceReference: 'Conflict Scan: No conflicts detected',
      rationale:       'All trains assessed. No two trains will conflict within the next 30 minutes under current conditions.',
      contribution:    'Absence of conflicts supports normal operations.',
    })
    trail.push({
      sourceReference: 'Crew Scan: No expiry risks',
      rationale:       'All crew records assessed. No crew will exceed duty before reaching destination.',
      contribution:    'No crew-driven operational constraint.',
    })
  }

  const summary = intelligence.conflicts?.length === 0 && !intelligence.crewWarnings?.some((w) => w.willExpire)
    ? 'No conflicts or crew expiry risks detected across the section. Normal operations supported.'
    : `${top.action} is recommended based on ${intelligence.conflicts?.length ?? 0} detected conflict${(intelligence.conflicts?.length ?? 0) !== 1 ? 's' : ''} and ${intelligence.crewWarnings?.filter((w) => w.willExpire).length ?? 0} crew expiry risk${(intelligence.crewWarnings?.filter((w) => w.willExpire).length ?? 0) !== 1 ? 's' : ''}.`

  return {
    recommendation: top.action,
    actionType:     top.actionType,
    summary,
    reasoningTrail: trail,
  }
}

export async function mockReEvaluateShift(shiftContext, intelligence, whatIf, recommendation, challenge) {
  await delay(DELAY_MS)

  const pushesToProceed  = /proceed|fine|ok|no action|overreacting|on time|no risk/i.test(challenge)
  const addsCaution      = /serious|dangerous|concern|risk|worse|last time|history|recall/i.test(challenge)
  const mentionsFreight  = /freight|cargo|gd|container/i.test(challenge)
  const mentionsCrew     = /crew|driver|fatigue|relief|expiry/i.test(challenge)

  let newRec   = recommendation.recommendation
  let changed  = false
  let reason   = ''

  if (pushesToProceed) {
    // Find the Do Nothing option
    const doNothing = whatIf.options?.find((o) => o.actionType === ACTION_TYPES.DO_NOTHING)
    if (doNothing && doNothing.supportLevel !== 'Weak') {
      newRec   = doNothing.action
      changed  = true
      reason   = 'Your challenge indicates no immediate action is required. Do Nothing is acceptable under current conditions.'
    } else {
      reason   = 'Challenge noted. However, active conflicts or crew risks remain unresolved. The original recommendation stands.'
    }
  } else if (addsCaution && mentionsCrew) {
    const crewOption = whatIf.options?.find((o) => o.actionType === ACTION_TYPES.ARRANGE_RELIEF)
    if (crewOption) {
      newRec   = crewOption.action
      changed  = recommendation.recommendation !== crewOption.action
      reason   = 'Your challenge highlights crew risk as the primary concern. Crew relief is now prioritised over conflict resolution.'
    }
  } else if (addsCaution) {
    reason = 'Challenge adds caution context. Original recommendation already addresses the highest-risk conflict. No change warranted by the challenge input alone.'
  } else {
    reason = 'Challenge reviewed. The original recommendation stands. The challenge does not resolve or contradict the detected conflicts.'
  }

  return {
    recommendation: newRec,
    changed,
    explanation: changed
      ? `Recommendation revised from "${recommendation.recommendation}" to "${newRec}". ${reason}`
      : `Original recommendation upheld: "${recommendation.recommendation}". ${reason}`,
  }
}
