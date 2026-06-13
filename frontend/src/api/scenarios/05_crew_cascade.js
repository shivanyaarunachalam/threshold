/**
 * Scenario 05 — Crew Cascade
 * No emergency. No accident. Just four trains, all with crew expiry risks,
 * converging on the one station that has relief crews available.
 * A scheduling puzzle that looks routine until you see the dependencies.
 */
export const scenario = {
  id: '05',
  name: 'Crew Cascade',
  tagline: 'Four trains. One relief station. All expiring.',
  difficulty: 'MEDIUM',
  region: 'Central Railway — Bhusawal Division',

  shiftStart: '09:00',
  historicalContext: null,

  weather: {
    condition: 'Clear',
    visibilityKm: 20,
    rainMm: 0,
    windKmh: 8,
    note: 'Good weather. No operational weather constraints.',
  },

  trains: [
    { trainNo: '12137', trainName: 'Punjab Mail', trainType: 'Mail', priority: 75, currentStation: 'Malkapur', nextStation: 'Bhusawal', currentSpeedKmh: 95, delayMinutes: 8, destination: 'Mumbai CST', punctualityStatus: 'late' },
    { trainNo: '11019', trainName: 'Konark Express', trainType: 'Express', priority: 70, currentStation: 'Nandura', nextStation: 'Bhusawal', currentSpeedKmh: 88, delayMinutes: 0, destination: 'Bhubaneswar', punctualityStatus: 'on_time' },
    { trainNo: '12105', trainName: 'Vidarbha Express', trainType: 'Express', priority: 70, currentStation: 'Bhusawal', nextStation: 'Akola', currentSpeedKmh: 0, delayMinutes: 12, destination: 'Nagpur', punctualityStatus: 'late' },
    { trainNo: 'GD-7751', trainName: 'Petroleum Tanker', trainType: 'Petroleum', priority: 45, currentStation: 'Malkapur', nextStation: 'Bhusawal', currentSpeedKmh: 55, delayMinutes: 0, destination: 'Bhusawal Yard', punctualityStatus: 'on_time' },
  ],

  stations: [
    { id: 'Malkapur', name: 'Malkapur', totalLoops: 2, occupiedLoops: 1, loopLengthMeters: 700 },
    { id: 'Nandura', name: 'Nandura', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 680 },
    { id: 'Bhusawal', name: 'Bhusawal Junction', totalLoops: 6, occupiedLoops: 2, loopLengthMeters: 900 },
    { id: 'Akola', name: 'Akola', totalLoops: 3, occupiedLoops: 1, loopLengthMeters: 750 },
  ],

  sections: [
    { from: 'Malkapur', to: 'Bhusawal', distanceKm: 28, doubleLine: true, maxSpeedKmh: 110 },
    { from: 'Nandura', to: 'Bhusawal', distanceKm: 36, doubleLine: true, maxSpeedKmh: 110 },
    { from: 'Bhusawal', to: 'Akola', distanceKm: 62, doubleLine: true, maxSpeedKmh: 110 },
  ],

  timetable: [
    { trainNo: '12137', stationId: 'Bhusawal', scheduledArrival: '09:17', scheduledDeparture: '09:20' },
    { trainNo: '11019', stationId: 'Bhusawal', scheduledArrival: '09:24', scheduledDeparture: '09:26' },
    { trainNo: '12105', stationId: 'Akola', scheduledArrival: '10:15', scheduledDeparture: '10:17' },
    { trainNo: 'GD-7751', stationId: 'Bhusawal', scheduledArrival: '09:35', scheduledDeparture: null },
  ],

  crew: [
    { trainNo: '12137', dutyRemainingMinutes: 55, reliefAvailable: true, reliefStation: 'Bhusawal', reliefLocation: 'Crew Lobby Platform 3', reliefEtaMinutes: 8 },
    { trainNo: '11019', dutyRemainingMinutes: 62, reliefAvailable: true, reliefStation: 'Bhusawal', reliefLocation: 'Crew Lobby Platform 1', reliefEtaMinutes: 12 },
    { trainNo: '12105', dutyRemainingMinutes: 48, reliefAvailable: true, reliefStation: 'Bhusawal', reliefLocation: 'Crew Room B', reliefEtaMinutes: 5 },
    { trainNo: 'GD-7751', dutyRemainingMinutes: 70, reliefAvailable: true, reliefStation: 'Bhusawal', reliefLocation: 'Freight Crew Lobby', reliefEtaMinutes: 15 },
  ],

  maintenanceBlocks: [
    {
      id: 'MB-B1',
      location: 'Bhusawal Yard — Platform 2',
      sectionFrom: 'Bhusawal',
      sectionTo: 'Bhusawal',
      startTime: '09:10',
      endTime: '09:45',
      requestedBy: 'C&W Department',
      department: 'C&W',
      approved: true,
      alternativeWindows: [
        { startTime: '10:30', endTime: '11:00', estimatedDelayMinutes: 2, note: 'Post-morning rush — platform free' },
      ],
    },
  ],

  speedRestrictions: [],

  freightInfo: [
    { trainNo: 'GD-7751', cargo: 'Petroleum', priority: 45, delayCost: 'High', weightTonnes: 2800, lengthMeters: 580 },
  ],

  departmentConstraints: [
    { department: 'C&W', type: 'Platform 2 Blocked — C&W Examination', description: 'C&W team conducting mandatory examination on Platform 2 until 09:45. Punjab Mail 12137 is scheduled for Platform 2. Requires platform reassignment or hold.', affectedSection: 'Bhusawal — Platform 2', until: '09:45', blocksMovement: false, category: 'Operational' },
  ],

  emergencyActive: false,

  handoverNote: [
    'Four trains all arriving Bhusawal within 20 minutes. All have crew expiry risk.',
    'Punjab Mail 12137 — 8 min late, crew 55 min, scheduled Platform 2 (blocked by C&W until 09:45).',
    'Konark Express 11019 — on time, crew 62 min remaining.',
    'Vidarbha Express 12105 — already at Bhusawal, 12 min late departure, crew 48 min (most urgent).',
    'Petroleum Tanker GD-7751 — on time, crew 70 min, hazmat requires careful platform assignment.',
    'Bhusawal has relief crews but coordination window is tight — four trains, limited platform space.',
    'C&W blocking Platform 2 until 09:45 — conflicts with Punjab Mail arrival.',
  ].join('\n'),
}
