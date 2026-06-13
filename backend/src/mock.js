'use strict'

/**
 * Mock AI engine for Threshold v0.1
 *
 * Returns realistic, scenario-aware fixture data so the full UI flow
 * can be demoed without an Anthropic API key.
 *
 * Logic: each function reads the actual situation inputs and produces
 * responses that reference them by name, so the demo feels live.
 */

const DELAY_MS = 1200 // simulate network latency

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickRiskLevel(situation) {
  const text = Object.values(situation).join(' ').toLowerCase()
  if (text.match(/overdue|critical|failure|fault|emergency|hour 9|hour 10|hour 11/)) return 'high'
  if (text.match(/amber|wet|fog|delay|reduced|maintenance|vibration/)) return 'medium'
  return 'low'
}

function pickQuality(situation) {
  const values = Object.values(situation)
  const short = values.filter((v) => v.trim().length < 10).length
  if (short >= 3) return 'poor'
  if (short >= 1) return 'medium'
  return 'good'
}

// ─── Analyze ─────────────────────────────────────────────────────────────────

async function mockAnalyze(situation) {
  await delay(DELAY_MS)

  const risk = pickRiskLevel(situation)
  const quality = pickQuality(situation)
  const isNovel = situation.driverReport?.toLowerCase().includes('never') ||
                  situation.weather?.toLowerCase().includes('tornado') ||
                  situation.weather?.toLowerCase().includes('earthquake')

  return {
    weakSignals: [
      {
        name: 'Compounded Environmental + Infrastructure Degradation',
        contributingFields: ['Weather Conditions', 'Track Condition', 'Maintenance Status'],
        riskLevel: risk,
        description: `${situation.weather} combined with ${situation.trackCondition.slice(0, 60)} creates a compound braking risk that exceeds individual signal thresholds.`,
      },
      {
        name: 'Crew Fatigue Under Load Pressure',
        contributingFields: ['Crew Status', 'Passenger Load'],
        riskLevel: risk === 'high' ? 'medium' : 'low',
        description: `${situation.crewStatus.slice(0, 80)} with ${situation.passengerLoad.slice(0, 50)} elevates decision-latency risk during an incident response.`,
      },
      {
        name: 'Unverified Driver Anomaly Report',
        contributingFields: ['Driver Report', 'Signal Status'],
        riskLevel: 'medium',
        description: `"${situation.driverReport.slice(0, 80)}" has not been corroborated by trackside sensors. Signal state ${situation.signalStatus.slice(0, 40)} adds ambiguity.`,
      },
    ],
    whyConcerned: `Threshold has detected three overlapping weak signals. In isolation, each falls below the alert threshold. Together — degraded track conditions under adverse weather, a fatigued crew managing near-capacity load, and an unverified anomaly report against an ambiguous signal state — the combined pattern matches historical precursors to slow-speed incidents. No single field is conclusive; the combination is what concerns the engine.`,
    dataQuality: {
      overallRating: quality,
      summary: quality === 'good'
        ? 'All seven operational signals contain sufficient detail for high-confidence analysis.'
        : 'Several signals lack specificity. Analysis confidence is reduced. Flagged fields should be clarified before departure.',
      fieldFlags: [
        ...(situation.maintenanceStatus?.length < 20 ? [{
          field: 'Maintenance Status',
          concern: 'Entry is brief. Exact inspection date and outstanding items would improve signal confidence.',
        }] : []),
        ...(situation.signalStatus?.toLowerCase().includes('amber') ? [{
          field: 'Signal Status',
          concern: 'Amber state is ambiguous — could indicate scheduled caution or equipment fault. Source should be confirmed.',
        }] : []),
        ...(situation.driverReport?.length < 15 ? [{
          field: 'Driver Report',
          concern: 'Very short report. Specific conditions (speed, location, duration) would strengthen the signal.',
        }] : []),
      ],
    },
    unknownSituationCheck: {
      classification: isNovel ? 'unknown/novel' : 'within known patterns',
      explanation: isNovel
        ? 'The submitted situation contains conditions outside the operational patterns in the Threshold reference dataset. Human judgment should be weighted more heavily than AI output for this session.'
        : 'The combination of signals falls within known rail operational patterns. AI confidence is adequate for decision support.',
    },
  }
}

// ─── Simulate ─────────────────────────────────────────────────────────────────

async function mockSimulate(situation, intelligence) {
  await delay(DELAY_MS)

  const risk = intelligence.weakSignals?.[0]?.riskLevel ?? 'medium'
  const highRisk = risk === 'high'

  return {
    options: [
      {
        name: 'Proceed',
        confidenceScore: highRisk ? 18 : 42,
        benefits: 'Maintains schedule adherence and avoids downstream delays across the corridor network.',
        risks: highRisk
          ? 'Proceeding at normal speed with current compound signal state carries significant incident risk. Braking distances on wet/degraded track may be insufficient for emergency stops.'
          : 'Minor schedule flexibility sacrificed. Low residual risk if driver remains vigilant.',
        operationalImpact: 'No delay. Full capacity maintained. Crew workload unchanged.',
        passengerImpact: 'No disruption to passenger journey. ETA unchanged.',
      },
      {
        name: 'Hold',
        confidenceScore: highRisk ? 71 : 38,
        benefits: 'Eliminates exposure to all identified weak signals. Allows time for signal verification and crew relief assessment.',
        risks: 'Service delay of 20–45 minutes. Knock-on impact to connecting services at terminus.',
        operationalImpact: 'Platform hold required. Crew rest opportunity. Maintenance team can verify flagged items.',
        passengerImpact: `${situation.passengerLoad.slice(0, 40)} will experience a delay. Announcement required within 5 minutes of hold decision.`,
      },
      {
        name: 'Inspect',
        confidenceScore: highRisk ? 62 : 55,
        benefits: 'Targeted verification of the driver anomaly report before committing to full service. Resolves the highest-ambiguity signal.',
        risks: 'Inspection adds 15–30 minutes. If fault is found, delay extends to 60+ minutes.',
        operationalImpact: 'Train must be moved to an inspection siding if available, or inspected at platform with platform 2 blocked.',
        passengerImpact: 'Moderate delay with uncertainty on resolution time. Passenger communication is important to manage expectations.',
      },
      {
        name: 'Reduced Speed',
        confidenceScore: highRisk ? 55 : 61,
        benefits: 'Mitigates braking distance risk from track/weather conditions while keeping service moving. Balances safety and schedule.',
        risks: 'Does not address the unverified driver anomaly. If a mechanical fault is present, reduced speed may be insufficient.',
        operationalImpact: 'Speed cap at 60 km/h increases journey time by approximately 8–12 minutes. Downstream connections unaffected.',
        passengerImpact: 'Minor delay. Most passengers will not notice. Preferred option where mechanical fault probability is low.',
      },
    ],
  }
}

// ─── Recommend ────────────────────────────────────────────────────────────────

async function mockRecommend(situation, intelligence, simulation) {
  await delay(DELAY_MS)

  const sorted = [...simulation.options].sort((a, b) => b.confidenceScore - a.confidenceScore)
  const top = sorted[0]

  return {
    recommendation: top.name,
    summary: `Based on compound signal analysis and consequence simulation, ${top.name} has the highest confidence score (${top.confidenceScore}%). The primary drivers are the overlapping environmental degradation signals and the unresolved driver anomaly report.`,
    reasoningTrail: [
      {
        sourceReference: 'Weak Signal: Compounded Environmental + Infrastructure Degradation',
        rationale: `${situation.weather} and ${situation.trackCondition.slice(0, 60)} in combination extend stopping distance beyond normal operational margins.`,
        contribution: 'Elevated braking risk was the primary factor downgrading the Proceed option confidence score.',
      },
      {
        sourceReference: 'Weak Signal: Unverified Driver Anomaly Report',
        rationale: `The driver reported "${situation.driverReport.slice(0, 80)}" which has not been corroborated by trackside sensor data.`,
        contribution: 'Unverified mechanical anomaly increases the risk profile of all moving options (Proceed, Reduced Speed). This signal elevated Hold and Inspect scores.',
      },
      {
        sourceReference: 'Data Quality Assessment: Signal Status Ambiguity',
        rationale: `${situation.signalStatus.slice(0, 80)} is flagged as ambiguous — the cause of the amber state has not been confirmed.`,
        contribution: 'Signal ambiguity reduces confidence in Proceed. Resolving this would allow for a more precise recommendation.',
      },
      {
        sourceReference: `Consequence Simulation: ${top.name} (${top.confidenceScore}% confidence)`,
        rationale: top.benefits,
        contribution: `${top.name} scored highest across safety, operational continuity, and passenger impact dimensions given the current signal combination.`,
      },
    ],
  }
}

// ─── Re-evaluate ─────────────────────────────────────────────────────────────

async function mockReEvaluate(situation, intelligence, simulation, recommendation, challenge) {
  await delay(DELAY_MS)

  const challengeLower = challenge.toLowerCase()
  const suggestsProblematic = challengeLower.match(/proceed|fine|ok|nothing wrong|overreacting|schedule/)
  const suggestsCaution = challengeLower.match(/serious|fault|worse|dangerous|unsafe|concern|risk/)

  // If the human challenge suggests more caution, reinforce; if they push back, hold firm
  const changed = !!suggestsProblematic
  const newRec = suggestsProblematic ? 'Reduced Speed' : recommendation.recommendation

  return {
    recommendation: newRec,
    changed,
    explanation: changed
      ? `Your challenge notes a preference for keeping the service moving. The engine has revised the recommendation from ${recommendation.recommendation} to Reduced Speed as a middle ground — this addresses the braking distance risk from environmental conditions while avoiding a full hold. However, the unverified driver anomaly report remains unresolved. If that anomaly worsens at speed, Inspect should be triggered immediately.`
      : `The human challenge has been reviewed against the current signal combination. The original recommendation of ${recommendation.recommendation} stands. The challenge does not introduce new information that would change the compound risk assessment. The engine's primary concern — the unverified driver anomaly combined with degraded track conditions — remains unaddressed by the challenge input.`,
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  mockAnalyze,
  mockSimulate,
  mockRecommend,
  mockReEvaluate,
}
