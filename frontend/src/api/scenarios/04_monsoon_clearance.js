/**
 * Scenario 04 — Monsoon Clearance
 * Heavy rain has just caused a landslide blocking the track at KM 178.
 * A passenger express is 6 minutes away. The relief team is 40 minutes away.
 * The controller must decide: hold everything, or find an alternative routing.
 */
export const scenario = {
  id: '04',
  name: 'Monsoon Clearance',
  tagline: 'Landslide. 6 minutes. No alternative route.',
  difficulty: 'CRITICAL',
  region: 'Konkan Railway — Ratnagiri Division',

  shiftStart: '15:45',
  historicalContext: null,

  weather: {
    condition: 'Severe Monsoon',
    visibilityKm: 0.4,
    rainMm: 65,
    windKmh: 85,
    note: 'Cyclonic rain. Visibility under 500m. Multiple landslide alerts in division. Braking distances 35–40% above dry baseline. Overhead wire sway reported.',
  },

  trains: [
    { trainNo: '10103', trainName: 'Mandovi Express', trainType: 'Express', priority: 75, currentStation: 'Ratnagiri', nextStation: 'Ukshi', currentSpeedKmh: 90, delayMinutes: 0, destination: 'Mumbai CST', punctualityStatus: 'on_time' },
    { trainNo: '10111', trainName: 'Konkan Kanya Express', trainType: 'Express', priority: 73, currentStation: 'Ukshi', nextStation: 'Ratnagiri', currentSpeedKmh: 80, delayMinutes: 14, destination: 'Madgaon', punctualityStatus: 'late' },
    { trainNo: '50102', trainName: 'Passenger Local', trainType: 'Passenger', priority: 55, currentStation: 'Adavali', nextStation: 'Ukshi', currentSpeedKmh: 60, delayMinutes: 22, destination: 'Kankavli', punctualityStatus: 'late' },
  ],

  stations: [
    { id: 'Ratnagiri', name: 'Ratnagiri', totalLoops: 3, occupiedLoops: 1, loopLengthMeters: 750 },
    { id: 'Ukshi', name: 'Ukshi', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 680 },
    { id: 'Adavali', name: 'Adavali', totalLoops: 1, occupiedLoops: 0, loopLengthMeters: 600 },
    { id: 'Kankavli', name: 'Kankavli', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 700 },
  ],

  sections: [
    { from: 'Ratnagiri', to: 'Ukshi', distanceKm: 22, doubleLine: false, maxSpeedKmh: 100 },
    { from: 'Ukshi', to: 'Adavali', distanceKm: 15, doubleLine: false, maxSpeedKmh: 90 },
    { from: 'Adavali', to: 'Ukshi', distanceKm: 15, doubleLine: false, maxSpeedKmh: 90 },
  ],

  timetable: [
    { trainNo: '10103', stationId: 'Ukshi', scheduledArrival: '15:51', scheduledDeparture: '15:52' },
    { trainNo: '10111', stationId: 'Ratnagiri', scheduledArrival: '15:58', scheduledDeparture: '16:00' },
    { trainNo: '50102', stationId: 'Ukshi', scheduledArrival: '16:10', scheduledDeparture: '16:12' },
  ],

  crew: [
    { trainNo: '10103', dutyRemainingMinutes: 165, reliefAvailable: false, reliefStation: null, reliefLocation: null, reliefEtaMinutes: null },
    { trainNo: '10111', dutyRemainingMinutes: 92, reliefAvailable: true, reliefStation: 'Ratnagiri', reliefLocation: 'Crew Lobby', reliefEtaMinutes: 20 },
    { trainNo: '50102', dutyRemainingMinutes: 55, reliefAvailable: false, reliefStation: null, reliefLocation: null, reliefEtaMinutes: null },
  ],

  maintenanceBlocks: [],

  speedRestrictions: [
    { location: 'KM 178', limitKmh: 0, reason: 'LANDSLIDE REPORTED — Track blocked. Clearance team 40 minutes away.', until: 'Physical clearance' },
  ],

  freightInfo: [],

  departmentConstraints: [
    { department: 'P-Way', type: 'Landslide — KM 178', description: 'Station master Ukshi reports landslide debris on track at KM 178 at 15:42. Track extent unknown. Relief team 40 minutes away. No visual confirmation of train clearance — last train passed 18 minutes ago.', affectedSection: 'Ratnagiri–Ukshi', until: 'P-Way clearance', blocksMovement: true, category: 'Safety' },
    { department: 'TRD', type: 'OHE Sway Alert', description: 'Overhead wire sway detected on mast M-142 near KM 176 due to cyclonic wind. Electric locos should not exceed 60 km/h through this section.', affectedSection: 'KM 174–180', until: '18:00', blocksMovement: false, category: 'Operational' },
  ],

  emergencyActive: true,
  emergencyType: 'TRACK_BLOCKAGE',
  emergencyKm: '178',
  minutesToImpact: { '10103': 6, '10111': 8, '50102': 20 },

  handoverNote: [
    '⚠ LANDSLIDE REPORTED — KM 178 — 15:42 IST',
    'SM Ukshi reports debris on track. Extent unknown. Last train passed KM 178 at 15:24 — 18 minutes ago.',
    'Mandovi Express 10103 — on time, approaching from Ratnagiri — ETA KM 178 approx 6 minutes.',
    'Konkan Kanya 10111 — 14 min late, approaching from opposite direction — ETA KM 178 approx 8 minutes.',
    'Passenger 50102 — 22 min late, crew expires in 55 min, no relief available.',
    'P-Way relief team 40 minutes away. Heavy cyclonic rain reducing visibility to 400m.',
    'OHE sway alert KM 174–180 — wind 85 km/h.',
  ].join('\n'),
}
