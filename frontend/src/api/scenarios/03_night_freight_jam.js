/**
 * Scenario 03 — Night Freight Jam
 * Post-midnight. Three freight trains competing for the same corridor.
 * Crew expiries, a maintenance block, and a perishable cargo train that
 * cannot wait — milk and vegetables for a morning market.
 */
export const scenario = {
  id: '03',
  name: 'Night Freight Jam',
  tagline: 'Perishable cargo. Crew expiries. One corridor.',
  difficulty: 'HIGH',
  region: 'Southern Railway — Chennai Division',

  shiftStart: '01:30',
  historicalContext: null,

  weather: {
    condition: 'Partly Cloudy',
    visibilityKm: 8,
    rainMm: 2,
    windKmh: 18,
    note: 'Light overnight drizzle. Minor adhesion reduction. Not operationally significant.',
  },

  trains: [
    { trainNo: 'PKS-001', trainName: 'Perishables Special', trainType: 'Perishable Special', priority: 82, currentStation: 'Jolarpettai', nextStation: 'Katpadi', currentSpeedKmh: 70, delayMinutes: 0, destination: 'Chennai Central', punctualityStatus: 'on_time' },
    { trainNo: 'COA-221', trainName: 'Coal Freight South', trainType: 'Coal Freight', priority: 20, currentStation: 'Jolarpettai', nextStation: 'Katpadi', currentSpeedKmh: 55, delayMinutes: 18, destination: 'Ennore', punctualityStatus: 'late' },
    { trainNo: 'CTN-089', trainName: 'Container Freight', trainType: 'Container Freight', priority: 40, currentStation: 'Ambur', nextStation: 'Vaniyambadi', currentSpeedKmh: 60, delayMinutes: 0, destination: 'Chennai Port', punctualityStatus: 'on_time' },
    { trainNo: '16105', trainName: 'Tiruvallur Passenger', trainType: 'Passenger', priority: 55, currentStation: 'Katpadi', nextStation: 'Vellore', currentSpeedKmh: 65, delayMinutes: 8, destination: 'Chennai', punctualityStatus: 'late' },
  ],

  stations: [
    { id: 'Jolarpettai', name: 'Jolarpettai Junction', totalLoops: 4, occupiedLoops: 2, loopLengthMeters: 750 },
    { id: 'Ambur', name: 'Ambur', totalLoops: 2, occupiedLoops: 1, loopLengthMeters: 680 },
    { id: 'Vaniyambadi', name: 'Vaniyambadi', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 700 },
    { id: 'Katpadi', name: 'Katpadi Junction', totalLoops: 5, occupiedLoops: 1, loopLengthMeters: 820 },
    { id: 'Vellore', name: 'Vellore', totalLoops: 3, occupiedLoops: 0, loopLengthMeters: 750 },
  ],

  sections: [
    { from: 'Jolarpettai', to: 'Katpadi', distanceKm: 40, doubleLine: false, maxSpeedKmh: 100 },
    { from: 'Ambur', to: 'Vaniyambadi', distanceKm: 12, doubleLine: false, maxSpeedKmh: 90 },
    { from: 'Vaniyambadi', to: 'Katpadi', distanceKm: 28, doubleLine: false, maxSpeedKmh: 100 },
    { from: 'Katpadi', to: 'Vellore', distanceKm: 18, doubleLine: true, maxSpeedKmh: 110 },
  ],

  timetable: [
    { trainNo: 'PKS-001', stationId: 'Katpadi', scheduledArrival: '02:05', scheduledDeparture: '02:07' },
    { trainNo: 'COA-221', stationId: 'Katpadi', scheduledArrival: '02:30', scheduledDeparture: '02:45' },
    { trainNo: 'CTN-089', stationId: 'Katpadi', scheduledArrival: '02:20', scheduledDeparture: '02:30' },
    { trainNo: '16105', stationId: 'Vellore', scheduledArrival: '02:55', scheduledDeparture: '02:57' },
  ],

  crew: [
    { trainNo: 'PKS-001', dutyRemainingMinutes: 110, reliefAvailable: true, reliefStation: 'Katpadi', reliefLocation: 'Crew Room', reliefEtaMinutes: 6 },
    { trainNo: 'COA-221', dutyRemainingMinutes: 45, reliefAvailable: false, reliefStation: null, reliefLocation: null, reliefEtaMinutes: null },
    { trainNo: 'CTN-089', dutyRemainingMinutes: 200, reliefAvailable: true, reliefStation: 'Katpadi', reliefLocation: 'Crew Lobby', reliefEtaMinutes: 10 },
    { trainNo: '16105', dutyRemainingMinutes: 88, reliefAvailable: true, reliefStation: 'Vellore', reliefLocation: 'Crew Room', reliefEtaMinutes: 15 },
  ],

  maintenanceBlocks: [
    {
      id: 'MB-N1',
      location: 'KM 52–56 (Jolarpettai–Katpadi)',
      sectionFrom: 'Jolarpettai',
      sectionTo: 'Katpadi',
      startTime: '01:00',
      endTime: '03:30',
      requestedBy: 'PWI Jolarpettai',
      department: 'PWI',
      approved: true,
      alternativeWindows: [
        { startTime: '04:00', endTime: '06:00', estimatedDelayMinutes: 0, note: 'No scheduled traffic in window' },
      ],
    },
  ],

  speedRestrictions: [
    { location: 'KM 52–56', limitKmh: 20, reason: 'PWI maintenance block — active night window', until: '03:30' },
  ],

  freightInfo: [
    { trainNo: 'PKS-001', cargo: 'Perishable', priority: 82, delayCost: 'Very High', weightTonnes: 800, lengthMeters: 420 },
    { trainNo: 'COA-221', cargo: 'Coal', priority: 20, delayCost: 'Low', weightTonnes: 4500, lengthMeters: 690 },
    { trainNo: 'CTN-089', cargo: 'Container', priority: 40, delayCost: 'Medium', weightTonnes: 3100, lengthMeters: 650 },
  ],

  departmentConstraints: [
    { department: 'PWI', type: 'Night Maintenance Block Active', description: 'Night maintenance window KM 52–56 is active until 03:30. Any train passing through must slow to 20 km/h. Block was approved but the perishables special was not accounted for when scheduling.', affectedSection: 'KM 52–56', until: '03:30', blocksMovement: false, category: 'Operational' },
  ],

  emergencyActive: false,

  handoverNote: [
    'Night shift. Three freight trains converging on Jolarpettai–Katpadi single-line corridor.',
    'PKS-001 (Perishables) — on time, priority 82. Milk and vegetables for Chennai morning market. Cannot hold.',
    'COA-221 (Coal) — 18 min late. Crew expires in 45 min. No relief available at any station ahead.',
    'CTN-089 (Container) — on time. Approaching from Ambur direction.',
    'PWI maintenance block KM 52–56 active until 03:30. Slows every train to 20 km/h.',
    'Passenger 16105 running 8 min late — will catch up with freight jam at Katpadi.',
  ].join('\n'),
}
