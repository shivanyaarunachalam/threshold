# Threshold Decision Rules

Discovered through mock testing before any API credits were spent.
These rules define what makes Threshold different from a generic LLM wrapper.

---

## Rule 1 — Never Invent Signals

The AI must only report weak signals that are directly supported by the actual input text.

**Violating example:**
- Input: `Driver Report: no significant changes`
- Wrong output: `Unverified Driver Anomaly Report`

**Correct output:** No driver signal. The driver report contributes no risk.

**Why it matters:** A judge who reads the input and then sees an invented anomaly will immediately
lose trust in the entire system. One hallucinated signal invalidates the whole report.

---

## Rule 2 — Every Signal Requires At Least Two Contributing Fields

A weak signal must be supported by evidence from two or more separate input fields.
Single-field observations are not weak signals.

**Example of a valid signal:**
```
Weak Signal: Compounded Environmental + Infrastructure Degradation
Derived from: Weather Conditions (fog), Track Condition (wet rails), Maintenance Status (overdue)
```

**Example of an invalid signal:**
```
Weak Signal: Poor Visibility
Derived from: Weather Conditions only
→ Not a weak signal. Single-field observation. May appear in Data Quality notes.
```

**Why it matters:** The entire premise of Threshold is detecting *combinations*.
A single-field alert is just a standard alarm system. That's not the product.

---

## Rule 3 — Normal Conditions Must Not Generate Alerts

The following are normal operational conditions. They must never be flagged as risk signals.

| Input | Must NOT produce |
|---|---|
| "Driver on 6 hour shift" | Crew fatigue |
| "Signals are proper" | Signal ambiguity |
| "Track is dry" | Track degradation |
| "Maintenance up to date" | Maintenance risk |
| "Driver: no issues" | Driver anomaly |
| "Crew: fresh, full complement" | Crew concern |

**Threshold should be as good at saying nothing is wrong as it is at finding what is wrong.**

A clean, confident "No weak signal patterns detected. Proceed." is one of the most
powerful outputs the system can produce. It demonstrates calibration.

---

## Rule 4 — No Confidence Percentages

Numeric confidence scores (e.g. "Hold: 71%") are not defensible.

**Banned:** `confidenceScore: 71`

**Required:** `supportLevel: "Strong" | "Moderate" | "Weak"`

Support levels must be derived from evidence:
- **Strong** — multiple detected signals resolved by this option, or zero signals (supports Proceed)
- **Moderate** — partially resolves detected signals
- **Weak** — does not resolve primary signals, or introduces new risk

**Why it matters:** A judge will ask "where does 71% come from?" and there is no answer.
"Strong evidence support" is a statement you can defend.

---

## Rule 5 — Zero Signals Is a Valid and Valuable Output

If no two-field combinations produce a risk pattern, `weakSignals` must be `[]`.

**Wrong behavior:** Inventing signals to fill the response.

**Correct behavior:**
```json
{
  "weakSignals": [],
  "whyConcerned": "",
  "unknownSituationCheck": {
    "classification": "within known patterns",
    "explanation": "All inputs describe nominal operational conditions. No compound risk pattern detected."
  }
}
```

This output — confidently saying nothing is wrong when nothing is wrong — is what separates
a mature intelligence system from a chatbot that always tries to find something.

**The test case:**
```
Weather: Clear
Signals: Normal
Track: Dry
Maintenance: Up to date
Passenger Load: Moderate
Crew: Fresh
Driver: No issues
→ Expected: 0 weak signals. Recommendation: Proceed.
```

If this scenario generates signals, the system is broken.

---

## Rule 6 — No Hallucinated Details

The AI must never reference facts not present in the input.

**Examples of hallucination:**
- Input says "signals are proper" → Output references "amber state" ❌
- Input says "maintenance up to date" → Output says "outstanding items" ❌
- Input says "6 hour shift" → Output says "driver fatigue" ❌

Every sentence in the output must be traceable to a specific phrase in the input.

---

## Rule 7 — Unknown Situations Must Escalate Clearly

If the situation contains conditions outside normal operational patterns
(natural disasters, cascading multi-system failures, unprecedented combinations),
the system must:

1. Classify as `"unknown/novel"`
2. Display a prominent warning in the UI
3. Explicitly state that human judgment must be weighted above AI output

This is not a failure state. It is a feature. A system that knows the limits of its
own competence is more trustworthy than one that always produces confident output.

---

## Signal Detection Reference

A signal is valid when **two or more** of these specific input conditions co-occur:

### Environmental + Infrastructure Degradation
| Field | Trigger keywords |
|---|---|
| Weather | fog, rain, snow, ice, storm, wind, low visibility, frost |
| Track Condition | wet, damp, leaf fall, slippery, debris, icy, flooded |
| Maintenance Status | overdue, missed, pending, outstanding, behind schedule |
Minimum: 2 of 3 fields must trigger.

### Crew Endurance Under Peak Load
| Field | Trigger keywords |
|---|---|
| Crew Status | hour 9+, 10-hour, overtime, extended shift, no relief, no break |
| Passenger Load | full capacity, near capacity, maximum load, standing passengers |
Minimum: both fields must trigger. A 6-hour shift is NOT a trigger.

### Signal State Ambiguity Under Adverse Conditions
| Field | Trigger keywords |
|---|---|
| Signal Status | amber, fault, unresponsive, unknown, intermittent, unclear |
| Weather OR Driver Report | low visibility / explicit mention of signal in driver report |
Minimum: Signal Status must trigger plus one corroborating field.

### Unverified Driver Anomaly
| Field | Trigger keywords |
|---|---|
| Driver Report | vibration, noise, shudder, brake issue, smell, jerk, unusual, knock |
| Track Condition OR Maintenance Status | wet/rough track OR overdue maintenance |
Minimum: Driver Report must contain an actual anomaly word, plus one corroborating field.
"No issues", "no significant changes", "all normal" explicitly disqualify this signal.

---

## Rule 8 — Data Quality Rating Must Reflect Usability, Not Length

Single clear words ("Clear", "Dry", "Normal", "Up to date") are valid operational inputs.
They must not be rated as Poor.

**Rating scale:**
- **Good** — detailed entries across most fields (5+ fields with 15+ characters)
- **Adequate** — clear and usable entries, some brevity acceptable ← default for clean inputs
- **Poor** — multiple fields that are genuinely blank, single-character, or unreadable

**Field flag language must be informational, not prescriptive:**
- Wrong: `"Entry is too brief. Include specific signal IDs."` ❌
- Right: `"Additional detail on signal IDs and states would improve analysis precision."` ✓

The tone is: "here is how you could strengthen this" — not "you did this wrong."

| Date | Discovery | Rule |
|---|---|---|
| 2026-06-09 | Mock generated driver anomaly when driver said "no significant changes" | Rule 1, Rule 6 |
| 2026-06-09 | Mock flagged 6-hour shift as crew fatigue | Rule 3 |
| 2026-06-09 | Mock referenced amber signal that was never mentioned in input | Rule 6 |
| 2026-06-09 | Bare confidence percentages had no defensible basis | Rule 4 |
| 2026-06-09 | System always produced 3 signals regardless of inputs | Rule 5 |
| 2026-06-09 | "Clear / Normal / Dry / Up to date" rated as Poor quality — single clear words are valid inputs | Rule 8 |
