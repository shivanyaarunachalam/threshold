# Threshold

> **Detecting the critical points that often go unnoticed.**

Threshold is an AI-powered railway operations intelligence system designed to help controllers identify emerging risks before they escalate into network-wide disruption.

Unlike traditional railway control systems that report what is happening, Threshold focuses on what is likely to happen next. By analysing train movements, crew availability, engineering blocks, operational constraints, departmental advisories, and emergency reports together, Threshold identifies compound risk patterns that may otherwise remain unnoticed until it is too late.

---

## The Problem

Railway controllers make safety-critical decisions under extreme information overload.

A single shift may involve:

* Multiple train conflicts
* Crew duty expiry risks
* Engineering blocks
* Departmental restrictions
* Equipment failures
* Weather disruptions
* Emergency incidents

Most existing systems display information separately.

The challenge is that operational failures rarely originate from a single event.

Small signals combine.

A delayed train becomes a crew violation.

A crew violation causes a crossing conflict.

A crossing conflict cascades into network-wide delay.

Threshold was built to detect these critical points before they become operational incidents.

---

## The Solution

Threshold acts as an AI Operational Intelligence Assistant for railway control environments.

The system:

* Analyses complete shift context
* Detects hidden operational conflicts
* Identifies crew expiry risks
* Tracks departmental constraints
* Evaluates engineering block impact
* Simulates consequences of different actions
* Generates structured recommendations
* Maintains a full audit trail of controller decisions

The controller always remains in command.

Threshold recommends.

Humans decide.

---

## Key Features

### Advance Plot Analysis

Detects:

* Train crossing conflicts
* Precedence violations
* Crew expiry risks
* Departmental constraints
* Blocking conditions

before they become operational failures.

### Action Plan Generation

Creates prioritized operational actions for each detected issue.

Examples:

* Loop freight to allow priority passenger movement
* Arrange crew relief
* Hold trains pending engineering clearance
* Coordinate with maintenance departments

### What-If Simulation

Evaluates the operational consequences of different actions before implementation.

Measures:

* Passenger punctuality
* Freight throughput
* Crew compliance
* Cascade impact
* Department coordination requirements

### Emergency Mode

For life-safety situations such as:

* Suspected rail fractures
* Lost radio contact
* Trains approaching hazardous sections
* Infrastructure failures

Threshold automatically shifts from optimisation to protection-first decision making.

### Controller Challenge & Override

Controllers can:

* Accept recommendations
* Challenge AI reasoning
* Override recommendations
* Record justification

All decisions are logged for accountability.

---

## Scenarios

Threshold includes five operational scenarios inspired by real railway operational challenges.

| Scenario          | Difficulty |
| ----------------- | ---------- |
| Kazipet Emergency | Critical   |
| Delayed Rajdhani  | High       |
| Night Freight Jam | Medium     |
| Monsoon Clearance | High       |
| Crew Cascade      | Critical   |

The AI receives only raw operational data.

No predefined answers are hardcoded.

---

## System Architecture

```text
Controller
     │
     ▼
React Frontend
     │
     ▼
Threshold API
     │
     ▼
Claude AI Engine
     │
     ▼
Risk Detection
Action Planning
What-If Analysis
Recommendation Engine
     │
     ▼
Decision Report
```

---

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Frontend   | React + Vite + TailwindCSS + Zustand |
| Backend    | Node.js + Express                    |
| AI Engine  | Anthropic Claude                     |
| Deployment | Vercel + Render                      |

---

## Local Development

### Backend

```bash
cd threshold/backend
cp .env.example .env
npm install
npm run dev
```

Add:

```env
ANTHROPIC_API_KEY=your_api_key
```

---

### Frontend

```bash
cd threshold/frontend
npm install
npm run dev
```

---

## Deployment

### Frontend

Deploy on Vercel.

### Backend

Deploy on Render.

Configure:

```env
VITE_API_URL=<backend-url>
```

and

```env
ANTHROPIC_API_KEY=<your-key>
```

---

## Project Structure

```text
threshold/
├── frontend/
├── backend/
├── scenarios/
├── prompts/
└── docs/
```

---

## Vision

Railway incidents are often preceded by warning signs that appear insignificant when viewed individually.

Threshold exists to identify those signals early, connect them together, and help controllers make better decisions before disruption occurs.

**Threshold — Detecting the critical points that often go unnoticed.**
