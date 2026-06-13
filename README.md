# Threshold

> **Detecting the critical points that often go unnoticed.**

Threshold is an AI Operational Intelligence system for rail safety. It analyzes shift contexts, detects compound risk patterns before they cascade into network-wide disruption, and generates structured recommendations — while keeping the controller in command.

---

## What it does

Railway controllers manage 30–50 trains per shift. Every crossing conflict, crew expiry, maintenance block, and equipment fault competes for their attention simultaneously. Current systems tell controllers **what is happening**. Threshold tells them **what will happen next** — and what to do about it.

- Detects compound weak signals that individually appear normal but together indicate emerging risk
- Activates Emergency Mode for life-safety events (track anomalies, lost radio contact, approaching trains)
- Generates a prioritised Action Plan with one recommendation per detected issue
- Simulates the consequence of each option before the controller decides
- Logs every decision with full reasoning trail and audit record

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS + Zustand |
| Backend | Node.js + Express |
| AI | Anthropic Claude API (claude-haiku-4-5) with prompt caching |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Deployment

### Frontend — Vercel

1. Push the repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Set **Root Directory** to `threshold/frontend`
4. Set the environment variable:
   ```
   VITE_USE_MOCKS=false
   VITE_API_URL=https://your-render-backend-url.onrender.com
   ```
5. Deploy

### Backend — Render

1. Create a new **Web Service** in [Render](https://render.com)
2. Connect your GitHub repo
3. Set **Root Directory** to `threshold/backend`
4. Set **Build Command** to `npm install`
5. Set **Start Command** to `node index.js`
6. Add environment variables:
   ```
   ANTHROPIC_API_KEY=your_key_here
   PORT=3001
   ```
7. Deploy — Render gives you a URL like `https://threshold-backend.onrender.com`

### Connect frontend to backend

Once the backend is deployed, update the Vercel environment variable:
```
VITE_API_URL=https://threshold-backend.onrender.com
```

Then update `frontend/src/api/threshold.js` — replace:
```js
const BASE = '/api'
```
with:
```js
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'
```

Redeploy the frontend.

---

## Local Development

### 1. Backend
```bash
cd threshold/backend
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm install
npm run dev               # http://localhost:3001
```

### 2. Frontend
```bash
cd threshold/frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/api` calls to `localhost:3001` automatically in dev mode.

### Mock Mode (no API key needed)

Set `VITE_USE_MOCKS=true` in `frontend/.env`. The frontend uses built-in mock responses — no backend required. Switch to `false` when you have an API key.

---

## Scenarios

Five operational scenarios are included, each containing only raw shift data. The AI reasons from the data alone — no pre-built answers.

| # | Scenario | Type |
|---|---|---|
| 01 | Kazipet Emergency | Track anomaly, 3 trains converging, 9 minutes |
| 02 | The Delayed Rajdhani | Crossing conflict, priority precedence decision |
| 03 | Night Freight Jam | Perishable cargo priority, crew expiry, maintenance block |
| 04 | Monsoon Clearance | Landslide, cyclonic rain, 6 minutes |
| 05 | Crew Cascade | 4 trains expiring, one relief station, platform blocked |

---

## Project Structure

```
threshold/
├── frontend/               # React + Vite + Tailwind
│   └── src/
│       ├── api/            # API client, mock engine, scenarios
│       ├── components/
│       │   ├── screens/    # HandoverNote, AdvancePlot, ActionPlan, CommandCenter
│       │   └── ui/         # StepNav, StatusBadge, LoadingSpinner
│       ├── store/          # Zustand session store
│       ├── types/          # Entity types and priority tables
│       └── utils/          # Report generator, IST timestamps
└── backend/                # Node.js + Express
    └── src/
        ├── claude.js       # Anthropic client with prompt caching
        ├── prompts.js      # All AI prompts (analyze, action plan, recommend, re-evaluate)
        ├── routes.js       # API endpoints
        └── validate.js     # Response schema validation
```

---

## Decision Rules

See `docs/decision-rules.md` for the documented constraints on AI behaviour — discovered through mock testing before any API credits were spent.

Key rules:
1. Never invent signals not present in the input data
2. Every risk signal requires evidence from at least two input fields
3. Normal conditions do not generate alerts
4. Emergency life-safety events override all scheduling optimisation
5. Zero detected signals is a valid and valuable result
