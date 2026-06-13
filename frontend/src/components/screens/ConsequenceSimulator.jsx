import { useSessionStore } from '../../store/sessionStore'
import { getRecommendation } from '../../api/threshold'
import { StatusBadge } from '../ui/StatusBadge'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'

const OPTION_ICONS = {
  Proceed: '▶',
  Hold: '⏸',
  Inspect: '🔍',
  'Reduced Speed': '🐢',
}

const OPTION_COLORS = {
  Proceed: 'border-green-700',
  Hold: 'border-amber-700',
  Inspect: 'border-blue-700',
  'Reduced Speed': 'border-yellow-700',
}

function SimCard({ option }) {
  const icon = OPTION_ICONS[option.name] ?? '●'
  const border = OPTION_COLORS[option.name] ?? 'border-gray-700'

  return (
    <div className={`bg-gray-800 border ${border} rounded-xl p-5 flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h3 className="text-white font-bold text-base">{option.name}</h3>
        </div>
        {option.supportLevel && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
            option.supportLevel === 'Strong'   ? 'text-green-400 bg-green-950 border-green-800' :
            option.supportLevel === 'Moderate' ? 'text-amber-400 bg-amber-950 border-amber-800' :
                                                 'text-gray-400 bg-gray-800 border-gray-700'
          }`}>
            {option.supportLevel}
          </span>
        )}
      </div>

      {['benefits', 'risks', 'operationalImpact', 'passengerImpact'].map((section) => {
        const labels = {
          benefits: 'Benefits',
          risks: 'Risks',
          operationalImpact: 'Operational Impact',
          passengerImpact: 'Passenger Impact',
        }
        const colors = {
          benefits: 'text-green-400',
          risks: 'text-red-400',
          operationalImpact: 'text-blue-400',
          passengerImpact: 'text-yellow-400',
        }
        return (
          <div key={section}>
            <h4 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${colors[section]}`}>
              {labels[section]}
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">{option[section]}</p>
          </div>
        )
      })}
    </div>
  )
}

export function ConsequenceSimulator() {
  const {
    simulation,
    situation,
    intelligence,
    loading,
    error,
    retryCount,
    setLoading,
    setError,
    clearError,
    incrementRetry,
    resetRetry,
    setRecommendation,
    markScreenComplete,
    navigateTo,
    setSystemStatus,
  } = useSessionStore()

  if (!simulation) return null

  const options = simulation.options ?? []

  async function handleProceed() {
    clearError()
    setLoading(true)
    setSystemStatus('recommending')
    try {
      const result = await getRecommendation(situation, intelligence, simulation)
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Consequence Simulator</h2>
        <p className="text-gray-400 text-sm">
          AI-projected outcomes for each possible response option.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {options.map((opt) => (
          <SimCard key={opt.name} option={opt} />
        ))}
      </div>

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
        <LoadingSpinner label="Generating recommendation…" />
      ) : (
        <button
          onClick={handleProceed}
          className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold text-sm tracking-widest uppercase transition-colors shadow-lg shadow-blue-950/40"
        >
          ▶  Generate Command Recommendation
        </button>
      )}
    </div>
  )
}
