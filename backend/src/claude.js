'use strict'

const Anthropic = require('@anthropic-ai/sdk')
const { SYSTEM_PROMPT } = require('./prompts')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TIMEOUT_MS = 90_000

async function callClaude(prompt, stepName) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const message = await client.messages.create(
      {
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        // System prompt cached — identical across all calls, hits cache after first
        system: [
          {
            type:          'text',
            text:          SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    )

    const raw     = message.content?.[0]?.text ?? ''
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

    if (process.env.NODE_ENV !== 'production') {
      const u = message.usage ?? {}
      console.log(
        `[${stepName}] input:${u.input_tokens ?? 0}` +
        ` cache_write:${u.cache_creation_input_tokens ?? 0}` +
        ` cache_read:${u.cache_read_input_tokens ?? 0}` +
        ` output:${u.output_tokens ?? 0}`
      )
    }

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      const err     = new Error(`${stepName}: AI response was not valid JSON`)
      err.malformed = raw
      throw err
    }

    return parsed
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`${stepName}: Request timed out after 90 seconds`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

module.exports = { callClaude }
