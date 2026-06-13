/**
 * Scenario 02 — The Delayed Rajdhani
 * A late high-priority train meets an on-time freight on a single-line section.
 * Classic crossing + precedence decision under scheduling pressure.
 */
export const scenario = {
  id: '02',
  name: 'The Delayed Rajdhani',
  tagline: 'Priority conflict. Single line. Who waits?',
  difficulty: 'HIGH',
  region: 'Western Railway — Vadodara Division',

  shiftStart: '14:00',
  historicalContext: null,

  weather: {
    condition: 'Clear',
    visibilityKm: 15,
    rainMm: 0,
    windKmh: 12,
    note: 'Good visibility. Standard braking distances.',
  },

  trains: [
    { trainNo: '12951', trainName: 'Rajdhani Express', trainType: 'Rajdhani', priority: 93, currentStation: 'Vadodara', nextStation: 'Anand', currentSpeedKmh: 110, delayMinutes: 22, destination: 'Mumbai Central', punctualityStatus: 'late' },
    { trainNo: 'GD-4421', trainName: 'Container Freight', trainType: 'Container Freight', priority: 40, currentStation: 'Anand', nextStation: 'Vadodara', currentSpeedKmh: 60, delayMinutes: 0, destination: 'Ahmedabad', punctualityStatus: 'on_time' },
    { trainNo: '19016', trainName: 'Saurashtra Express', trainType: 'Express', priority: 70, currentStation: 'Anand', nextStation: 'Nadiad', currentSpeedKmh: 85, delayMinutes: 5, destination: 'Mumbai', punctualityStatus: 'late' },
  ],

  stations: [
    { id: 'Vadodara', name: 'Vadodara Junction', totalLoops: 5, occupiedLoops: 2, loopLengthMeters: 850 },
    { id: 'Anand', name: 'Anand Junction', totalLoops: 3, occupiedLoops: 1, loopLengthMeters: 720 },
    { id: 'Nadiad', name: 'Nadiad', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 700 },
  ],

  sections: [
    { from: 'Vadodara', to: 'Anand', distanceKm: 35, doubleLine: false, maxSpeedKmh: 120 },
    { from: 'Anand', to: 'Nadiad', distanceKm: 22, doubleLine: true, maxSpeedKmh: 110 },
  ],

  timetable: [
    { trainNo: '12951', stationId: 'Anand', scheduledArrival: '14:18', scheduledDeparture: '14:20' },
    { trainNo: 'GD-4421', stationId: 'Vadodara', scheduledArrival: '14:25', scheduledDeparture: '14:35' },
    { trainNo: '19016', stationId: 'Nadiad', scheduledArrival: '14:45', scheduledDeparture: '14:47' },
  ],

  crew: [
    { trainNo: '12951', dutyRemainingMinutes: 195, reliefAvailable: true, reliefStation: 'Anand', reliefLocation: 'Crew Lobby', reliefEtaMinutes: 8 },
    { trainNo: 'GD-4421', dutyRemainingMinutes: 78, reliefAvailable: false, reliefStation: null, reliefLocation: null, reliefEtaMinutes: null },
    { trainNo: '19016', dutyRemainingMinutes: 220, reliefAvailable: true, reliefStation: 'Nadiad', reliefLocation: 'Crew Room', reliefEtaMinutes: 12 },
  ],

  maintenanceBlocks: [],
  speedRestrictions: [],
  freightInfo: [{ trainNo: 'GD-4421', cargo: 'Container', priority: 40, delayCost: 'Medium', weightTonnes: 3200, lengthMeters: 680 }],
  departmentConstraints: [],
  emergencyActive: false,

  handoverNote: [
    'Rajdhani 12951 running 22 min late — approaching Vadodara–Anand single-line section.',
    'Container Freight GD-4421 on time — heading opposite direction on same section.',
    'Crossing arrangement needed. Freight crew expires in 78 min with no relief available.',
    'Saurashtra Express 19016 also slightly late, approaching from Anand direction.',
  ].join('\n'),
}
