# Threshold v2 — Build Spec

**What changes from v0.1 to v2.**  
**v0.1 stays working. These are the delta.**

---

## Screen 1 — Handover Note (replaces Situation Builder)

The controller doesn't describe a situation from scratch.  
They inherit one. This is how real shifts start.

### Inputs (replacing the 7 generic fields)

**Active Trains** — each train has:
- Train number + type (Rajdhani / Express / Passenger / Freight)
- Current location (station or KM marker)
- Delay minutes (0 = on time)
- Priority (derived from train type + freight category)

**Infrastructure State:**
- Active maintenance blocks (location, end time)
- Active speed restrictions (location, limit, reason)
- Loop availability per station

**Crew State:**
- Crew remaining duty minutes per train
- Relief availability per station

**Inherited Problems** (the handover note itself):
- Free-text from outgoing controller
- Pre-populated with the scenario context

### Entry Point
Not "Analyze Situation."  
Button reads: **ASSUME CONTROL**

---

## Screen 2 — Advance Plot (replaces Weak Signal Intelligence)

The intelligence screen becomes forward-looking.

### Sections

**Conflict Prediction — Next 30 Minutes**
- Predicted train conflicts (which trains, which location, which loop)
- Risk level per conflict: HIGH / MEDIUM / WATCH
- If no action taken: delay consequence per conflict

**Crew Expiry Warnings**
- Any train whose crew expires before reaching destination
- Minutes remaining vs minutes to destination
- Suggested relief station

**Cascade Risk**
- If the worst detected conflict is left unresolved:
  what is the downstream delay cascade across the section?

**Situation Classification** (from v0.1, kept)
- Within known patterns / Novel situation
- Data completeness rating

---

## Screen 3 — What-If Console (replaces Consequence Simulator)

The 4 fixed cards (Proceed / Hold / Inspect / Reduced Speed) become  
**dynamic action options generated for the actual situation.**

For a freight conflict, options might be:
- Loop GD-4421 at Station B
- Loop GD-4421 at Station C  
- Hold Rajdhani 12951 for 8 minutes
- Do nothing (show consequence)

Each option shows:
- Passenger punctuality impact (▲ / ▼ / neutral)
- Freight throughput impact
- Crew compliance impact
- Downstream cascade impact
- Evidence strength: Strong / Moderate / Weak

### The "Do Nothing" Option
Always present. Always shows the worst-case cascade.  
This is the "killer feature" — showing what happens if the controller does nothing.

---

## Screen 4 — Command Center (largely unchanged)

Recommendation + Reasoning Trail stays.  
Human Challenge stays.  
Audit Log stays.

### Additions
- Network Efficiency Score displayed after final decision
- Score breakdown: Passenger / Freight / Crew / Safety / Maintenance
- Decision recorded against the shift context, not a generic situation

---

## Data Model Changes

### Replace `situation` object with `shiftContext`

```js
shiftContext: {
  shiftStart: "14:00",
  controllerName: "",        // optional
  handoverNote: "",          // free text from outgoing controller
  trains: [],                // array of Train entities
  stations: [],              // array of Station entities (with loop availability)
  sections: [],              // array of Section entities
  maintenanceBlocks: [],     // array of Maintenance Block entities
  speedRestrictions: [],     // array of Speed Restriction entities
}
```

### The 10 entity schemas
Defined in `threshold-v2-vision.md`. These become the TypeScript/JS types.

---

## AI Prompt Changes

### Analyze prompt
Input changes from 7 fields → shift context.  
Output adds:
- `conflicts[]` — predicted conflicts with trains, location, risk level
- `crewWarnings[]` — trains with crew expiry risk
- `cascadeRisk` — if worst conflict unresolved, total delay cascade

### Simulate prompt
Input changes from fixed 4 options → AI generates the relevant action options  
for THIS specific situation (loop here, loop there, hold this train, etc.)

Output changes from fixed cards → dynamic options with the same 4-section structure.

### Recommend prompt
Unchanged structurally. Now references shift-specific trains and conflicts  
instead of generic signals.

### Re-evaluate prompt
Unchanged.

---

## Mock Changes

The mock needs a scenario engine — a function that generates a realistic  
shift context with:
- 3–8 trains at various locations and delays
- 1–2 crew expiry risks baked in
- 1 maintenance block
- 1 speed restriction
- A handover note that names the inherited problems

The mock detectors (signal, fatigue, etc.) are replaced by:
- `detectConflicts(trains, sections, loops)` — which trains will conflict and where
- `detectCrewRisk(trains, crew)` — which crews expire before destination
- `detectCascade(conflicts, trains, timetable)` — downstream delay if unresolved

---

## What Does NOT Change

- The 4-screen flow (Builder → Intelligence → Simulator → Command)
- StepNav
- Reasoning Trail structure
- Human Challenge + Re-evaluation
- Audit Log
- Session Report + Download
- IST timestamps
- Mock / real API switch (VITE_USE_MOCKS)
- Evidence strength labels (Strong / Moderate / Weak)
- The core rule: only report what the data actually says

---

## Build Order

1. **Data model** — define `shiftContext` and the 10 entity types in a `types.js` file
2. **Mock scenario generator** — produces a realistic shift context on demand
3. **Handover Note screen** — replaces SituationBuilder, pre-populated from scenario
4. **Conflict/crew detectors** — replace the 4 signal detectors in mocks.js
5. **Advance Plot screen** — replaces WeakSignalIntelligence layout
6. **What-If Console** — replaces ConsequenceSimulator with dynamic options
7. **Prompt updates** — update all 4 Claude prompts for new data model
8. **Network Efficiency Score** — add to CommandCenter post-decision

Each step is independently deployable. v0.1 works until step 3 replaces it.

---

## The Demo Scenario ("The 14:00 Shift")

This is what judges see.

```
HANDOVER NOTE — 14:00
━━━━━━━━━━━━━━━━━━━━━
Train 12951 (Rajdhani) — 12 min late, approaching Station C
Train GD-4421 (Container Freight) — on time, same section
Train 12626 (Express) — on time, crew expires in 47 min
Maintenance block active: KM 145–150 until 15:30
Loop L1 at Station C: AVAILABLE
Loop L2 at Station C: OCCUPIED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ASSUME CONTROL ]
```

Threshold immediately detects:
- Conflict: 12951 vs GD-4421 at Station C (HIGH risk)
- Crew risk: 12626 crew expires before destination
- Cascade: if conflict unresolved, 12951 → +18 min, downstream trains affected

What-If Console offers:
- Loop GD-4421 at Station C → Rajdhani saves 10 min, freight loses 7 min ← recommended
- Hold Rajdhani 8 min → freight unaffected, Rajdhani loses 8 min
- Do nothing → Rajdhani +18 min, 3 downstream trains affected

Controller loops the freight. Threshold logs the decision.  
Network efficiency: 91/100.

That demo takes 3 minutes and tells a complete story.
