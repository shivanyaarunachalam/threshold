'use strict'

require('dotenv').config()

const express = require('express')
const cors    = require('cors')
const routes  = require('./src/routes')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    /\.vercel\.app$/,           // all Vercel preview/prod deployments
    process.env.FRONTEND_URL,  // explicit override if set
  ].filter(Boolean),
}))

app.use(express.json({ limit: '2mb' }))
app.use('/api', routes)
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))
app.get('/healthz', (_req, res) =>
  res.status(200).json({
    status: 'ok',
    ts: new Date().toISOString()
  })
)
const server = app.listen(PORT, () => {
  console.log(`Threshold backend running on http://localhost:${PORT}`)
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY not set — AI calls will fail')
  }
})

// Keep connections alive longer than Claude's 90s max response time
server.keepAliveTimeout = 120_000
server.headersTimeout   = 125_000
