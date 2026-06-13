/**
 * Scenario 01 — Kazipet Emergency
 * Unverified track anomaly. Three trains converging. Radio contact lost.
 * Type: Life-safety emergency under incomplete information.
 */
export const scenario = {
  id: '01',
  name: 'Kazipet Emergency',
  tagline: 'Unverified rail fracture report. 3 trains. 9 minutes.',
  difficulty: 'CRITICAL',
  region: 'South Central Railway — Kazipet Division',

  shiftStart: '18:30',
  historicalContext: {
    title: 'Scenario Type: Unverified Emergency Report Under Traffic Pressure',
    summary: 'Inspired by real operational conditions where field-level anomaly reports reach the control office while multiple trains are already in motion. The controller has minutes to decide with incomplete information.',
    lesson: 'The hardest decisions are not about what you know — they are about what you do when you do not know, and trains are still moving.',
  },

  weather: {
    condition: 'Heavy Monsoon Rain',
    visibilityKm: 0.8,
    rainMm: 28,
    windKmh: 60,
    note: 'Monsoon conditions. Emergency braking overshoot: 200–400m beyond nominated stopping point.',
  },

  trains: [
    { trainNo: '12723', trainName: 'Telangana Rajdhani', trainType: 'Rajdhani', priority: 93, currentStation: 'Kazipet Jn', nextStation: 'Ramagundam', currentSpeedKmh: 120, delayMinutes: 0, destination: 'Hazrat Nizamuddin', punctualityStatus: 'on_time' },
    { trainNo: '17015', trainName: 'Visakha Express', trainType: 'Express', priority: 70, currentStation: 'Peddapalli', nextStation: 'Ramagundam', currentSpeedKmh: 95, delayMinutes: 6, destination: 'Visakhapatnam', punctualityStatus: 'late' },
    { trainNo: '58007', trainName: 'Coal Freight', trainType: 'Coal Freight', priority: 20, currentStation: 'In Block', nextStation: 'Ramagundam', currentSpeedKmh: 45, delayMinutes: 12, destination: 'Ramagundam', punctualityStatus: 'late' },
    { trainNo: '17230', trainName: 'Hyderabad–Vizag Express', trainType: 'Express', priority: 70, currentStation: 'Ramagundam', nextStation: 'Sirpur Kaghaznagar', currentSpeedKmh: 0, delayMinutes: 0, destination: 'Visakhapatnam', punctualityStatus: 'on_time' },
  ],

  stations: [
    { id: 'Kazipet Jn', name: 'Kazipet Junction', totalLoops: 4, occupiedLoops: 1, loopLengthMeters: 800 },
    { id: 'Peddapalli', name: 'Peddapalli', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 700 },
    { id: 'Ramagundam', name: 'Ramagundam', totalLoops: 3, occupiedLoops: 1, loopLengthMeters: 750 },
    { id: 'In Block', name: 'In Block Section', totalLoops: 0, occupiedLoops: 0, loopLengthMeters: 0 },
    { id: 'Sirpur Kaghaznagar', name: 'Sirpur Kaghaznagar', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 680 },
  ],

  sections: [
    { from: 'Kazipet Jn', to: 'Ramagundam', distanceKm: 44, doubleLine: false, maxSpeedKmh: 130 },
    { from: 'Peddapalli', to: 'Ramagundam', distanceKm: 18, doubleLine: false, maxSpeedKmh: 110 },
    { from: 'Ramagundam', to: 'Sirpur Kaghaznagar', distanceKm: 52, doubleLine: true, maxSpeedKmh: 100 },
  ],

  timetable: [
    { trainNo: '12723', stationId: 'Ramagundam', scheduledArrival: '18:58', scheduledDeparture: '19:00' },
    { trainNo: '17015', stationId: 'Ramagundam', scheduledArrival: '18:56', scheduledDeparture: '18:58' },
    { trainNo: '58007', stationId: 'Ramagundam', scheduledArrival: '19:05', scheduledDeparture: '19:15' },
  ],

  crew: [
    { trainNo: '12723', dutyRemainingMinutes: 240, reliefAvailable: true, reliefStation: 'Ramagundam', reliefLocation: 'Crew Lobby Platform 2', reliefEtaMinutes: 5 },
    { trainNo: '17015', dutyRemainingMinutes: 85, reliefAvailable: true, reliefStation: 'Ramagundam', reliefLocation: 'Crew Room', reliefEtaMinutes: 10 },
    { trainNo: '58007', dutyRemainingMinutes: 62, reliefAvailable: false, reliefStation: null, reliefLocation: null, reliefEtaMinutes: null },
    { trainNo: '17230', dutyRemainingMinutes: 180, reliefAvailable: true, reliefStation: 'Ramagundam', reliefLocation: 'Crew Room', reliefEtaMinutes: 8 },
  ],

  maintenanceBlocks: [],
  speedRestrictions: [{ location: 'KM 310–315', limitKmh: 15, reason: 'EMERGENCY — Unverified track anomaly. Pending inspection.', until: 'Clearance required' }],
  freightInfo: [{ trainNo: '58007', cargo: 'Coal', priority: 20, delayCost: 'Low', weightTonnes: 4800, lengthMeters: 710 }],

  departmentConstraints: [
    { department: 'P-Way', type: 'Unverified Track Anomaly — KM 312/4', description: 'Loco pilot 17230 reported severe vibration and crack sound at KM 312/4 at 18:47. Track status unconfirmed. P-Way inspection gang is 28 minutes away. Section must be treated as UNSAFE until cleared.', affectedSection: 'KM 310–315', until: 'P-Way clearance', blocksMovement: true, category: 'Safety' },
    { department: 'COM', type: 'No Radio Contact — Coal Freight 58007', description: 'Freight 58007 entered the single-line block 4 minutes ago. Radio contact lost. Position unconfirmed.', affectedSection: 'KM 308–315', until: 'Radio contact restored', blocksMovement: false, category: 'Safety' },
  ],

  emergencyActive: true,
  emergencyType: 'TRACK_ANOMALY',
  emergencyKm: '312/4',
  minutesToImpact: { '12723': 11, '17015': 9, '58007': 4 },

  handoverNote: [
    '⚠ EMERGENCY REPORT RECEIVED — 18:47 IST',
    'Loco pilot of 17230 reports: severe vibration + loud crack at KM 312/4. Possible rail fracture. Train has cleared but track status UNKNOWN.',
    'Rajdhani 12723 approaching from Kazipet — ETA KM 312 approx 11 minutes at 120 km/h.',
    'Visakha Express 17015 approaching from south — ETA KM 312 approx 9 minutes at 95 km/h.',
    'Coal Freight 58007 already inside the single-line block — no radio contact for 4 minutes.',
    'P-Way inspection team 28 minutes away. Heavy rain reducing visibility to 800m.',
  ].join('\n'),
}
