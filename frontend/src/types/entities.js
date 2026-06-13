/**
 * Threshold v2 — Entity Types
 * The 10 entities that make up a shift context.
 */

// ── Priority Hierarchy ────────────────────────────────────────────────────────
// Based on actual Indian Railways precedence.
// Higher number = higher priority. Controller must respect this order.

export const TRAIN_PRIORITY = {
  // Emergency / Relief
  'ARME':              100,   // Accident Relief Medical Equipment
  'ART':               99,    // Accident Relief Train
  // VIP
  'VVIP Special':      98,
  'Presidential':      97,
  // High-speed passenger
  'Vande Bharat':      95,
  'Rajdhani':          93,
  'Shatabdi':          91,
  'Duronto':           89,
  // Peak suburban (rush hour — treated as high priority)
  'Peak Suburban':     85,
  // Mail / Express
  'Superfast':         80,
  'Mail':              75,
  'Express':           70,
  // Ordinary passenger
  'Passenger':         55,
  'Suburban':          50,
  'MEMU':              48,
  'DEMU':              46,
  // Special freight
  'Military Special':  95,    // same tier as Vande Bharat by operational convention
  'Perishable Special':82,
  // Goods
  'Container Freight': 40,
  'Automobile':        38,
  'Petroleum':         45,    // petroleum slightly higher due to hazmat priority
  'Coal Freight':      20,
  'Empty Rake':         5,
  // Departmental / Engineering
  'Departmental':      15,
  'Engineering Special':12,
  'Tower Wagon':       10,
}

// Freight cargo overrides base 'Freight' type priority
export const FREIGHT_PRIORITY = {
  'Military':    95,
  'Perishable':  82,
  'Petroleum':   45,
  'Automobile':  38,
  'Container':   40,
  'Coal':        20,
  'Empty Rake':   5,
}

export const FREIGHT_DELAY_COST = {
  'Military':    'Extreme',
  'Perishable':  'Very High',
  'Petroleum':   'High',
  'Automobile':  'Medium',
  'Container':   'Medium',
  'Coal':        'Low',
  'Empty Rake':  'Minimal',
}

// ── Precedence Rules ──────────────────────────────────────────────────────────
// Applied by the conflict resolver — these are non-negotiable rules that
// override pure delay-minimisation logic.

export const PRECEDENCE_RULES = [
  {
    id:   'PR-01',
    name: 'Emergency trains have absolute precedence',
    test: (a, b) => ['ARME', 'ART'].includes(a.trainType),
    outcome: 'Pass A unconditionally. Loop or hold B regardless of delay impact.',
  },
  {
    id:   'PR-02',
    name: 'On-time train preferred over late train of same class',
    test: (a, b) => a.priority === b.priority && a.delayMinutes === 0 && b.delayMinutes > 0,
    outcome: 'Pass A. Loop B. A is running to schedule; B has already absorbed delay.',
  },
  {
    id:   'PR-03',
    name: 'Higher-priority train passes, lower loops',
    test: (a, b) => a.priority > b.priority,
    outcome: 'Pass A. Loop B at earliest available loop station.',
  },
  {
    id:   'PR-04',
    name: 'Late high-priority train still passes over on-time lower-priority',
    // Exception to PR-02: Rajdhani 20 min late still beats on-time goods
    test: (a, b) => a.priority >= 70 && b.priority < 50 && a.delayMinutes > 0,
    outcome: 'Pass A despite delay. B loops. Priority class difference outweighs punctuality.',
  },
  {
    id:   'PR-05',
    name: 'Crew-expiring train may be held at station even if higher priority',
    test: (a, b, crewMap) => {
      const aCrew = crewMap[a.trainNo]
      return aCrew && aCrew.dutyRemainingMinutes < 30
    },
    outcome: 'A must be stabilised for crew change regardless of priority. Coordinate with TLC.',
  },
]

// ── Department Constraints ────────────────────────────────────────────────────
// Non-train entities that constrain what the controller can recommend.

/**
 * @typedef {Object} DepartmentConstraint
 * @property {'Engineering'|'Traction'|'S&T'|'C&W'|'Commercial'|'Security'} department
 * @property {string}  type        — what the constraint is
 * @property {string}  description — human-readable detail
 * @property {string}  affectedSection — station or KM range
 * @property {string}  until
 * @property {boolean} blocksMovement  — does this prevent train movement?
 */

// ── Core entity types ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} Train
 * @property {string}  trainNo
 * @property {string}  trainName
 * @property {keyof TRAIN_PRIORITY} trainType
 * @property {number}  priority
 * @property {string}  currentStation
 * @property {string}  nextStation
 * @property {number}  currentSpeedKmh
 * @property {number}  delayMinutes
 * @property {string}  destination
 * @property {'on_time'|'late'|'early'} punctualityStatus
 */

/**
 * @typedef {Object} Station
 * @property {string}  id
 * @property {string}  name
 * @property {number}  totalLoops
 * @property {number}  occupiedLoops
 * @property {number}  loopLengthMeters  — max train length the loop can hold
 */

/**
 * @typedef {Object} Section
 * @property {string}  from
 * @property {string}  to
 * @property {number}  distanceKm
 * @property {boolean} doubleLine
 * @property {number}  maxSpeedKmh
 */

/**
 * @typedef {Object} Crew
 * @property {string}  trainNo
 * @property {number}  dutyRemainingMinutes
 * @property {boolean} reliefAvailable
 * @property {string|null} reliefStation
 */

/**
 * @typedef {Object} MaintenanceBlock
 * @property {string}  id
 * @property {string}  location
 * @property {string}  sectionFrom
 * @property {string}  sectionTo
 * @property {string}  startTime
 * @property {string}  endTime
 * @property {string}  requestedBy
 * @property {'PWI'|'TRD'|'S&T'|'C&W'|'OHE'} department
 * @property {boolean} approved
 */

/**
 * @typedef {Object} SpeedRestriction
 * @property {string}  location
 * @property {number}  limitKmh
 * @property {string}  reason
 * @property {string}  until
 */

/**
 * @typedef {Object} FreightInfo
 * @property {string}  trainNo
 * @property {keyof FREIGHT_PRIORITY} cargo
 * @property {number}  priority
 * @property {keyof FREIGHT_DELAY_COST} delayCost
 * @property {number}  weightTonnes   — affects restart time on gradients
 * @property {number}  lengthMeters   — affects loop fit
 */

/**
 * @typedef {Object} ShiftContext
 * @property {string}               shiftStart
 * @property {string}               handoverNote
 * @property {Train[]}              trains
 * @property {Station[]}            stations
 * @property {Section[]}            sections
 * @property {TimetableEntry[]}     timetable
 * @property {Crew[]}               crew
 * @property {MaintenanceBlock[]}   maintenanceBlocks
 * @property {SpeedRestriction[]}   speedRestrictions
 * @property {FreightInfo[]}        freightInfo
 * @property {DepartmentConstraint[]} departmentConstraints
 */
