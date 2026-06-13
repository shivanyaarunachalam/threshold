/**
 * IST (India Standard Time) timestamp utilities.
 * IST = UTC+5:30 — no daylight saving.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000  // 5h 30m in milliseconds

/**
 * Returns a human-readable IST timestamp string.
 * Format: "YYYY-MM-DD HH:MM:SS IST"
 */
export function toIST(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  return ist.toISOString().replace('T', ' ').slice(0, 19) + ' IST'
}

/**
 * Returns just the IST date portion for filenames.
 * Format: "YYYY-MM-DD"
 */
export function toISTDate(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS)
  return ist.toISOString().slice(0, 10)
}
