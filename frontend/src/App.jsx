import { useState } from 'react'
import { useSessionStore } from './store/sessionStore'
import { StepNav }          from './components/ui/StepNav'
import { ScenarioSelector } from './components/screens/ScenarioSelector'
import { HandoverNote }     from './components/screens/HandoverNote'
import { AdvancePlot }      from './components/screens/AdvancePlot'
import { ActionPlan }       from './components/screens/ActionPlan'
import { CommandCenter }    from './components/screens/CommandCenter'
import { SplashScreen }     from './components/SplashScreen'

const STATUS_CONFIG = {
  ready:        { label: 'Ready',                    dot: 'bg-green-400',               text: 'text-green-400' },
  scanning:     { label: 'Discovering Risks…',       dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400' },
  simulating:   { label: 'Simulating Consequences…', dot: 'bg-blue-400 animate-pulse',  text: 'text-blue-400'  },
  recommending: { label: 'Generating Intelligence…', dot: 'bg-blue-400 animate-pulse',  text: 'text-blue-400'  },
  complete:     { label: 'Intelligence Ready',        dot: 'bg-green-400',               text: 'text-green-400' },
  error:        { label: 'Error',                    dot: 'bg-red-500',                 text: 'text-red-400'   },
}

const Logo = () => (
  <div className="flex items-center gap-3">
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 3L25 23H3L14 3Z" stroke="#3b82f6" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
      <circle cx="14" cy="17" r="1.8" fill="#3b82f6"/>
    </svg>
    <div>
      <h1 className="text-white font-bold text-base leading-none tracking-widest">THRESHOLD</h1>
      <p className="text-gray-500 text-xs mt-0.5">AI Operational Intelligence · Rail Safety</p>
    </div>
  </div>
)

export default function App() {
  const [showSplash,     setShowSplash]     = useState(true)
  const [scenarioChosen, setScenarioChosen] = useState(false)

  const { currentScreen, error, clearError, systemStatus } = useSessionStore()
  const status = STATUS_CONFIG[systemStatus] ?? STATUS_CONFIG.ready

  function handleSelectScenario(scenario) {
    useSessionStore.setState({
      shiftContext:     scenario,
      currentScreen:    'builder',
      completedScreens: [],
      intelligence:     null,
      actionPlan:       null,
      activeIssue:      null,
      resolvedIssues:   [],
      recommendation:   null,
      reEvaluation:     null,
      overrideAnalysis: null,
      auditLog:         [],
      error:            null,
      systemStatus:     'ready',
    })
    setScenarioChosen(true)
  }

  // ── Splash ──────────────────────────────────────────────
  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />
  }

  // ── Scenario selector ───────────────────────────────────
  if (!scenarioChosen) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur px-6 py-3">
          <div className="max-w-4xl mx-auto">
            <Logo />
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-10">
          <ScenarioSelector onSelect={handleSelectScenario} />
        </main>
      </div>
    )
  }

  // ── Main app ────────────────────────────────────────────
  const screens = {
    builder:      <HandoverNote />,
    intelligence: <AdvancePlot />,
    simulator:    <ActionPlan />,
    command:      <CommandCenter />,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur sticky top-0 z-20 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded px-3 py-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              <span className={`text-xs font-semibold ${status.text}`}>{status.label}</span>
            </div>
            <button
              onClick={() => setScenarioChosen(false)}
              className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
            >
              ↩ Scenarios
            </button>
          </div>
        </div>
      </header>

      {error && currentScreen === 'builder' && (
        <div className="max-w-4xl mx-auto px-6 pt-4">
          <div className="bg-amber-950 border border-amber-800 rounded px-4 py-2 flex justify-between items-center">
            <span className="text-amber-300 text-sm">{error}</span>
            <button onClick={clearError} className="text-amber-600 hover:text-amber-400 text-xs ml-4">Dismiss</button>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-8">
        <StepNav />
        {screens[currentScreen]}
      </main>
    </div>
  )
}
