# Threshold v2 — Product Vision

**Status:** Strategic Direction  
**Date:** 2026-06-09  
**Derived from:** COA research, operational analysis, mock testing findings

---

## The Real Problem

Railways already have excellent systems for:
- Safety (Kavach, Interlocking)
- Detection (Track Circuits, Axle Counters)
- Communication (FEP, OFC, Data Loggers)
- Control (COA, Electronic Interlocking)

**None of these systems are the gap.**

The gap is this:

> A Section Controller managing 30–50 trains has all the data.  
> What they don't have is instant consequence analysis.

Today the controller mentally calculates:
```
If I hold Train A...
  Then Train B crosses...
    Then crew expires...
      Then freight gets delayed...
        Then maintenance block shifts...
```

This is human experience doing what software should do.

Current systems answer: **WHAT IS HAPPENING**  
Threshold answers: **WHAT WILL HAPPEN NEXT**

---

## What Threshold Is

**An AI Consequence Engine for railway regulation decisions.**

Not a train control system.  
Not a signaling replacement.  
Not a simulation.

A decision support layer that sits on top of existing COA operations.  
The controller remains in control. The AI reveals the future.

### The Pitch

> "Threshold is an AI-powered Decision Intelligence Layer that sits on top of existing COA  
> operations. It does not replace signaling, interlocking, Kavach, or controllers. It  
> continuously evaluates possible regulation decisions and presents controllers with the  
> safest, lowest-impact operational recommendations in real time."

---

## What Threshold Is NOT Building

These were considered and deliberately dropped:

| Dropped Feature | Reason |
|---|---|
| Track circuit simulation | Solves a simulation problem, not a railway problem |
| Data logger simulation | Already works well. Not the gap. |
| Interlocking simulation | Already works well. Not the gap. |
| Kavach simulation | Already works well. Not the gap. |
| Hardware layer simulation | Not where controllers struggle |
| Axle counter simulation | Not where controllers struggle |

---

## The Five Core Features

### Feature 1 — Conflict Prediction
Show the controller what will conflict before it happens.

```
ADVANCE PLOT — NEXT 30 MINUTES

⚠ Congestion Risk: HIGH
  Train 12951 vs GD-4421
  Location: KM 145 (Station C loop)
  If no action: Rajdhani delayed +18 min

✓ Collision Risk: None
◎ Network Impact: Medium
```

### Feature 2 — What-If Consequence Analysis
Controller clicks an action. Threshold instantly shows the consequences.

```
IF: Loop Freight GD-4421 at Station C

  Rajdhani 12951 delay:    18 min → 2 min  ▲
  Freight GD-4421 delay:    0 min → 7 min  ▼
  Crew compliance:          Safe           ✓
  Downstream impact:        Low            ✓

  RECOMMENDATION: YES
```

This is the killer feature. Controllers have never had this before.

### Feature 3 — Crew Expiry Prediction
Controllers currently monitor crew duty hours manually. Threshold does it automatically.

```
⚠ CREW EXPIRY WARNING
  Train 12626
  Crew remaining:    47 min
  Distance to dest:  68 km
  Estimated arrival: 71 min  ← PROBLEM

  Options:
  A) Stable at Station B — arrange relief (recommended)
  B) Proceed — risk duty violation
  C) Request TLC — nearest crew 95 km away
```

### Feature 4 — Maintenance Window Optimisation
Engineers ask for blocks. Controllers search for gaps. Threshold finds the optimal window.

```
MAINTENANCE WINDOW REQUEST
  Location: KM 145–150
  Duration: 2 hours

  BEST WINDOW:    14:25 – 16:15
  Passenger impact: 3 min total delay
  Trains affected:  2

  ALTERNATIVE:    18:00 – 20:00
  Passenger impact: 21 min total delay
  Trains affected:  5

  RECOMMENDATION: Take 14:25 window
```

### Feature 5 — Incident Impact Forecasting
When something goes wrong, Threshold immediately calculates the cascade.

```
TRACK DEFECT REPORTED — KM 142/8

  IF restriction = 30 km/h applied:
  Trains affected:       7
  Total expected delay:  41 min
  VIP services affected: 1 (Rajdhani 12951)

  Alternative routing via Section B:
  Available: YES
  Added distance: 12 km
  Rajdhani delay via alt route: 8 min  ← better
```

---

## The Scoring Model

Don't score on trains moved. Score on what controllers are actually judged on:

```
NETWORK EFFICIENCY SCORE

  Passenger punctuality    ████████░░  78%
  Freight throughput       ███████░░░  71%
  Crew compliance          ██████████  100%
  Safety compliance        ██████████  100%
  Maintenance completion   █████░░░░░  52%

  OVERALL: 80/100
```

Penalties:
- Crew exceeded duty
- Maintenance block missed
- Unresolved conflict > 5 min
- Passenger delay above threshold

Rewards:
- Conflict resolved before impact
- Maintenance window accepted
- Crew relief arranged in time
- Minimum passenger impact

---

## The 10 Input Entities

Everything Threshold needs. Nothing it doesn't.

### 1. Train
```json
{
  "trainNo": "12621",
  "trainType": "Rajdhani",
  "priority": 90,
  "currentLocation": "Station B",
  "currentSpeed": 110,
  "destination": "Station Z",
  "delayMinutes": 12
}
```

### 2. Station
```json
{
  "id": "AJJ",
  "name": "Arakkonam",
  "loops": 2,
  "loopsOccupied": 1
}
```

### 3. Section
```json
{
  "from": "MAS",
  "to": "AJJ",
  "distanceKm": 69,
  "doubleLine": true
}
```

### 4. Timetable
```json
{
  "trainNo": "12621",
  "station": "AJJ",
  "scheduledArrival": "14:20",
  "scheduledDeparture": "14:22"
}
```

### 5. Loop Line
```json
{
  "station": "AJJ",
  "loopId": "L1",
  "occupied": false,
  "capacity": 700
}
```

### 6. Crew
```json
{
  "trainNo": "12621",
  "crewRemainingMinutes": 74,
  "reliefAvailable": true,
  "reliefStation": "AJJ"
}
```

### 7. Maintenance Block
```json
{
  "location": "KM 145–150",
  "requestedStart": "15:00",
  "requestedEnd": "17:00",
  "requestedBy": "PWI Section"
}
```

### 8. Speed Restriction
```json
{
  "location": "KM 120",
  "speedLimitKmh": 30,
  "reason": "Track defect",
  "until": "16:00"
}
```

### 9. Freight Type
```json
{
  "trainNo": "GD4421",
  "cargo": "Military",
  "priority": 95,
  "delayCost": "Extreme"
}
```

Freight priority table:
| Cargo | Priority | Delay Cost |
|---|---|---|
| Military | 95 | Extreme |
| Perishable | 85 | Very High |
| Vande Bharat | 100 | Extreme |
| Rajdhani | 90 | Very High |
| Container | 40 | Medium |
| Coal | 20 | Low |
| Empty Rake | 5 | Minimal |

### 10. Controller Action
```json
{
  "action": "LOOP_FREIGHT",
  "trainNo": "GD4421",
  "station": "AJJ",
  "requestedAt": "14:08",
  "confirmedBy": "Controller"
}
```

---

## The Shift Start Experience

Controllers never start with a clean slate. Threshold should reflect this.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HANDOVER NOTE — 14:00 SHIFT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Train 12621 delayed 18 min
  Maintenance block active until 15:30 (KM 145–150)
  Banker Loco BK-02 available at Station B
  Crew of GD-4421 expires at 16:10
  Track patrol pending near KM 178

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [ ASSUME CONTROL ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This single screen makes Threshold feel like a real Control Office application.

---

## What v1 (Current) Proved

The mock testing of v0.1 produced something valuable before a single API credit was spent:

1. The system can correctly say "nothing is wrong" — most AI systems cannot
2. The reasoning engine does not hallucinate signals from normal inputs
3. The data quality assessment is calibrated, not punitive
4. The consequence simulation is evidence-based, not invented

These are the foundations v2 needs. The architecture is right. The domain needs to expand.

---

## What to Build Next

**Immediate (hackathon scope):**
1. Replace generic situation inputs with the 10-entity input model
2. Build the Handover Note as the session entry point
3. Replace "Consequence Simulator" with "What-If Analysis" — controller picks an action, AI shows consequences
4. Add Crew Expiry as a dedicated warning layer in the intelligence screen
5. Add Conflict Prediction to the intelligence screen output

**Post-hackathon:**
- Live data adapter (COA feed → Threshold input model)
- Maintenance window optimiser
- Incident impact forecasting
- Network efficiency scoring
- Shift timeline playback

---

## The One Sentence That Defines Threshold

> The controller already has all the data.  
> Threshold gives them the answer to the question they haven't asked yet.
