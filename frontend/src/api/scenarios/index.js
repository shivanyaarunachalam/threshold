/**
 * Threshold — Scenario Library
 *
 * Five real-world-inspired operational situations.
 * Each file contains ONLY factual shift data — no pre-baked conclusions.
 * The AI reasons from this data alone.
 *
 * Usage:
 *   import { SCENARIOS } from './scenarios'
 *   const scenario = SCENARIOS[id]
 */

export { scenario as scenario_01 } from './01_kazipet_emergency'
export { scenario as scenario_02 } from './02_delayed_rajdhani'
export { scenario as scenario_03 } from './03_night_freight_jam'
export { scenario as scenario_04 } from './04_monsoon_clearance'
export { scenario as scenario_05 } from './05_crew_cascade'

import { scenario as s1 } from './01_kazipet_emergency'
import { scenario as s2 } from './02_delayed_rajdhani'
import { scenario as s3 } from './03_night_freight_jam'
import { scenario as s4 } from './04_monsoon_clearance'
import { scenario as s5 } from './05_crew_cascade'

export const SCENARIOS = [s1, s2, s3, s4, s5]
