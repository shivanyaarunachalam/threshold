'use strict'

const express = require('express')
const { callClaude } = require('./claude')
const {
  buildAnalyzePrompt,
  buildActionPlanPrompt,
  buildIssueRecommendationPrompt,
  buildReEvaluatePrompt,
} = require('./prompts')

const router = express.Router()

function handleError(res, err, step) {
  console.error(`[${step}] Error:`, err.message)
  if (err.malformed) console.error(`[${step}] Malformed:`, err.malformed)
  res.status(500).json({ message: err.message, step })
}

/** POST /api/analyze */
router.post('/analyze', async (req, res) => {
  const { shiftContext } = req.body
  if (!shiftContext) return res.status(400).json({ message: 'Missing shiftContext' })
  try {
    const data = await callClaude(buildAnalyzePrompt(shiftContext), 'Analyze')
    res.json(data)
  } catch (err) { handleError(res, err, 'Analyze') }
})

/** POST /api/action-plan */
router.post('/action-plan', async (req, res) => {
  const { shiftContext, intelligence } = req.body
  if (!shiftContext || !intelligence) return res.status(400).json({ message: 'Missing fields' })
  try {
    const data = await callClaude(buildActionPlanPrompt(shiftContext, intelligence), 'ActionPlan')
    res.json(data)
  } catch (err) { handleError(res, err, 'ActionPlan') }
})

/** POST /api/issue-recommend */
router.post('/issue-recommend', async (req, res) => {
  const { shiftContext, intelligence, issue } = req.body
  if (!shiftContext || !intelligence || !issue) return res.status(400).json({ message: 'Missing fields' })
  try {
    const data = await callClaude(buildIssueRecommendationPrompt(shiftContext, intelligence, issue), 'IssueRecommend')
    res.json(data)
  } catch (err) { handleError(res, err, 'IssueRecommend') }
})

/** POST /api/reevaluate */
router.post('/reevaluate', async (req, res) => {
  const { shiftContext, intelligence, whatIf, recommendation, challenge } = req.body
  if (!recommendation || !challenge) return res.status(400).json({ message: 'Missing fields' })
  try {
    const data = await callClaude(buildReEvaluatePrompt(shiftContext, intelligence, whatIf, recommendation, challenge), 'ReEvaluate')
    res.json(data)
  } catch (err) { handleError(res, err, 'ReEvaluate') }
})

/** POST /api/override (impact simulation — keep as mock-compatible pass-through) */
router.post('/override', async (req, res) => {
  res.json({ overrideReason: req.body.overrideReason, classification: { category: 'Operational Judgement', code: 'OPJ' }, trainImpacts: [], crewImpact: [], conflictStatus: [], networkSummary: { totalDelayBefore: 0, totalDelayAfter: 0, deltaDelay: 0, crewViolations: 0, operationalRisk: 'Low', operationalConfidence: 80 } })
})

module.exports = router
