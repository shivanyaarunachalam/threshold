/**
 * Threshold Demo Scenario — "The Kazipet Emergency"
 *
 * 18:47 IST. A loco pilot on the Hyderabad–Visakhapatnam Express reports
 * severe vibration and a loud crack sound near KM 312 — possible rail fracture
 * or broken fishplate. He has already passed the section but does not know
 * if the track is safe for the next train.
 *
 * Three trains are now converging on that section:
 *   - A Rajdhani approaching from the north at 120 km/h, 11 min away
 *   - A heavily loaded passenger express approaching from the south, 9 min away
 *   - A loaded Coal Freight that has just entered the single-line block
 *
 * The controller has no confirmation. The track inspection team is 28 minutes away.
 * Weather: monsoon rain, reduced visibility, 60 km/h crosswind.
 *
 * This scenario is NOT about signalling. It is about:
 *   - An unverified emergency report
 *   - Three trains in motion with no time to verify
 *   - A controller who must decide NOW whether to halt everything
 *     or let the Rajdhani proceed and hope the report was wrong
 *
 * Every second the controller delays, the Rajdhani closes 33 metres on the suspect section.
 */

export function generateDemoScenario() {
  return {
    shiftStart: '18:30',

    historicalContext: {
      title:   'Scenario Type: Unverified Emergency Report Under Traffic Pressure',
      summary: 'Inspired by the 2012 Hampi Express derailment and the 1999 Gaisal disaster — both involved situations where field-level anomaly reports reached the control office while multiple trains were already in motion. In each case, the controller had minutes to decide with incomplete information. Threshold models this exact pressure: what should the AI recommend when the report is unverified but the risk of being wrong is catastrophic?',
      lesson:  'The hardest decisions in railway control are not about what you know. They are about what you do when you do not know — and three trains are still moving.',
    },

    weather: {
      condition:    'Heavy Monsoon Rain',
      visibilityKm: 0.8,
      rainMm:       28,
      windKmh:      60,
      note:         'Monsoon conditions. Visibility under 1 km. Crosswind 60 km/h. Braking distances 25–30% above dry baseline. Emergency stops on wet track will overshoot by 200–400 metres.',
    },

    handoverNote: [
      '⚠ EMERGENCY REPORT RECEIVED — 18:47 IST',
      'Loco pilot of 17230 (Hyderabad–Vizag Express) reports: severe vibration + loud crack at KM 312/4. Possible rail fracture or broken fishplate. Train has cleared the section but track status UNKNOWN.',
      'Rajdhani 12723 approaching from Kazipet — ETA KM 312 approx 11 minutes. Speed 120 km/h.',
      'Passenger Express 17015 approaching from south — ETA KM 312 approx 9 minutes. Speed 95 km/h.',
      'Coal Freight 58007 already inside the single-line block — currently between KM 308 and KM 315. No radio contact for last 4 minutes.',
      'Track inspection team (P-Way gang) is 28 min away. No USFD trolley available.',
      'Heavy rain reducing visibility to 800m. Emergency braking on wet track will overshoot nominated stopping point.',
    ].join('\n'),

    trains: [
      {
        trainNo:          '12723',
        trainName:        'Telangana Rajdhani',
        trainType:        'Rajdhani',
        priority:         93,
        currentStation:   'Kazipet Jn',
        nextStation:      'Ramagundam',
        currentSpeedKmh:  120,
        delayMinutes:     0,
        destination:      'Hazrat Nizamuddin',
        punctualityStatus:'on_time',
        distanceToHazardKm: 22,
      },
      {
        trainNo:          '17015',
        trainName:        'Visakha Express',
        trainType:        'Express',
        priority:         70,
        currentStation:   'Peddapalli',
        nextStation:      'Ramagundam',
        currentSpeedKmh:  95,
        delayMinutes:     6,
        destination:      'Visakhapatnam',
        punctualityStatus:'late',
        distanceToHazardKm: 14,
      },
      {
        trainNo:          '58007',
        trainName:        'Coal Freight',
        trainType:        'Coal Freight',
        priority:         20,
        currentStation:   'In Block',
        nextStation:      'Ramagundam',
        currentSpeedKmh:  45,
        delayMinutes:     12,
        destination:      'Ramagundam',
        punctualityStatus:'late',
        distanceToHazardKm: 3,
        radioContact:     false,
      },
      {
        trainNo:          '17230',
        trainName:        'Hyderabad–Vizag Express',
        trainType:        'Express',
        priority:         70,
        currentStation:   'Ramagundam',
        nextStation:      'Sirpur Kaghaznagar',
        currentSpeedKmh:  0,
        delayMinutes:     0,
        destination:      'Visakhapatnam',
        punctualityStatus:'on_time',
        note:             'Train that reported the anomaly. Now stable at Ramagundam.',
      },
    ],

    stations: [
      { id: 'Kazipet Jn',  name: 'Kazipet Junction',  totalLoops: 4, occupiedLoops: 1, loopLengthMeters: 800 },
      { id: 'Peddapalli',  name: 'Peddapalli',         totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 700 },
      { id: 'Ramagundam',  name: 'Ramagundam',         totalLoops: 3, occupiedLoops: 1, loopLengthMeters: 750 },
      { id: 'In Block',    name: 'In Block Section',   totalLoops: 0, occupiedLoops: 0, loopLengthMeters: 0   },
      { id: 'Sirpur Kaghaznagar', name: 'Sirpur Kaghaznagar', totalLoops: 2, occupiedLoops: 0, loopLengthMeters: 680 },
    ],

    sections: [
      { from: 'Kazipet Jn', to: 'Ramagundam',  distanceKm: 44, doubleLine: false, maxSpeedKmh: 130 },
      { from: 'Peddapalli', to: 'Ramagundam',   distanceKm: 18, doubleLine: false, maxSpeedKmh: 110 },
      { from: 'Ramagundam', to: 'Sirpur Kaghaznagar', distanceKm: 52, doubleLine: true, maxSpeedKmh: 100 },
    ],

    timetable: [
      { trainNo: '12723', stationId: 'Ramagundam', scheduledArrival: '18:58', scheduledDeparture: '19:00' },
      { trainNo: '17015', stationId: 'Ramagundam', scheduledArrival: '18:56', scheduledDeparture: '18:58' },
      { trainNo: '58007', stationId: 'Ramagundam', scheduledArrival: '19:05', scheduledDeparture: '19:15' },
      { trainNo: '17230', stationId: 'Ramagundam', scheduledArrival: '18:44', scheduledDeparture: '19:00' },
    ],

    crew: [
      { trainNo: '12723', dutyRemainingMinutes: 240, reliefAvailable: true,  reliefStation: 'Ramagundam', reliefLocation: 'Crew Lobby Platform 2', reliefEtaMinutes: 5  },
      { trainNo: '17015', dutyRemainingMinutes: 85,  reliefAvailable: true,  reliefStation: 'Ramagundam', reliefLocation: 'Crew Room',             reliefEtaMinutes: 10 },
      { trainNo: '58007', dutyRemainingMinutes: 62,  reliefAvailable: false, reliefStation: null,         reliefLocation: null,                    reliefEtaMinutes: null },
      { trainNo: '17230', dutyRemainingMinutes: 180, reliefAvailable: true,  reliefStation: 'Ramagundam', reliefLocation: 'Crew Room',             reliefEtaMinutes: 8  },
    ],

    maintenanceBlocks: [],

    speedRestrictions: [
      {
        location:  'KM 310–315',
        limitKmh:  15,
        reason:    'EMERGENCY — Unverified track anomaly reported by loco pilot. Pending inspection.',
        until:     'Clearance required',
      },
    ],

    freightInfo: [
      {
        trainNo:       '58007',
        cargo:         'Coal',
        priority:      20,
        delayCost:     'Low',
        weightTonnes:  4800,
        lengthMeters:  710,
      },
    ],

    departmentConstraints: [
      {
        department:      'P-Way',
        type:            'Unverified Track Anomaly — KM 312/4',
        description:     'Loco pilot 17230 reported severe vibration and crack sound at KM 312/4 at 18:47. Track status unconfirmed. P-Way inspection gang is 28 minutes away. No trolley available. Section must be treated as UNSAFE until cleared.',
        affectedSection: 'KM 310–315 (Kazipet Jn – Ramagundam block)',
        until:           'P-Way clearance',
        blocksMovement:  true,
        category:        'Safety',
      },
      {
        department:      'COM',
        type:            'No Radio Contact — Coal Freight 58007',
        description:     'Freight 58007 entered the single-line block 4 minutes ago. Radio contact lost. Train is currently inside the affected section. Position unconfirmed.',
        affectedSection: 'KM 308–315',
        until:           'Radio contact restored',
        blocksMovement:  false,
        category:        'Safety',
      },
    ],

    // Emergency context — used by mock to generate more urgent discoveries
    emergencyActive: true,
    emergencyType:   'TRACK_ANOMALY',
    emergencyKm:     '312/4',
    minutesToImpact: {
      '12723': 11,
      '17015': 9,
      '58007': 4,
    },
  }
}
