/**
 * Threshold v2 — Mock AI Engine
 *
 * Implements all 10 mandatory requirements:
 * 1. Train Priority System
 * 2. Crossing & Precedence Rules Engine
 * 3. Crew Expiry Awareness
 * 4. Engineering Block Impact Prediction
 * 5. Loop/Yard Capacity Awareness
 * 6. Controller Action Impact Forecasting
 * 7. Conflict Prediction
 * 8. Train Classification
 * 9. Reasoning Transparency
 * 10. Multi-Department Constraint Awareness
 */

import { TRAIN_PRIORITY, FREIGHT_PRIORITY } from '../types/entities.js'

const DELAY_MS = 1400
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesToHHMM(mins) {
  const h = Math.floor(Math.abs(mins) / 60)
  const m = Math.abs(mins) % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function hhmmToMinutes(hhmm) {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Resolve actual priority for a train, accounting for freight cargo overrides. */
function resolvePriority(train, freightInfo = []) {
  if (train.trainType === 'Freight' || train.trainType === 'Container Freight') {
    const fi = freightInfo.find((f) => f.trainNo === train.trainNo)
    if (fi) return FREIGHT_PRIORITY[fi.cargo] ?? 30
  }
  return TRAIN_PRIORITY[train.trainType] ?? train.priority ?? 30
}

/** Check if a loop station can physically fit a train. */
function loopCanFit(station, train, freightInfo = []) {
  if (station.totalLoops - station.occupiedLoops <= 0) return false
  const fi = freightInfo.find((f) => f.trainNo === train.trainNo)
  if (fi?.lengthMeters && station.loopLengthMeters) {
    return fi.lengthMeters <= station.loopLengthMeters
  }
  return true   // unknown length — assume fits
}

// ── Req 2: Precedence Rules Engine ───────────────────────────────────────────
// Returns the regulation decision for two trains on a single-line section.
// Encodes the actual Indian Railways crossing/precedence logic.

function applyPrecedenceRules(trainA, trainB, freightInfo, crewMap) {
  const pA = resolvePriority(trainA, freightInfo)
  const pB = resolvePriority(trainB, freightInfo)

  const aIsEmergency = ['ARME', 'ART'].includes(trainA.trainType)
  const bIsEmergency = ['ARME', 'ART'].includes(trainB.trainType)

  // PR-01: Emergency absolute precedence
  if (aIsEmergency) return { pass: trainA, loop: trainB, ruleId: 'PR-01', ruleReason: `${trainA.trainName} is an emergency train (${trainA.trainType}). Absolute precedence — all other trains must give way unconditionally.` }
  if (bIsEmergency) return { pass: trainB, loop: trainA, ruleId: 'PR-01', ruleReason: `${trainB.trainName} is an emergency train (${trainB.trainType}). Absolute precedence — all other trains must give way unconditionally.` }

  // PR-05: Crew expiring in < 30 min — must be stabilised regardless of priority
  const aCrewCritical = crewMap[trainA.trainNo]?.dutyRemainingMinutes < 30
  const bCrewCritical = crewMap[trainB.trainNo]?.dutyRemainingMinutes < 30
  if (aCrewCritical && !bCrewCritical) return { pass: trainB, loop: trainA, ruleId: 'PR-05', ruleReason: `${trainA.trainName} crew expires in under 30 minutes. Must be stabilised for crew change before proceeding, regardless of priority class.` }
  if (bCrewCritical && !aCrewCritical) return { pass: trainA, loop: trainB, ruleId: 'PR-05', ruleReason: `${trainB.trainName} crew expires in under 30 minutes. Must be stabilised for crew change before proceeding, regardless of priority class.` }

  // PR-03 + PR-04: Higher priority passes, lower loops
  if (pA > pB) {
    const reason = pA >= 70 && pB < 50 && trainA.delayMinutes > 0
      ? `${trainA.trainName} (${trainA.trainType}, priority ${pA}) passes despite ${trainA.delayMinutes} min delay. Priority class difference over ${trainB.trainType} (priority ${pB}) outweighs punctuality. PR-04 applies.`
      : `${trainA.trainName} (priority ${pA}) has higher precedence than ${trainB.trainName} (priority ${pB}). PR-03 applies.`
    return { pass: trainA, loop: trainB, ruleId: pA >= 70 && pB < 50 ? 'PR-04' : 'PR-03', ruleReason: reason }
  }
  if (pB > pA) {
    const reason = pB >= 70 && pA < 50 && trainB.delayMinutes > 0
      ? `${trainB.trainName} (${trainB.trainType}, priority ${pB}) passes despite ${trainB.delayMinutes} min delay. Priority class difference over ${trainA.trainType} (priority ${pA}) outweighs punctuality. PR-04 applies.`
      : `${trainB.trainName} (priority ${pB}) has higher precedence than ${trainA.trainName} (priority ${pA}). PR-03 applies.`
    return { pass: trainB, loop: trainA, ruleId: pB >= 70 && pA < 50 ? 'PR-04' : 'PR-03', ruleReason: reason }
  }

  // PR-02: Same priority class — on-time train preferred over late train
  if (pA === pB) {
    if (trainA.delayMinutes === 0 && trainB.delayMinutes > 0)
      return { pass: trainA, loop: trainB, ruleId: 'PR-02', ruleReason: `Both trains are ${trainA.trainType} class (priority ${pA}). ${trainA.trainName} is on time; ${trainB.trainName} is ${trainB.delayMinutes} min late. On-time train gets preference per PR-02.` }
    if (trainB.delayMinutes === 0 && trainA.delayMinutes > 0)
      return { pass: trainB, loop: trainA, ruleId: 'PR-02', ruleReason: `Both trains are ${trainB.trainType} class (priority ${pB}). ${trainB.trainName} is on time; ${trainA.trainName} is ${trainA.delayMinutes} min late. On-time train gets preference per PR-02.` }
    // Both on time or both late — default to A passes (timetable order)
    return { pass: trainA, loop: trainB, ruleId: 'PR-02', ruleReason: `Equal priority and punctuality. ${trainA.trainName} given precedence by timetable order.` }
  }

  return { pass: trainA, loop: trainB, ruleId: 'PR-03', ruleReason: 'Default timetable precedence applied.' }
}

// ── Req 7: Conflict Detection ─────────────────────────────────────────────────

function detectConflicts(ctx) {
  const conflicts = []
  const { trains, sections, stations, freightInfo, crew } = ctx
  const crewMap = Object.fromEntries((crew ?? []).map((c) => [c.trainNo, c]))
  const singleLines = sections.filter((s) => !s.doubleLine)

  // ── Emergency scenario: treat unverified track hazard as a conflict for all approaching trains ──
  if (ctx.emergencyActive && ctx.emergencyType === 'TRACK_ANOMALY') {
    const hazardKm   = ctx.emergencyKm
    const minsToImpact = ctx.minutesToImpact ?? {}

    const approaching = trains.filter((t) =>
      t.currentSpeedKmh > 0 &&
      t.currentStation !== 'In Block' &&
      minsToImpact[t.trainNo] != null
    ).sort((a, b) => (minsToImpact[a.trainNo] ?? 99) - (minsToImpact[b.trainNo] ?? 99))

    const inBlock = trains.find((t) => t.currentStation === 'In Block')

    for (const t of approaching) {
      const mins  = minsToImpact[t.trainNo]
      const pT    = resolvePriority(t, freightInfo ?? [])
      const nearestStation = stations.find((s) =>
        s.id !== 'In Block' && s.totalLoops - s.occupiedLoops > 0
      )
      conflicts.push({
        type:          'EMERGENCY_HALT',
        trains:        [t.trainNo, inBlock?.trainNo ?? 'HAZARD'].filter(Boolean),
        trainNames:    [t.trainName, inBlock ? `${inBlock.trainName} (in block, no contact)` : `Track anomaly KM ${hazardKm}`],
        priorities:    [pT, 0],
        section:       `${t.currentStation}–${t.nextStation}`,
        riskLevel:     mins <= 10 ? 'HIGH' : 'MEDIUM',
        precedence: {
          pass:       null,
          loop:       t,
          ruleId:     'PR-EMERGENCY',
          ruleReason: `Unverified track anomaly at KM ${hazardKm}. ${t.trainName} is ${mins} min from the suspect section. Section must be treated as unsafe until P-Way inspection clears it.`,
        },
        loopAvailable: !!nearestStation,
        loopStation:   nearestStation?.id ?? null,
        loopFit:       nearestStation ? `${t.trainName} can be held at ${nearestStation.name}` : 'No loop within safe stopping distance',
        ifNoAction: {
          [t.trainNo]: mins <= 10
            ? `Train enters suspect section in ${mins} min. If fracture is real: DERAILMENT RISK.`
            : `Train enters suspect section in ${mins} min. Unconfirmed risk.`,
          ...(inBlock ? { [inBlock.trainNo]: 'Position unknown. Radio contact lost. Could be at KM 312 right now.' } : {}),
        },
        recommendedAction: nearestStation
          ? `Issue STOP authority to ${t.trainName}. Hold at ${nearestStation.name} loop. Do not allow entry into KM 310–315 until P-Way clears the section.`
          : `Issue emergency caution order to ${t.trainName}. Reduce speed to 15 km/h max through KM 310–315. Prepare to stop on sight.`,
        description: `${t.trainName} is ${mins} minutes from the reported anomaly site at KM ${hazardKm}. An unverified report of a possible rail fracture or broken fishplate was received at 18:47. ${inBlock ? `Freight ${inBlock.trainNo} is already inside the block with no radio contact.` : ''} Weather: ${ctx.weather?.condition ?? 'Poor'} — emergency braking distance extended significantly.`,
      })
    }
    return conflicts
  }

  for (const sec of singleLines) {
    const entering = trains.filter((t) => t.currentStation === sec.from && t.nextStation === sec.to)
    const opposing = trains.filter((t) => t.currentStation === sec.to  && t.nextStation === sec.from)
    const sameDir  = trains.filter((t) => t.currentStation === sec.from && t.nextStation === sec.to)

    // Head-on conflicts
    for (const a of entering) {
      for (const b of opposing) {
        const precedence = applyPrecedenceRules(a, b, freightInfo ?? [], crewMap)
        const passT = precedence.pass
        const loopT = precedence.loop

        // Find best loop for the looping train
        const loopCandidates = [sec.from, sec.to]
          .map((id) => stations.find((s) => s.id === id))
          .filter((s) => s && loopCanFit(s, loopT, freightInfo ?? []))
          .sort((x, y) => (y.totalLoops - y.occupiedLoops) - (x.totalLoops - x.occupiedLoops))
        const bestLoop = loopCandidates[0]

        const pA = resolvePriority(a, freightInfo)
        const pB = resolvePriority(b, freightInfo)
        const riskLevel = Math.max(pA, pB) >= 85 ? 'HIGH' : 'MEDIUM'

        // Delay impact if no action
        const loopDelayMin = 8
        const passDelayReduction = Math.min(passT.delayMinutes, 10)

        conflicts.push({
          type:         'HEAD_ON',
          trains:       [a.trainNo, b.trainNo],
          trainNames:   [a.trainName, b.trainName],
          priorities:   [pA, pB],
          section:      `${sec.from}–${sec.to}`,
          riskLevel,
          precedence,
          loopAvailable: !!bestLoop,
          loopStation:   bestLoop?.id ?? null,
          loopFit:       bestLoop ? `${loopT.trainName} length fits ${bestLoop.name} loop` : 'No suitable loop found',
          ifNoAction: {
            [a.trainNo]: `+${a.delayMinutes + 18} min delay`,
            [b.trainNo]: `+${b.delayMinutes + 6} min delay`,
          },
          recommendedAction: bestLoop
            ? `Loop ${loopT.trainName} (${loopT.trainType}, priority ${resolvePriority(loopT, freightInfo)}) at ${bestLoop.name}. Pass ${passT.trainName} (${passT.trainType}, priority ${resolvePriority(passT, freightInfo)}) first.`
            : `No loop available. Consider holding ${loopT.trainName} at ${loopT.currentStation} until ${passT.trainName} clears the section.`,
          description: `${a.trainName} and ${b.trainName} are converging on single-line section ${sec.from}–${sec.to}. Precedence rule ${precedence.ruleId}: ${precedence.ruleReason}`,
        })
      }
    }

    // Overtake conflicts (same direction, higher priority closing on lower)
    if (sameDir.length >= 2) {
      const sorted = [...sameDir].sort((a, b) => resolvePriority(b, freightInfo) - resolvePriority(a, freightInfo))
      const fast = sorted[0], slow = sorted[1]
      const pFast = resolvePriority(fast, freightInfo)
      const pSlow = resolvePriority(slow, freightInfo)
      if (pFast > pSlow && fast.currentSpeedKmh > slow.currentSpeedKmh) {
        const loopSt = stations.find((s) => s.id === sec.to && loopCanFit(s, slow, freightInfo ?? []))
        conflicts.push({
          type:         'OVERTAKE',
          trains:       [fast.trainNo, slow.trainNo],
          trainNames:   [fast.trainName, slow.trainName],
          priorities:   [pFast, pSlow],
          section:      `${sec.from}–${sec.to}`,
          riskLevel:    pFast >= 85 ? 'HIGH' : 'MEDIUM',
          precedence:   {
            pass:    fast,
            loop:    slow,
            ruleId:  'PR-03',
            ruleReason: `${fast.trainName} (priority ${pFast}) overtaking ${slow.trainName} (priority ${pSlow}).`,
          },
          loopAvailable: !!loopSt,
          loopStation:   loopSt?.id ?? null,
          loopFit:       loopSt ? `${slow.trainName} fits ${loopSt.name} loop` : 'No suitable loop',
          ifNoAction: {
            [fast.trainNo]: `+${fast.delayMinutes + 10} min delay`,
            [slow.trainNo]: `+${slow.delayMinutes + 3} min delay`,
          },
          recommendedAction: loopSt
            ? `Loop ${slow.trainName} at ${loopSt.name} to allow ${fast.trainName} to overtake.`
            : `Hold ${slow.trainName} at ${slow.currentStation} to create gap for ${fast.trainName}.`,
          description: `${fast.trainName} (${fast.trainType}, priority ${pFast}) is closing on ${slow.trainName} (${slow.trainType}, priority ${pSlow}) in the same single-line block. Overtake arrangement needed.`,
        })
      }
    }
  }

  return conflicts
}

// ── Req 3: Crew Expiry ────────────────────────────────────────────────────────

function detectCrewRisks(ctx) {
  const warnings = []
  const { trains, crew, sections } = ctx

  for (const c of crew ?? []) {
    if (c.dutyRemainingMinutes > 120) continue

    const train = trains.find((t) => t.trainNo === c.trainNo)
    if (!train) continue

    const sec = sections.find((s) => s.from === train.currentStation && s.to === train.nextStation)
    const minToNext = sec ? Math.round((sec.distanceKm / (train.currentSpeedKmh || 80)) * 60) : 0

    warnings.push({
      trainNo:              c.trainNo,
      trainName:            train.trainName,
      trainType:            train.trainType,
      priority:             resolvePriority(train, ctx.freightInfo),
      dutyRemainingMinutes: c.dutyRemainingMinutes,
      minutesToNextStation: minToNext,
      expiresBeforeNext:    c.dutyRemainingMinutes < minToNext,
      level:                c.dutyRemainingMinutes < 60 ? 'CRITICAL' : c.dutyRemainingMinutes < 90 ? 'WARNING' : 'WATCH',
      reliefAvailable:      c.reliefAvailable,
      reliefStation:        c.reliefStation,
      recommendedAction:    c.reliefAvailable
        ? `Arrange crew relief at Station ${c.reliefStation}. ${c.dutyRemainingMinutes} min remaining — relief must be in place before departure.`
        : `No relief crew available. Stable train at next station. Contact TLC for nearest available crew.`,
    })
  }

  return warnings
}

// ── Req 4: Engineering Block Impact Prediction ────────────────────────────────

function evaluateBlockWindows(ctx) {
  const evaluations = []
  const { maintenanceBlocks, trains, timetable } = ctx

  for (const mb of maintenanceBlocks ?? []) {
    if (!mb.alternativeWindows) continue

    const affectedTrains = trains.filter(
      (t) => t.nextStation === mb.sectionTo || t.currentStation === mb.sectionFrom
    )

    const windows = [
      // Current (already approved) window
      {
        label:     'Current Window (Active)',
        startTime: mb.startTime,
        endTime:   mb.endTime,
        active:    true,
        affectedTrainCount: affectedTrains.length,
        estimatedDelayMinutes: affectedTrains.length * 8,
        note:      `${affectedTrains.length} train(s) currently affected or queued behind this block.`,
      },
      // Alternative windows
      ...mb.alternativeWindows.map((w) => ({
        label:     `Alternative Window`,
        startTime: w.startTime,
        endTime:   w.endTime,
        active:    false,
        affectedTrainCount: w.estimatedDelayMinutes === 0 ? 0 : 2,
        estimatedDelayMinutes: w.estimatedDelayMinutes,
        note:      w.note,
      })),
    ]

    evaluations.push({
      blockId:   mb.id,
      location:  mb.location,
      department:mb.department,
      windows,
      recommendation: windows
        .filter((w) => !w.active)
        .sort((a, b) => a.estimatedDelayMinutes - b.estimatedDelayMinutes)[0] ?? null,
    })
  }

  return evaluations
}

// ── Req 10: Multi-Department Constraints — with categories ────────────────────

const DEPT_CATEGORY = {
  'TRD':  'Operational',   // traction — affects loco operations
  'S&T':  'Safety',        // signalling — safety-critical
  'C&W':  'Safety',        // carriage & wagon — safety-critical
  'PWI':  'Operational',   // permanent way — track maintenance
  'RPF':  'Resource',      // security
  'COM':  'Resource',      // commercial
}

function evaluateDeptConstraints(ctx) {
  const impacts = []
  const { departmentConstraints, trains } = ctx

  for (const dc of departmentConstraints ?? []) {
    const affectedTrains = trains.filter((t) =>
      t.currentStation === dc.affectedSection ||
      t.nextStation    === dc.affectedSection ||
      dc.affectedSection.includes(t.currentStation)
    )

    impacts.push({
      department:      dc.department,
      category:        DEPT_CATEGORY[dc.department] ?? 'Operational',
      type:            dc.type,
      description:     dc.description,
      until:           dc.until,
      blocksMovement:  dc.blocksMovement,
      affectedTrains:  affectedTrains.map((t) => t.trainNo),
      operationalNote: dc.blocksMovement
        ? `⚠ Movement blocked by ${dc.department}: ${dc.description} — trains cannot depart until cleared.`
        : `ℹ ${dc.department} advisory: ${dc.description} — movement possible but with constraints.`,
    })
  }

  return impacts
}

// ── Cascade estimator — specific cascading language ───────────────────────────

function estimateCascade(conflicts, trains) {
  if (conflicts.length === 0) return null

  const affectedSet  = new Set(conflicts.flatMap((c) => c.trains))
  const highCount    = conflicts.filter((c) => c.riskLevel === 'HIGH').length
  const totalDelay   = conflicts.reduce((sum, c) =>
    sum + Object.values(c.ifNoAction).reduce((s, v) => s + (parseInt(v) || 0), 0), 0)

  // Build specific train-level cascading impacts
  const trainImpacts = []
  for (const c of conflicts) {
    for (const [trainNo, impact] of Object.entries(c.ifNoAction)) {
      const t = trains.find((tr) => tr.trainNo === trainNo)
      if (!t) continue
      const delayMins = parseInt(impact) || 0
      const newDelay  = t.delayMinutes + delayMins
      trainImpacts.push({
        trainNo,
        trainName:   t.trainName,
        trainType:   t.trainType,
        currentDelay:t.delayMinutes,
        addedDelay:  delayMins,
        totalDelay:  newDelay,
        impact,
      })
    }
  }

  // Downstream summary — any high-priority trains caught in cascade
  const highPriorityImpacted = trainImpacts.filter((ti) => {
    const t = trains.find((tr) => tr.trainNo === ti.trainNo)
    return (t?.priority ?? 0) >= 70
  })

  return {
    affectedTrainCount:    affectedSet.size,
    highRiskConflicts:     highCount,
    estimatedDelayMinutes: totalDelay,
    trainImpacts,
    summary: [
      `${affectedSet.size} train(s) affected.`,
      highPriorityImpacted.length > 0
        ? `High-priority services at risk: ${highPriorityImpacted.map((ti) => `${ti.trainName} (+${ti.addedDelay} min)`).join(', ')}.`
        : null,
      `Combined delay: ${totalDelay} min.`,
      highCount > 0
        ? `${highCount} HIGH-risk conflict(s) unresolved — each additional minute of inaction compounds downstream delay.`
        : null,
    ].filter(Boolean).join(' '),
  }
}

// ── Req 6: What-If Option Builder ─────────────────────────────────────────────
// Generates regulation actions grounded in precedence rules and loop availability.

function buildWhatIfOptions(ctx, conflicts, crewRisks, deptConstraints) {
  const options = []

  for (const conflict of conflicts) {
    const { precedence, loopAvailable, loopStation } = conflict
    const passT  = ctx.trains.find((t) => t.trainNo === precedence.pass.trainNo) ?? precedence.pass
    const loopT  = ctx.trains.find((t) => t.trainNo === precedence.loop.trainNo) ?? precedence.loop
    const pPass  = resolvePriority(passT, ctx.freightInfo)
    const pLoop  = resolvePriority(loopT, ctx.freightInfo)
    const fi     = ctx.freightInfo?.find((f) => f.trainNo === loopT.trainNo)

    // Blocking dept constraint at loop station?
    const loopBlocked = deptConstraints.some(
      (d) => d.blocksMovement && d.affectedTrains.includes(loopT.trainNo)
    )

    if (loopAvailable && loopStation && !loopBlocked) {
      options.push({
        id:           `loop_${loopT.trainNo}_${loopStation}`,
        action:       `Loop ${loopT.trainName} at Station ${loopStation}`,
        description:  conflict.recommendedAction,
        supportLevel: 'Strong',
        precedenceRule: conflict.precedence.ruleId,
        reasoning: [
          `Precedence rule ${precedence.ruleId}: ${precedence.ruleReason}`,
          `${passT.trainName} (priority ${pPass}) passes first.`,
          `${loopT.trainName} (priority ${pLoop}${fi ? `, ${fi.cargo} freight` : ''}) holds at Station ${loopStation} loop.`,
          loopT.trainType === 'Container Freight' || loopT.trainType === 'Freight'
            ? `Loop length check: ${conflict.loopFit}.`
            : null,
        ].filter(Boolean),
        consequences: {
          passengerPunctuality: `${passT.trainName} delay: ${passT.delayMinutes} min → approx ${Math.max(0, passT.delayMinutes - 10)} min`,
          freightThroughput:    fi
            ? `${loopT.trainName} (${fi.cargo}, delay cost: ${fi.delayCost}) delayed ~7 min`
            : `${loopT.trainName} delayed ~7 min`,
          crewCompliance:       'No crew impact from this action',
          cascadeImpact:        'Conflict resolved. Downstream trains unaffected.',
          departmentImpact:     'No additional department coordination required.',
        },
      })
    } else if (loopBlocked) {
      // Loop blocked by dept constraint — offer alternative
      options.push({
        id:           `hold_${loopT.trainNo}_dept`,
        action:       `Hold ${loopT.trainName} at ${loopT.currentStation} (loop blocked)`,
        description:  `Station ${loopStation} loop unavailable due to department constraint. Hold ${loopT.trainName} at current station until ${passT.trainName} clears section.`,
        supportLevel: 'Moderate',
        precedenceRule: conflict.precedence.ruleId,
        reasoning: [`Loop at Station ${loopStation} blocked by department constraint. Hold is the safe alternative.`],
        consequences: {
          passengerPunctuality: `${passT.trainName} passes unaffected`,
          freightThroughput:    `${loopT.trainName} delay increases by ~12 min due to hold at station`,
          crewCompliance:       'Monitor crew duty if hold extends',
          cascadeImpact:        'Minimal — one train held at station.',
          departmentImpact:     deptConstraints.find((d) => d.affectedTrains.includes(loopT.trainNo))?.operationalNote ?? '',
        },
      })
    }

    // Always offer the "hold higher priority" alternative for comparison
    options.push({
      id:           `hold_${passT.trainNo}_8min`,
      action:       `Hold ${passT.trainName} for 8 minutes`,
      description:  `Hold ${passT.trainName} at its current station for 8 min. Note: this contradicts precedence rule ${precedence.ruleId} — only consider if loop is unavailable and delay impact is acceptable.`,
      supportLevel: 'Weak',
      precedenceRule: null,
      reasoning: [`This action contradicts ${precedence.ruleId}. Use only if no loop is available and the operational situation demands it.`],
      consequences: {
        passengerPunctuality: `${passT.trainName} delay increases by 8 min. Not recommended for priority class ${passT.trainType}.`,
        freightThroughput:    `${loopT.trainName} maintains schedule`,
        crewCompliance:       'No crew impact',
        cascadeImpact:        `Trains behind ${passT.trainName} may experience compression.`,
        departmentImpact:     'No department coordination required.',
      },
    })
  }

  // Crew relief actions
  for (const risk of crewRisks) {
    if (risk.reliefAvailable) {
      options.push({
        id:           `relief_${risk.trainNo}`,
        action:       `Arrange Crew Relief — ${risk.trainName} at Station ${risk.reliefStation}`,
        description:  risk.recommendedAction,
        supportLevel: risk.level === 'CRITICAL' ? 'Strong' : 'Moderate',
        precedenceRule: 'PR-05',
        reasoning:    [`${risk.trainName} crew has ${risk.dutyRemainingMinutes} min remaining. Relief at Station ${risk.reliefStation} prevents duty violation.`],
        consequences: {
          passengerPunctuality: `Brief stop at Station ${risk.reliefStation} — approx 5 min`,
          freightThroughput:    'Unaffected',
          crewCompliance:       `Duty violation prevented. Crew compliant after relief.`,
          cascadeImpact:        'No downstream impact.',
          departmentImpact:     'TLC/crew controller coordination required.',
        },
      })
    }
  }

  // Department constraint actions
  for (const dc of deptConstraints.filter((d) => d.blocksMovement)) {
    options.push({
      id:           `resolve_dept_${dc.department}`,
      action:       `Coordinate with ${dc.department} — ${dc.type}`,
      description:  dc.operationalNote,
      supportLevel: 'Strong',
      precedenceRule: null,
      reasoning:    [`Movement blocked by ${dc.department} constraint until ${dc.until}. Trains affected: ${dc.affectedTrains.join(', ')}.`],
      consequences: {
        passengerPunctuality: `Affected trains held until ${dc.until}`,
        freightThroughput:    'Unaffected unless freight train is blocked',
        crewCompliance:       'Monitor crew duty during hold',
        cascadeImpact:        `Downstream delay if block extends beyond ${dc.until}.`,
        departmentImpact:     `${dc.department} clearance required before departure.`,
      },
    })
  }

  // Do Nothing — always last
  const cascade = estimateCascade(conflicts, ctx.trains)
  options.push({
    id:           'do_nothing',
    action:       'Take No Action',
    description:  'Allow current conditions to develop without intervention.',
    supportLevel: conflicts.length > 0 || deptConstraints.some((d) => d.blocksMovement) ? 'Weak' : 'Strong',
    precedenceRule: null,
    reasoning:    [],
    consequences: {
      passengerPunctuality: cascade
        ? `${cascade.affectedTrainCount} trains affected — estimated ${cascade.estimatedDelayMinutes} min combined delay`
        : 'No conflicts detected. All trains maintain schedule.',
      freightThroughput:    cascade ? 'Degraded' : 'Unaffected',
      crewCompliance:       crewRisks.length > 0
        ? `${crewRisks.length} crew risk(s) unresolved`
        : 'No crew risks',
      cascadeImpact:        cascade?.summary ?? 'No cascade risk.',
      departmentImpact:     deptConstraints.some((d) => d.blocksMovement)
        ? 'Movement-blocking constraints remain unresolved.'
        : 'No department constraints active.',
    },
  })

  return options
}

// ── Exported mock functions ───────────────────────────────────────────────────

export async function mockAnalyzeSituation(shiftContext) {
  await delay(DELAY_MS)

  const conflicts    = detectConflicts(shiftContext)
  const crewRisks    = detectCrewRisks(shiftContext)
  const cascade      = estimateCascade(conflicts, shiftContext.trains)
  const blockWindows = evaluateBlockWindows(shiftContext)
  const deptImpacts  = evaluateDeptConstraints(shiftContext)

  // Structured weather impact
  const w = shiftContext.weather
  const weatherImpact = w ? {
    condition:    w.condition,
    note:         w.note ?? null,
    rainMm:       w.rainMm ?? 0,
    visibilityKm: w.visibilityKm ?? 10,
    windKmh:      w.windKmh ?? 0,
    brakingWarning: (w.rainMm > 3 || w.visibilityKm < 5)
      ? `Wet rails — braking distances extended ~${Math.round((w.rainMm ?? 0) * 1.5 + 8)}% above dry baseline. Trains approaching junctions must observe reduced approach speeds.`
      : null,
    affectsConflicts: (w.rainMm > 3) && conflicts.length > 0,
  } : null

  const hasMovementBlock = deptImpacts.some((d) => d.blocksMovement)
  const allClear = conflicts.length === 0 && crewRisks.length === 0 && !hasMovementBlock

  return {
    conflicts,
    crewRisks,
    cascade,
    blockWindows,
    deptImpacts,
    weatherImpact,
    situationCheck: {
      classification: 'within known patterns',
      explanation: allClear
        ? 'All trains operating within normal parameters. No conflicts, crew risks, or movement-blocking constraints in the next 30 minutes.'
        : [
            conflicts.length > 0    ? `${conflicts.length} crossing conflict(s) require regulation.` : null,
            crewRisks.length > 0    ? `${crewRisks.length} crew expiry risk(s) need attention.` : null,
            hasMovementBlock        ? `${deptImpacts.filter((d) => d.blocksMovement).length} department constraint(s) blocking movement.` : null,
            weatherImpact?.brakingWarning ? 'Weather conditions affecting braking distances.' : null,
          ].filter(Boolean).join(' '),
    },
  }
}

export async function mockSimulateConsequences(shiftContext, intelligence) {
  await delay(DELAY_MS)
  const options = buildWhatIfOptions(
    shiftContext,
    intelligence.conflicts,
    intelligence.crewRisks,
    intelligence.deptImpacts ?? []
  )
  return { options }
}

export async function mockGetRecommendation(shiftContext, intelligence, whatIf) {
  await delay(DELAY_MS)

  // ── EMERGENCY MODE ────────────────────────────────────────────────────────
  // If any EMERGENCY_HALT conflict exists, bypass normal optimisation entirely.
  // Life-safety events override all scheduling, crew, and freight logic.
  const emergencyConflicts = (intelligence.conflicts ?? []).filter((c) => c.type === 'EMERGENCY_HALT')
  if (emergencyConflicts.length > 0 || shiftContext.emergencyActive) {
    const trains      = shiftContext.trains ?? []
    const approaching = trains.filter((t) => t.currentSpeedKmh > 0 && t.currentStation !== 'In Block')
    const inBlock     = trains.find((t) => t.currentStation === 'In Block')
    const hazardKm    = shiftContext.emergencyKm ?? 'unknown'

    const steps = [
      ...approaching.map((t, i) => ({
        seq:    i + 1,
        action: `STOP ${t.trainName} (${t.trainNo}) immediately`,
        detail: `Issue Stop Authority. Do not allow entry into KM 310–315. Hold at ${shiftContext.stations?.find((s) => s.id !== 'In Block' && s.totalLoops > s.occupiedLoops)?.name ?? 'nearest loop station'}.`,
      })),
      {
        seq:    approaching.length + 1,
        action: `Establish radio contact with ${inBlock?.trainName ?? 'Coal Freight in block'}`,
        detail: 'Train position inside affected section is unknown. Attempt contact every 60 seconds. If no response in 5 min, assume worst case and dispatch relief.',
      },
      {
        seq:    approaching.length + 2,
        action: `Block movement authority through KM 310–315`,
        detail: 'Issue formal authority cancellation for the affected block. No train movement permitted until P-Way inspection clears the section.',
      },
      {
        seq:    approaching.length + 3,
        action: 'Dispatch P-Way inspection team to KM 312/4',
        detail: `Team is 28 minutes away. Dispatch immediately. Require physical verification and voice confirmation before any movement authority is restored.`,
      },
      {
        seq:    approaching.length + 4,
        action: 'Resume operations only after track clearance',
        detail: 'No train may enter the section until the P-Way gang physically inspects KM 312/4 and the gang mate confirms track integrity to the controller by voice.',
      },
    ]

    return {
      emergencyMode:  true,
      recommendation: 'EMERGENCY BLOCK PROTECTION',
      summary:        `⚠ EMERGENCY MODE ACTIVATED. Possible rail fracture at KM ${hazardKm}. ${approaching.length} train(s) approaching. ${inBlock ? `${inBlock.trainName} is inside the affected block with no radio contact.` : ''} Normal optimisation suspended. Protect life first.`,
      emergencySteps: steps,
      reasoningTrail: [
        {
          sourceReference: `Emergency Report — KM ${hazardKm} — Possible Rail Fracture`,
          rationale:       `Loco pilot reported severe vibration and crack sound. Track integrity is unconfirmed. P-Way inspection is 28 minutes away. Weather: ${shiftContext.weather?.condition ?? 'Poor'} — extended stopping distances.`,
          contribution:    'This is a life-safety event. Normal regulation logic is suspended. Emergency Block Protection overrides all other considerations.',
        },
        ...approaching.map((t) => ({
          sourceReference: `Approaching Train — ${t.trainName} — ${shiftContext.minutesToImpact?.[t.trainNo] ?? '?'} min from hazard`,
          rationale:       `${t.trainName} is ${shiftContext.minutesToImpact?.[t.trainNo] ?? '?'} minutes from the suspect section at ${t.currentSpeedKmh} km/h. In ${shiftContext.weather?.condition ?? 'poor'} conditions, emergency stopping distance is significantly extended.`,
          contribution:    `Must be stopped before reaching KM 310. Every minute of inaction reduces stopping options.`,
        })),
        inBlock ? {
          sourceReference: `In-Block Train — ${inBlock.trainName} — Radio Contact Lost`,
          rationale:       'Train entered the single-line block 4+ minutes ago. Current position unknown. May be at or near KM 312 right now.',
          contribution:    'Unknown position inside affected section is the highest-risk unknown in this emergency. Assume worst case until contact is established.',
        } : null,
        {
          sourceReference: 'Crew Relief — Deferred',
          rationale:       'Crew expiry risks exist for trains in territory. These are real concerns but are secondary to the life-safety emergency.',
          contribution:    'Crew relief actions are suppressed until Emergency Block Protection is resolved. Revisit once track is cleared.',
        },
      ].filter(Boolean),
      operationalConfidence: {
        score:   45,
        factors: [
          '⚠ Track integrity unconfirmed',
          '⚠ Train position inside block unknown',
          '⚠ Weather reducing stopping distances',
          '✓ P-Way team dispatched',
          '✓ Emergency block authority issued',
        ],
      },
      crewAvailability: [],
      controlOrder: {
        number:        `CO-EMERGENCY-${Math.floor(100 + Math.random() * 900)}`,
        time:          '18:47',
        to:            ['SM Ramagundam', 'SM Kazipet Jn', 'SM Peddapalli', 'P-Way Inspector Balasore Division'],
        instruction:   'EMERGENCY BLOCK PROTECTION — KM 310–315. All movement authority CANCELLED. No train to enter section until further notice.',
        detail:        `Possible rail fracture reported at KM ${hazardKm}. Dispatch P-Way inspection team immediately. Confirm track integrity before restoring any movement authority.`,
        precedenceRule: 'PR-EMERGENCY',
        issuedBy:      'Threshold AI — Emergency Mode — Pending controller confirmation',
        status:        'DRAFT',
      },
    }
  }
  // ── END EMERGENCY MODE ────────────────────────────────────────────────────
  const options = whatIf.options ?? []

  // Never recommend "Do Nothing" if there are active conflicts or blocking constraints
  const hasIssues = intelligence.conflicts.length > 0 ||
                    (intelligence.deptImpacts ?? []).some((d) => d.blocksMovement)
  const candidates = options.filter((o) => !(o.id === 'do_nothing' && hasIssues))
  const sorted     = [...candidates].sort((a, b) => (rank[b.supportLevel] ?? 0) - (rank[a.supportLevel] ?? 0))
  const top        = sorted[0] ?? options[0]

  // Build reasoning trail — every step references actual detected data
  const trail = []

  for (const c of intelligence.conflicts) {
    trail.push({
      sourceReference: `Conflict — ${c.trains.join(' vs ')} on ${c.section} [${c.riskLevel}]`,
      rationale:       c.description,
      contribution:    `Precedence rule ${c.precedence.ruleId} applied: ${c.precedence.ruleReason} This is the primary driver of the regulation recommendation.`,
    })
  }

  for (const r of intelligence.crewRisks) {
    trail.push({
      sourceReference: `Crew Risk — ${r.trainName} [${r.level}] · ${r.dutyRemainingMinutes} min remaining`,
      rationale:       r.recommendedAction,
      contribution:    `${r.reliefAvailable ? `Relief available at Station ${r.reliefStation}.` : 'No relief available — stable train required.'} This risk ${r.level === 'CRITICAL' ? 'mandates' : 'elevates urgency of'} immediate action.`,
    })
  }

  for (const d of (intelligence.deptImpacts ?? []).filter((d) => d.blocksMovement)) {
    trail.push({
      sourceReference: `Dept Constraint — ${d.department}: ${d.type}`,
      rationale:       d.description,
      contribution:    `Movement blocked until ${d.until}. Affected trains: ${d.affectedTrains.join(', ')}. Must be resolved before departure.`,
    })
  }

  for (const bw of (intelligence.blockWindows ?? [])) {
    if (bw.recommendation) {
      trail.push({
        sourceReference: `Block Window — ${bw.blockId} at ${bw.location}`,
        rationale:       `Current block window has ${bw.windows[0]?.affectedTrainCount ?? 'multiple'} trains affected. Alternative window ${bw.recommendation.startTime}–${bw.recommendation.endTime} has lower impact (${bw.recommendation.estimatedDelayMinutes} min delay).`,
        contribution:    `Engineering block optimisation: consider shifting block to ${bw.recommendation.startTime} window to reduce operational impact.`,
      })
    }
  }

  if (!hasIssues && intelligence.crewRisks.length === 0) {
    trail.push({
      sourceReference: 'Advance Plot — No conflicts, crew risks, or blocking constraints detected',
      rationale:       'All trains assessed across all sections, crew states, and department constraints. No action required in the next 30 minutes.',
      contribution:    'Clean territory supports normal operations.',
    })
  }

  trail.push({
    sourceReference: `Consequence Assessment — ${top.action} [${top.supportLevel} support]`,
    rationale:       top.description,
    contribution:    [
      `This action has ${top.supportLevel} evidence support.`,
      top.precedenceRule ? `Aligned with precedence rule ${top.precedenceRule}.` : null,
      ...(top.reasoning ?? []),
    ].filter(Boolean).join(' '),
  })

  // ── Operational Confidence ──────────────────────────────────────────────────
  // Derived from data visibility: crew data, block data, yard data
  const crewVisible  = shiftContext.crew?.length > 0
  const blockVisible = shiftContext.maintenanceBlocks?.length >= 0   // always present
  const yardVisible  = shiftContext.stations?.some((s) => s.totalLoops !== undefined)
  const deptVisible  = shiftContext.departmentConstraints?.length >= 0
  const visibleCount = [crewVisible, blockVisible, yardVisible, deptVisible].filter(Boolean).length
  const baseConf     = hasIssues ? 78 : 95
  const confScore    = Math.min(99, baseConf + visibleCount * 2)
  const confFactors  = [
    crewVisible  ? '✓ Crew duty data available'       : '✗ Crew data unavailable',
    blockVisible ? '✓ Engineering block data available': '✗ Block data unavailable',
    yardVisible  ? '✓ Yard / loop data available'     : '✗ Yard data unavailable',
    deptVisible  ? '✓ Department constraints loaded'  : '✗ Dept data unavailable',
  ]

  // ── Control Order Draft ─────────────────────────────────────────────────────
  const coNumber  = `CO-${Math.floor(100 + Math.random() * 900)}`
  const shiftMins = shiftContext.shiftStart
    ? (() => { const [h, m] = shiftContext.shiftStart.split(':').map(Number); return h * 60 + m })()
    : 840
  const nowMins   = shiftMins + 32   // ~32 min into shift for demo realism
  const coTime    = `${String(Math.floor(nowMins / 60)).padStart(2, '0')}:${String(nowMins % 60).padStart(2, '0')}`

  // Extract station targets from the recommended action
  const stationMatches = top.action.match(/Station\s+([A-Z])/g) ?? []
  const stationIds     = [...new Set(stationMatches.map((s) => s.replace('Station ', '')))]
  const stationNames   = stationIds.map((id) => {
    const st = shiftContext.stations?.find((s) => s.id === id)
    return st ? `SM ${st.name}` : `SM Station ${id}`
  })

  // Extract train IDs from recommended action or top conflict
  const trainMentioned = top.action.match(/\b(\d{4,5}|[A-Z]{2}-?\d{3,5})\b/)?.[1]
    ?? intelligence.conflicts[0]?.trains[0]
    ?? 'affected train'

  const controlOrder = {
    number:       coNumber,
    time:         coTime,
    to:           stationNames.length > 0 ? stationNames : ['SM affected stations'],
    instruction:  top.action,
    detail:       top.description,
    precedenceRule: top.precedenceRule ?? null,
    issuedBy:     'Threshold AI — pending controller confirmation',
    status:       'DRAFT',
  }

  // ── Crew availability detail for crew risk actions ─────────────────────────
  const crewAvailability = intelligence.crewRisks.map((r) => {
    const crewRecord = shiftContext.crew?.find((c) => c.trainNo === r.trainNo)
    return {
      trainNo:         r.trainNo,
      trainName:       r.trainName,
      level:           r.level,
      dutyRemaining:   r.dutyRemainingMinutes,
      reliefAvailable: crewRecord?.reliefAvailable ?? false,
      reliefLocation:  crewRecord?.reliefLocation  ?? null,
      reliefEta:       crewRecord?.reliefEtaMinutes != null
        ? `${crewRecord.reliefEtaMinutes} min`
        : 'Unknown',
    }
  })

  return {
    recommendation: top.action,
    summary: hasIssues
      ? `${intelligence.conflicts.length} conflict(s) and ${intelligence.crewRisks.length} crew risk(s) detected. "${top.action}" is supported by ${top.precedenceRule ?? 'operational analysis'} and has the strongest consequence profile.`
      : 'Territory clear. No regulation action required. Normal operations recommended.',
    reasoningTrail: trail,
    controlOrder,
    operationalConfidence: { score: confScore, factors: confFactors },
    crewAvailability,
  }
}

export async function mockReEvaluate(shiftContext, intelligence, whatIf, recommendation, challenge) {
  await delay(DELAY_MS)

  const pushesToProceed = /proceed|fine|ok|nothing wrong|overreacting|on time|no risk|disagree/i.test(challenge)
  const addsCaution     = /serious|dangerous|unsafe|concern|risk|history|incident|recall|priority|military|vip|special/i.test(challenge)
  const mentionsPriority = /priority|class|precedence|vip|military|special|arme|art/i.test(challenge)

  let newRec  = recommendation.recommendation
  let changed = false
  let changeReason = ''

  if (mentionsPriority && intelligence.conflicts.length > 0) {
    // Controller has identified a priority that changes the crossing decision
    const altOption = whatIf.options.find(
      (o) => o.id !== 'do_nothing' && o.action !== recommendation.recommendation && o.supportLevel !== 'Weak'
    )
    if (altOption) {
      newRec  = altOption.action
      changed = true
      changeReason = 'Your challenge identified a priority consideration not reflected in the original analysis. The revised recommendation accounts for the corrected precedence.'
    }
  } else if (pushesToProceed && intelligence.conflicts.length > 0) {
    const moderate = whatIf.options.find((o) => o.supportLevel === 'Moderate' && o.id !== 'do_nothing')
    if (moderate) {
      newRec  = moderate.action
      changed = true
      changeReason = 'Your challenge indicates operational pressure to maintain movement. The revised action is less restrictive while still respecting crossing requirements. Monitor closely.'
    }
  } else if (addsCaution && intelligence.conflicts.length === 0) {
    const strong = whatIf.options.find((o) => o.supportLevel === 'Strong' && o.id !== 'do_nothing')
    if (strong) {
      newRec  = strong.action
      changed = true
      changeReason = 'Your challenge introduced operational context that increases the risk assessment. The revised recommendation reflects the additional constraint you identified.'
    }
  }

  return {
    recommendation: newRec,
    changed,
    explanation: changed
      ? `Challenge incorporated. Recommendation revised from "${recommendation.recommendation}" to "${newRec}". ${changeReason}`
      : `Challenge reviewed. Original recommendation "${recommendation.recommendation}" stands. ${
          intelligence.conflicts.length > 0
            ? `The active crossing conflict and precedence rule ${intelligence.conflicts[0]?.precedence?.ruleId} remain in effect. The challenge does not introduce information that overrides the precedence decision.`
            : 'No conflicts were detected and the challenge does not introduce new operational constraints.'
        }`,
  }
}

// ── Override Impact Simulation ────────────────────────────────────────────────
// Called automatically when the controller overrides the AI recommendation.
// Classifies the reason, re-simulates consequences of the human decision,
// and produces a structured impact assessment.

const OVERRIDE_CATEGORIES = [
  { pattern: /vip|special train|presidential|dignitiary/i,     category: 'External Operational Requirement', code: 'EOR' },
  { pattern: /safety|unsafe|risk|danger|concern/i,              category: 'Safety Concern',                   code: 'SAF' },
  { pattern: /platform|yard|congestion|capacity|loop full/i,    category: 'Local Station Condition',          code: 'LSC' },
  { pattern: /block|maintenance|engineering|ohe|trd|s&t/i,      category: 'Infrastructure Constraint',        code: 'INF' },
  { pattern: /emergency|accident|arme|art|medical/i,            category: 'Emergency Response',               code: 'EMR' },
  { pattern: /instruction|directive|order|officer|superior/i,   category: 'Administrative Direction',         code: 'ADM' },
  { pattern: /crew|relief|duty|tlc/i,                           category: 'Resource Constraint',              code: 'RES' },
]

function classifyOverride(reason) {
  for (const rule of OVERRIDE_CATEGORIES) {
    if (rule.pattern.test(reason)) {
      return { category: rule.category, code: rule.code }
    }
  }
  return { category: 'Operational Judgement', code: 'OPJ' }
}

export async function mockSimulateOverride(shiftContext, intelligence, recommendation, overrideReason) {
  await delay(DELAY_MS)

  const classification = classifyOverride(overrideReason)
  const trains         = shiftContext.trains ?? []
  const conflicts      = intelligence.conflicts ?? []
  const crewRisks      = intelligence.crewRisks ?? []

  // Build per-train impact of the human decision vs the AI decision
  // The override typically causes one train to wait that wouldn't have under the AI recommendation
  const trainImpacts = trains
    .filter((t) => t.trainType !== 'Departmental')
    .map((t) => {
      // Which trains are mentioned in the override reason or involved in conflicts?
      const inConflict = conflicts.some((c) => c.trains.includes(t.trainNo))
      const isHighPriority = (t.priority ?? 0) >= 70

      let additionalDelay = 0
      let impactNote      = 'No additional impact from controller decision.'

      if (inConflict) {
        if (isHighPriority) {
          // High-priority train in conflict — override may have held it
          if (/hold|wait|rajdhani|express|vande/i.test(overrideReason)) {
            additionalDelay = 8
            impactNote      = `${t.trainName} held 8 min by controller decision. Total delay: ${t.delayMinutes + additionalDelay} min.`
          } else {
            additionalDelay = 0
            impactNote      = `${t.trainName} unaffected — override directed action elsewhere.`
          }
        } else {
          // Lower priority train — likely benefited from override if high priority was held
          additionalDelay = -3
          impactNote      = `${t.trainName} gained ~3 min from revised regulation order.`
        }
      } else if (t.delayMinutes > 0) {
        impactNote = `${t.trainName} running ${t.delayMinutes} min late — override does not directly affect this service.`
      }

      return {
        trainNo:         t.trainNo,
        trainName:       t.trainName,
        trainType:       t.trainType,
        delayBefore:     t.delayMinutes,
        additionalDelay,
        delayAfter:      Math.max(0, t.delayMinutes + additionalDelay),
        impactNote,
      }
    })

  // Crew compliance check — does the override affect crew expiry windows?
  const crewImpact = crewRisks.map((r) => {
    const addedDelay = trainImpacts.find((ti) => ti.trainNo === r.trainNo)?.additionalDelay ?? 0
    const newRemaining = r.dutyRemainingMinutes - addedDelay
    return {
      trainNo:      r.trainNo,
      trainName:    r.trainName,
      level:        r.level,
      dutyBefore:   r.dutyRemainingMinutes,
      dutyAfter:    Math.max(0, newRemaining),
      status:       newRemaining > 30 ? 'Safe' : newRemaining > 0 ? 'At Risk' : 'Exceeded',
      note:         newRemaining <= 0
        ? `⚠ Crew duty violated by override — immediate TLC coordination required.`
        : newRemaining <= 30
          ? `Crew window tight after override — arrange relief before departure.`
          : `Crew compliance maintained.`,
    }
  })

  // Conflict resolution status
  const conflictStatus = conflicts.map((c) => {
    const resolved = !/no action|do nothing/i.test(overrideReason)
    return {
      trains:   c.trainNames.join(' vs '),
      section:  c.section,
      resolved,
      note:     resolved
        ? `Conflict resolved by controller regulation. ${c.trainNames[1]} given revised crossing order.`
        : `Conflict status unclear — confirm crossing arrangement with SM ${c.loopStation ?? 'affected station'}.`,
    }
  })

  // Network totals
  const totalDelayBefore = trainImpacts.reduce((s, t) => s + t.delayBefore, 0)
  const totalDelayAfter  = trainImpacts.reduce((s, t) => s + t.delayAfter, 0)
  const crewViolations   = crewImpact.filter((c) => c.status === 'Exceeded').length
  const confScore        = crewViolations > 0 ? 62 : totalDelayAfter > totalDelayBefore + 10 ? 72 : 78

  return {
    overrideReason,
    classification,
    trainImpacts,
    crewImpact,
    conflictStatus,
    networkSummary: {
      totalDelayBefore,
      totalDelayAfter,
      deltaDelay:      totalDelayAfter - totalDelayBefore,
      crewViolations,
      operationalRisk: crewViolations > 0 ? 'High' : totalDelayAfter > totalDelayBefore + 15 ? 'Medium' : 'Low',
      operationalConfidence: confScore,
    },
  }
}

// ── Action Plan Builder ───────────────────────────────────────────────────────
// Generates one plan item per detected issue.
// Each item has: priority, title, issueType, recommendation, consequences, hiddenWeakness.

export async function mockBuildActionPlan(shiftContext, intelligence) {
  await delay(DELAY_MS)

  const items = []
  let seq = 1

  // ── Issue: Crossing Conflict or Emergency Halt ──────────────────────────────
  for (const c of intelligence.conflicts ?? []) {
    const isEmergency = c.type === 'EMERGENCY_HALT'
    const loopT = c.precedence?.loop
    const passT = c.precedence?.pass

    if (isEmergency) {
      const mins = shiftContext.minutesToImpact?.[c.trains[0]] ?? '?'
      items.push({
        id:        `emergency_${c.trains[0]}`,
        seq,
        priority:  c.riskLevel === 'HIGH' ? 'CRITICAL' : 'HIGH',
        issueType: 'Emergency — Track Anomaly',
        title:     `HALT ${c.trainNames[0]} — ${mins} min from suspect section`,
        description: c.description,
        recommendedAction: c.recommendedAction,
        precedenceRule: 'PR-EMERGENCY',
        ruleReason: c.precedence?.ruleReason,
        consequences: {
          passengerPunctuality: `${c.trainNames[0]} stopped. Delay until P-Way clearance — minimum 28 min.`,
          freightThroughput:    'Freight in block status unknown. Section blocked until inspection.',
          crewCompliance:       'Monitor crew duty during hold. Extended stops may trigger expiry.',
          cascadeImpact:        'All trains behind will be delayed. Network impact grows with inspection time.',
          departmentImpact:     'P-Way inspection team must be dispatched immediately. ETA 28 min.',
        },
        hiddenWeakness: `Stopping the Rajdhani at the loop is the safe choice — but if the track report turns out to be a false alarm (loose ballast, not a fracture), you will have caused 30+ minutes of delay to the highest-priority train in the section. The controller must weigh the cost of a wrong stop against the cost of a wrong proceed. Threshold recommends: stop first, verify second. A false alarm is recoverable. A derailment is not.`,
        resolved: false,
      })
      seq++
    } else {
      const fi = shiftContext.freightInfo?.find((f) => f.trainNo === loopT?.trainNo)
      items.push({
        id:        `conflict_${c.trains.join('_')}`,
        seq,
        priority:  c.riskLevel === 'HIGH' ? 'CRITICAL' : 'HIGH',
        issueType: 'Crossing Conflict',
        title:     `${c.trainNames[0]} vs ${c.trainNames[1]} — Section ${c.section}`,
        description: c.description,
        recommendedAction: c.loopAvailable
          ? `Loop ${loopT?.trainName ?? 'lower-priority train'} at Station ${c.loopStation}`
          : `Hold ${loopT?.trainName ?? 'lower-priority train'} at ${loopT?.currentStation ?? 'current station'}`,
        precedenceRule: c.precedence?.ruleId,
        ruleReason:     c.precedence?.ruleReason,
        consequences: {
          passengerPunctuality: `${passT?.trainName} delay: ${passT?.delayMinutes ?? 0} → ~${Math.max(0, (passT?.delayMinutes ?? 0) - 10)} min`,
          freightThroughput:    fi
            ? `${loopT?.trainName} (${fi.cargo}, cost: ${fi.delayCost}) delayed ~7 min`
            : `${loopT?.trainName} delayed ~7 min`,
          crewCompliance:       'No crew impact from this action alone',
          cascadeImpact:        'Conflict resolved. Downstream trains unaffected.',
          departmentImpact:     'No department coordination required',
        },
        hiddenWeakness: c.loopAvailable
          ? `Looping ${loopT?.trainName} at Station ${c.loopStation} consumes one loop line. If a subsequent train also needs that loop within the next 20 minutes, a secondary conflict may emerge. Check loop availability before confirming.`
          : `Holding ${loopT?.trainName} at ${loopT?.currentStation} extends its crew duty window. If crew has limited time remaining, this hold may trigger a secondary crew expiry risk.`,
        resolved: false,
      })
      seq++
    }
  }

  // ── Issue: Crew Expiry ────────────────────────────────────
  for (const r of intelligence.crewRisks ?? []) {
    const crewRecord = shiftContext.crew?.find((c) => c.trainNo === r.trainNo)
    items.push({
      id:        `crew_${r.trainNo}`,
      seq,
      priority:  r.level === 'CRITICAL' ? 'CRITICAL' : r.level === 'WARNING' ? 'HIGH' : 'MEDIUM',
      issueType: 'Crew Expiry Risk',
      title:     `${r.trainName} — ${r.dutyRemainingMinutes} min duty remaining`,
      description: r.recommendedAction,
      recommendedAction: r.reliefAvailable
        ? `Arrange crew relief at Station ${r.reliefStation} (${crewRecord?.reliefLocation ?? 'Crew Lobby'}, ETA ${crewRecord?.reliefEtaMinutes ?? '?'} min)`
        : `Stable train at next available station. Contact TLC for nearest crew.`,
      precedenceRule: 'PR-05',
      ruleReason:     `Crew duty compliance is mandatory. ${r.level === 'CRITICAL' ? 'Crew will expire before destination — immediate action required.' : 'Crew window is tight — arrange relief before departure.'}`,
      consequences: {
        passengerPunctuality: r.reliefAvailable
          ? `${r.trainName} brief stop at Station ${r.reliefStation} — ~5 min delay`
          : `${r.trainName} held at station pending TLC coordination — delay variable`,
        freightThroughput:    'Unaffected',
        crewCompliance:       r.reliefAvailable
          ? `Duty violation prevented. Relief crew takes over at Station ${r.reliefStation}.`
          : 'TLC coordination required. Risk of duty violation if not resolved urgently.',
        cascadeImpact:        'No downstream cascade from crew relief stop',
        departmentImpact:     'TLC coordination required to confirm crew availability',
      },
      hiddenWeakness: r.reliefAvailable
        ? `Relief crew at ${crewRecord?.reliefLocation} has ETA ${crewRecord?.reliefEtaMinutes ?? '?'} min. If the train is delayed further by the crossing conflict resolution, the relief window may close before the train arrives at Station ${r.reliefStation}. Resolve the crossing conflict first to protect this window.`
        : `Without relief, stabilising the train at the next station will block that platform. If another train is scheduled to arrive at the same platform within the hold window, a secondary platform conflict will emerge.`,
      resolved: false,
    })
    seq++
  }

  // ── Issue: Dept Movement Block ────────────────────────────
  for (const d of (intelligence.deptImpacts ?? []).filter((d) => d.blocksMovement)) {
    items.push({
      id:        `dept_${d.department}_${d.type.replace(/\s+/g, '_')}`,
      seq,
      priority:  'HIGH',
      issueType: `${d.category} Constraint`,
      title:     `${d.department} — ${d.type}`,
      description: d.description,
      recommendedAction: `Coordinate with ${d.department} to obtain clearance. Affected trains: ${d.affectedTrains.join(', ') || 'none identified'}. Constraint active until ${d.until}.`,
      precedenceRule: null,
      ruleReason:     `Movement is blocked by a ${d.category.toLowerCase()} constraint from ${d.department}. No train can depart until ${d.department} clears the restriction.`,
      consequences: {
        passengerPunctuality: `Affected trains held until clearance. Delay depends on ${d.department} response time.`,
        freightThroughput:    d.affectedTrains.length ? 'May affect freight departure if constraint persists' : 'Unaffected',
        crewCompliance:       'Monitor crew duty windows during hold. Extended delays may trigger crew expiry.',
        cascadeImpact:        `If clearance is delayed beyond ${d.until}, downstream services will be compressed.`,
        departmentImpact:     `${d.department} must issue formal clearance before departure. Escalate if no response within 10 minutes.`,
      },
      hiddenWeakness: `Waiting for ${d.department} clearance may coincide with the crew expiry window of the affected train. If clearance arrives after the crew duty expires, you will face a compound constraint — movement permitted but no crew to operate. Resolve the crew issue in parallel with this coordination.`,
      resolved: false,
    })
    seq++
  }

  // ── Issue: Engineering Block Optimisation ─────────────────
  for (const bw of intelligence.blockWindows ?? []) {
    if (bw.recommendation) {
      items.push({
        id:        `block_${bw.blockId}`,
        seq,
        priority:  'MEDIUM',
        issueType: 'Engineering Block',
        title:     `${bw.location} — Suboptimal Block Window`,
        description: `Current block ${bw.startTime ?? bw.windows[0]?.startTime}–${bw.endTime ?? bw.windows[0]?.endTime} affects ${bw.windows[0]?.affectedTrainCount ?? 'multiple'} train(s). A better window exists.`,
        recommendedAction: `Request ${bw.department} shift block to ${bw.recommendation.startTime}–${bw.recommendation.endTime} window. ${bw.recommendation.note}`,
        precedenceRule: null,
        ruleReason:     `Current window has higher passenger impact (~${bw.windows[0]?.estimatedDelayMinutes} min delay). The ${bw.recommendation.startTime} window reduces this to ~${bw.recommendation.estimatedDelayMinutes} min.`,
        consequences: {
          passengerPunctuality: `Shifting block saves ~${(bw.windows[0]?.estimatedDelayMinutes ?? 0) - bw.recommendation.estimatedDelayMinutes} min of passenger delay`,
          freightThroughput:    'Freight unaffected by window change',
          crewCompliance:       'No crew impact',
          cascadeImpact:        'Reduced overall network delay if block is moved',
          departmentImpact:     `${bw.department} must agree to shift. This is a request, not a mandate.`,
        },
        hiddenWeakness: `The ${bw.recommendation.startTime} window assumes fewer trains are in the section at that time. If a late-running train carries over into that window, the impact estimate may be higher than projected. Verify late-running services before committing to the window change.`,
        resolved: false,
      })
      seq++
    }
  }

  // Sort: CRITICAL → HIGH → MEDIUM
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
  items.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9))

  // Re-sequence after sort
  items.forEach((item, i) => { item.seq = i + 1 })

  return { items }
}

export async function mockGetIssueRecommendation(shiftContext, intelligence, issue) {
  await delay(DELAY_MS)

  // Emergency issues get a dedicated emergency recommendation
  if (issue.issueType === 'Emergency — Track Anomaly' || issue.precedenceRule === 'PR-EMERGENCY') {
    return mockGetRecommendation(shiftContext, intelligence, { options: [] })
  }

  const trail = []

  // Source: the issue itself
  trail.push({
    sourceReference: `Issue #${issue.seq}: ${issue.title} [${issue.priority}]`,
    rationale:       issue.description,
    contribution:    `This is the primary driver of this recommendation. Priority: ${issue.priority}. ${issue.ruleReason ?? ''}`,
  })

  // Hidden weakness — shown as a caution step
  trail.push({
    sourceReference: 'Hidden Weakness Analysis',
    rationale:       issue.hiddenWeakness,
    contribution:    'This secondary risk was identified during consequence simulation. The recommended action accounts for it — but monitor closely after execution.',
  })

  // Consequence summary
  trail.push({
    sourceReference: `Consequence Simulation: ${issue.recommendedAction}`,
    rationale:       Object.values(issue.consequences).join(' '),
    contribution:    'This action has the strongest evidence support for resolving this specific issue with minimal network side-effects.',
  })

  const opConf  = issue.priority === 'CRITICAL' ? 82 : issue.priority === 'HIGH' ? 88 : 92
  const coNum   = `CO-${Math.floor(100 + Math.random() * 900)}`
  const shiftMins = (() => { const sc = shiftContext.shiftStart ?? '14:00'; const [h,m] = sc.split(':').map(Number); return h*60+m })()
  const nowMins   = shiftMins + 32 + (issue.seq * 4)
  const coTime    = `${String(Math.floor(nowMins/60)).padStart(2,'0')}:${String(nowMins%60).padStart(2,'0')}`

  const stationMatches = issue.recommendedAction.match(/Station\s+([A-Z])/g) ?? []
  const stationIds     = [...new Set(stationMatches.map((s) => s.replace('Station ', '')))]
  const stationNames   = stationIds.map((id) => {
    const st = shiftContext.stations?.find((s) => s.id === id)
    return st ? `SM ${st.name}` : `SM Station ${id}`
  })

  return {
    recommendation: issue.recommendedAction,
    summary:        `Issue #${issue.seq} (${issue.priority}): ${issue.title}. ${issue.recommendedAction}`,
    reasoningTrail: trail,
    controlOrder: {
      number:        coNum,
      time:          coTime,
      to:            stationNames.length > 0 ? stationNames : [`${issue.issueType} coordinator`],
      instruction:   issue.recommendedAction,
      detail:        issue.description,
      precedenceRule: issue.precedenceRule ?? null,
      issuedBy:      'Threshold AI — pending controller confirmation',
      status:        'DRAFT',
    },
    operationalConfidence: {
      score:   opConf,
      factors: [
        '✓ Crew duty data available',
        '✓ Loop availability confirmed',
        '✓ Department constraint data loaded',
        issue.hiddenWeakness ? '⚠ Hidden weakness detected — monitor after execution' : '✓ No secondary risks identified',
      ],
    },
    crewAvailability: [],
    issueId: issue.id,
  }
}
