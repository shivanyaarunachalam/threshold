'use strict'

/**
 * Validates the intelligence analysis response schema.
 */
function validateIntelligence(data) {
  if (!Array.isArray(data.weakSignals)) throw new Error('Missing weakSignals array')
  if (typeof data.whyConcerned !== 'string') throw new Error('Missing whyConcerned string')
  if (!data.dataQuality || typeof data.dataQuality.overallRating !== 'string') {
    throw new Error('Missing dataQuality.overallRating')
  }
  if (!Array.isArray(data.dataQuality.fieldFlags)) {
    throw new Error('Missing dataQuality.fieldFlags array')
  }
  if (!data.unknownSituationCheck || typeof data.unknownSituationCheck.classification !== 'string') {
    throw new Error('Missing unknownSituationCheck.classification')
  }
}

/**
 * Validates the simulation response schema.
 */
function validateSimulation(data) {
  if (!Array.isArray(data.options) || data.options.length !== 4) {
    throw new Error('Simulation must contain exactly 4 options')
  }
  const required = ['name', 'benefits', 'risks', 'operationalImpact', 'passengerImpact']
  for (const opt of data.options) {
    for (const field of required) {
      if (typeof opt[field] !== 'string') {
        throw new Error(`Simulation option missing field: ${field}`)
      }
    }
  }
}

/**
 * Validates the recommendation response schema.
 */
function validateRecommendation(data) {
  if (typeof data.recommendation !== 'string') throw new Error('Missing recommendation string')
  if (!Array.isArray(data.reasoningTrail) || data.reasoningTrail.length === 0) {
    throw new Error('Missing or empty reasoningTrail')
  }
  for (const step of data.reasoningTrail) {
    if (!step.sourceReference || !step.rationale || !step.contribution) {
      throw new Error('Reasoning trail step missing required fields')
    }
  }
}

/**
 * Validates the re-evaluation response schema.
 */
function validateReEvaluation(data) {
  if (typeof data.recommendation !== 'string') throw new Error('Missing recommendation string')
  if (typeof data.explanation !== 'string') throw new Error('Missing explanation string')
}

module.exports = {
  validateIntelligence,
  validateSimulation,
  validateRecommendation,
  validateReEvaluation,
}
