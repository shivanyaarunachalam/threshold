import { useSessionStore } from '../../store/sessionStore'
import { SCENARIOS } from '../../api/scenarios/index.js'
import { generateDemoScenario } from '../../api/scenario.js'

const DIFFICULTY_STYLES = {
  CRITICAL: 'text-red-400 bg-red-950/40 border-red-800',
  HIGH:     'text-amber-400 bg-amber-950/40 border-amber-800',
  MEDIUM:   'text-blue-400 bg-blue-950/40 border-blue-800',
  LOW:      'text-green-400 bg-green-950/40 border-green-800',
}

export function ScenarioSelector({ onSelect }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Select a Scenario</h2>
        <p className="text-gray-500 text-sm">
          Each scenario contains only raw operational data.
          <span className="text-blue-400"> Threshold AI reasons from the data alone</span> — no pre-built answers.
        </p>
      </div>

      <div className="space-y-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full text-left bg-gray-900 border border-gray-700 hover:border-gray-500
              rounded-xl p-5 transition-all group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-xs font-bold font-mono text-gray-600">{String(s.id).padStart(2,'0')}</span>
                  <h3 className="text-white font-bold text-base group-hover:text-blue-300 transition-colors">
                    {s.name}
                  </h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${DIFFICULTY_STYLES[s.difficulty] ?? DIFFICULTY_STYLES.MEDIUM}`}>
                    {s.difficulty}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{s.tagline}</p>
                <p className="text-gray-600 text-xs">{s.region}</p>
              </div>
              <span className="text-gray-700 group-hover:text-blue-500 text-xl transition-colors shrink-0">→</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 border-t border-gray-800 pt-6">
        <p className="text-xs text-gray-600 text-center mb-3">Or use the default demo scenario</p>
        <button
          onClick={() => onSelect(generateDemoScenario())}
          className="w-full py-2.5 border border-gray-700 hover:border-gray-500 text-gray-400
            hover:text-white text-sm rounded-xl transition-all"
        >
          Use Demo Scenario (Kazipet Emergency)
        </button>
      </div>
    </div>
  )
}
