import { useSessionStore } from '../../store/sessionStore'
import { getRecommendation } from '../../api/threshold'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'

const SUPPORT_STYLES = {
  Strong:   'text-green-400 bg-green-950 border-green-800',
  Moderate: 'text-amber-400 bg-amber-950 border-amber-800',
  Weak:     'text-gray-500 bg-gray-800 border-gray-700',
}

const IMPACT_ICONS = {
  passengerPunctuality: { label: 'Passenger Punctuality', icon: '👤' },
  freightThroughput:    { label: 'Freight Throughput',    icon: '📦' },
  crewCompliance:       { label: 'Crew Compliance',       icon: '🧑‍✈️' },
  cascadeImpact:        { label: 'Cascade Impact',        icon: '🔗' },
  departmentImpact:     { label: 'Department Coordination', icon: '🏛' },
}

function OptionCard({ option, isDoNothing }) {
  const supportCls = SUPPORT_STYLES[option.supportLevel] ?? SUPPORT_STYLES.Weak

  return (
    <div className={`bg-gray-900 rounded-xl border overflow-hidden ${
      isDoNothing ? 'border-gray-800 opacity-80' :
      option.supportLevel === 'Strong' ? 'border-green-900' :
      option.supportLevel === 'Moderate' ? 'border-amber-900' : 'border-gray-800'
    }`}>
      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className={`text-sm font-bold leading-tight ${isDoNothing ? 'text-gray-500' : 'text-white'}`}>
            {option.action}
          </p>
          <p className="text-gray-500 text-xs mt-1">{option.description}</p>
          {option.precedenceRule && (
            <span className="inline-block mt-1.5 text-xs font-mono text-blue-500 bg-blue-950/50 border border-blue-900 rounded px-1.5 py-0.5">
              Rule {option.precedenceRule}
            </span>
          )}
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${supportCls}`}>
          {option.supportLevel}
        </span>
      </div>

      {/* Reasoning */}
      {option.reasoning?.length > 0 && (
        <div className="px-4 pt-3 pb-0">
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-1.5">Why</p>
          <ul className="space-y-0.5">
            {option.reasoning.map((r, i) => (
              <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                <span className="text-gray-700 shrink-0">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Consequences */}
      <div className="px-4 py-3 space-y-2">
        {Object.entries(IMPACT_ICONS).map(([key, meta]) => (
          <div key={key} className="flex gap-2">
            <span className="text-sm shrink-0 w-5">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-semibold">{meta.label}</p>
              <p className={`text-xs mt-0.5 leading-relaxed ${
                isDoNothing && key !== 'passengerPunctuality' ? 'text-gray-600' : 'text-gray-300'
              }`}>
                {option.consequences[key]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WhatIfConsole() {
  const {
    whatIf, shiftContext, intelligence,
    loading, error, retryCount,
    setLoading, setError, clearError,
    incrementRetry, resetRetry,
    setRecommendation, markScreenComplete, navigateTo,
    setSystemStatus,
  } = useSessionStore()

  if (!whatIf) return null

  const options = whatIf.options ?? []
  const actionOptions  = options.filter((o) => o.id !== 'do_nothing')
  const doNothingOption = options.find((o) => o.id === 'do_nothing')

  async function handleProceed() {
    clearError()
    setLoading(true)
    setSystemStatus('recommending')
    try {
      const result = await getRecommendation(shiftContext, intelligence, whatIf)
      setRecommendation(result)
      resetRetry()
      setSystemStatus('complete')
      markScreenComplete('simulator')
      navigateTo('command')
    } catch (err) {
      incrementRetry()
      setSystemStatus('error')
      setError(`Recommendation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white tracking-tight">What-If Console</h2>
        <p className="text-gray-500 text-xs mt-0.5">
          AI-generated regulation options for current territory state.
          Each option shows the full consequence cascade before you decide.
        </p>
      </div>

      {/* Action options */}
      {actionOptions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-gray-600 font-mono uppercase tracking-widest mb-3">
            Available Actions ({actionOptions.length})
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionOptions.map((opt) => (
              <OptionCard key={opt.id} option={opt} isDoNothing={false} />
            ))}
          </div>
        </div>
      )}

      {/* Do Nothing — always last */}
      {doNothingOption && (
        <div className="mb-6">
          <p className="text-xs text-gray-600 font-mono uppercase tracking-widest mb-3">
            Baseline — If No Action Taken
          </p>
          <OptionCard option={doNothingOption} isDoNothing={true} />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorBanner
            message={error}
            onRetry={retryCount < 2 ? handleProceed : undefined}
            retryCount={retryCount}
            maxRetries={2}
          />
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Generating Command Recommendation…" />
      ) : (
        <button
          onClick={handleProceed}
          className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg
            font-bold text-sm tracking-widest uppercase transition-colors shadow-lg shadow-blue-950/40"
        >
          ▶  Generate Command Recommendation
        </button>
      )}
    </div>
  )
}
