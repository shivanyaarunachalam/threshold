import { useSessionStore } from '../../store/sessionStore'
import { simulateConsequences } from '../../api/threshold'
import { StatusBadge } from '../ui/StatusBadge'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'

export function WeakSignalIntelligence() {
  const {
    intelligence,
    situation,
    loading,
    error,
    retryCount,
    setLoading,
    setError,
    clearError,
    incrementRetry,
    resetRetry,
    setSimulation,
    markScreenComplete,
    navigateTo,
    setSystemStatus,
  } = useSessionStore()

  if (!intelligence) return null

  const { weakSignals, whyConcerned, dataQuality, unknownSituationCheck } = intelligence

  async function handleProceed() {
    clearError()
    setLoading(true)
    setSystemStatus('simulating')
    try {
      const result = await simulateConsequences(situation, intelligence)
      setSimulation(result)
      resetRetry()
      setSystemStatus('complete')
      markScreenComplete('intelligence')
      navigateTo('simulator')
    } catch (err) {
      incrementRetry()
      setSystemStatus('error')
      setError(`Simulation failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-white mb-1">Weak Signal Intelligence</h2>
        <p className="text-gray-400 text-sm">AI analysis of your operational situation.</p>
      </div>

      {/* Unknown Situation Banner */}
      {unknownSituationCheck?.classification === 'unknown/novel' && (
        <div className="bg-amber-950 border border-amber-600 rounded-lg p-4 flex gap-3">
          <span className="text-amber-400 text-xl">⚠</span>
          <div>
            <p className="text-amber-300 font-semibold text-sm">Novel Situation Detected</p>
            <p className="text-amber-400 text-sm mt-0.5">
              AI confidence is limited for this situation. Additional human judgment is required.
            </p>
          </div>
        </div>
      )}

      {/* Detected Weak Signals */}
      <section className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-3">Detected Weak Signals</h3>
        {weakSignals && weakSignals.length > 0 ? (
          <div className="space-y-3">
            {weakSignals.map((signal, i) => (
              <div key={i} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{signal.name}</span>
                  <StatusBadge level={signal.riskLevel} />
                </div>
                <p className="text-gray-400 text-xs">
                  Contributing fields:{' '}
                  <span className="text-cyan-400">{signal.contributingFields?.join(', ')}</span>
                </p>
                {signal.description && (
                  <p className="text-gray-300 text-sm mt-1">{signal.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-green-400 text-sm">No dangerous signal combinations identified.</p>
        )}
      </section>

      {/* Why Threshold Is Concerned */}
      {whyConcerned && (
        <section className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Why Threshold Is Concerned</h3>
          <p className="text-gray-300 text-sm leading-relaxed">{whyConcerned}</p>
        </section>
      )}

      {/* Data Quality Assessment */}
      {dataQuality && (
        <section className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Data Quality Assessment</h3>
            <StatusBadge level={dataQuality.overallRating} />
          </div>
          {dataQuality.fieldFlags && dataQuality.fieldFlags.length > 0 && (
            <div className="space-y-2 mt-3">
              {dataQuality.fieldFlags.map((flag, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-amber-400 shrink-0">▲</span>
                  <span>
                    <span className="text-cyan-400 font-medium">{flag.field}:</span>{' '}
                    <span className="text-gray-300">{flag.concern}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {dataQuality.summary && (
            <p className="text-gray-400 text-sm mt-3">{dataQuality.summary}</p>
          )}
        </section>
      )}

      {/* Unknown Situation Check */}
      {unknownSituationCheck && (
        <section className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-2">Unknown Situation Check</h3>
          <div className="flex items-center gap-3">
            <StatusBadge
              level={unknownSituationCheck.classification === 'within known patterns' ? 'good' : 'high'}
            />
            <span className="text-gray-300 text-sm">{unknownSituationCheck.classification}</span>
          </div>
          {unknownSituationCheck.explanation && (
            <p className="text-gray-400 text-sm mt-2">{unknownSituationCheck.explanation}</p>
          )}
        </section>
      )}

      {error && (
        <ErrorBanner
          message={error}
          onRetry={retryCount < 2 ? handleProceed : undefined}
          retryCount={retryCount}
          maxRetries={2}
        />
      )}

      {loading ? (
        <LoadingSpinner label="Running consequence simulation…" />
      ) : (
        <button
          onClick={handleProceed}
          className="w-full py-3 bg-blue-700 hover:bg-blue-600 text-white rounded-lg font-bold text-sm tracking-widest uppercase transition-colors shadow-lg shadow-blue-950/40"
        >
          ▶  Run Consequence Simulation
        </button>
      )}
    </div>
  )
}
