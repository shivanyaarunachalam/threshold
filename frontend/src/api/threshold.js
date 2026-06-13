import {
  mockAnalyzeSituation,
  mockSimulateConsequences,
  mockGetRecommendation,
  mockReEvaluate as mockReEvaluateFn,
  mockSimulateOverride as mockSimulateOverrideFn,
  mockBuildActionPlan as mockBuildActionPlanFn,
  mockGetIssueRecommendation as mockGetIssueRecommendationFn,
} from './mocks.js'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'
const BASE      = (import.meta.env.VITE_API_URL ?? '') + '/api'
const TIMEOUT   = 95_000  // 95s — gives backend 90s + 5s buffer

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message || `Request failed (${res.status})`)
    }
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Request timed out after 30 seconds')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export function analyzeSituation(shiftContext) {
  if (USE_MOCKS) return mockAnalyzeSituation(shiftContext)
  return fetchWithTimeout(`${BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftContext }),
  })
}

export function simulateConsequences(shiftContext, intelligence) {
  if (USE_MOCKS) return mockSimulateConsequences(shiftContext, intelligence)
  return fetchWithTimeout(`${BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftContext, intelligence }),
  })
}

export function getRecommendation(shiftContext, intelligence, whatIf) {
  if (USE_MOCKS) return mockGetRecommendation(shiftContext, intelligence, whatIf)
  return fetchWithTimeout(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftContext, intelligence, whatIf }),
  })
}

export function reEvaluate(shiftContext, intelligence, whatIf, recommendation, challenge) {
  if (USE_MOCKS) return mockReEvaluateFn(shiftContext, intelligence, whatIf, recommendation, challenge)
  return fetchWithTimeout(`${BASE}/reevaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftContext, intelligence, whatIf, recommendation, challenge }),
  })
}

export function simulateOverride(shiftContext, intelligence, recommendation, overrideReason) {
  if (USE_MOCKS) return mockSimulateOverrideFn(shiftContext, intelligence, recommendation, overrideReason)
  return fetchWithTimeout(`${BASE}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftContext, intelligence, recommendation, overrideReason }),
  })
}

export function buildActionPlan(shiftContext, intelligence) {
  if (USE_MOCKS) return mockBuildActionPlanFn(shiftContext, intelligence)
  return fetchWithTimeout(`${BASE}/action-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftContext, intelligence }),
  })
}

export function getIssueRecommendation(shiftContext, intelligence, issue) {
  if (USE_MOCKS) return mockGetIssueRecommendationFn(shiftContext, intelligence, issue)
  return fetchWithTimeout(`${BASE}/issue-recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shiftContext, intelligence, issue }),
  })
}
