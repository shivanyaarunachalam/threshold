import { useSessionStore } from '../../store/sessionStore'
import { analyzeSituation } from '../../api/threshold'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'

const FIELDS = [
  {
    key: 'weather',
    label: 'Weather Conditions',
    placeholder: 'e.g. Heavy fog, visibility < 100m, wind 45 km/h',
    category: 'environment',
  },
  {
    key: 'signalStatus',
    label: 'Signal Status',
    placeholder: 'e.g. Signal 4A showing amber, Signal 4B unresponsive',
    category: 'signal',
  },
  {
    key: 'trackCondition',
    label: 'Track Condition',
    placeholder: 'e.g. Wet rails, leaf fall reported on sector 7–9',
    category: 'infrastructure',
  },
  {
    key: 'maintenanceStatus',
    label: 'Maintenance Status',
    placeholder: 'e.g. 30-day inspection overdue by 4 days',
    category: 'infrastructure',
  },
  {
    key: 'passengerLoad',
    label: 'Passenger Load',
    placeholder: 'e.g. 340 passengers, 95% capacity, 12 mobility-assisted',
    category: 'operations',
  },
  {
    key: 'crewStatus',
    label: 'Crew Status',
    placeholder: 'e.g. Driver on hour 9 of shift, no relief available',
    category: 'operations',
  },
  {
    key: 'driverReport',
    label: 'Driver Report',
    placeholder: 'e.g. Slight vibration felt at 80 km/h, brakes responsive',
    category: 'signal',
  },
]

const CATEGORY_COLORS = {
  environment:  'text-blue-400 border-blue-900 bg-blue-950/40',
  signal:       'text-amber-400 border-amber-900 bg-amber-950/30',
  infrastructure: 'text-orange-400 border-orange-900 bg-orange-950/30',
  operations:   'text-green-400 border-green-900 bg-green-950/30',
}

const CATEGORY_LABELS = {
  environment:    'ENV',
  signal:         'SIG',
  infrastructure: 'INF',
  operations:     'OPS',
}

export function SituationBuilder() {
  const {
    situation,
    setSituation,
    loading,
    error,
    retryCount,
    setLoading,
    setError,
    clearError,
    incrementRetry,
    resetRetry,
    setIntelligence,
    markScreenComplete,
    navigateTo,
    setSystemStatus,
  } = useSessionStore()

  const filledFields = FIELDS.filter((f) => situation[f.key].trim())
  const emptyFields  = FIELDS.filter((f) => !situation[f.key].trim())
  const allFilled    = emptyFields.length === 0
  const fillProgress = filledFields.length / FIELDS.length

  async function handleScan() {
    clearError()
    setLoading(true)
    setSystemStatus('scanning')
    try {
      const result = await analyzeSituation(situation)
      setIntelligence(result)
      resetRetry()
      setSystemStatus('complete')
      markScreenComplete('builder')
      navigateTo('intelligence')
    } catch (err) {
      incrementRetry()
      setSystemStatus('error')
      setError(`Intelligence scan failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Risk state derived from fill progress — pre-analysis heuristic
  const riskState = allFilled ? 'Ready to Scan' : `${emptyFields.length} Input${emptyFields.length > 1 ? 's' : ''} Required`

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── Situation Summary Panel ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-800 border border-gray-700 rounded-xl overflow-hidden mb-8">
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Operation Type</p>
          <p className="text-white font-semibold text-sm">Rail Corridor</p>
        </div>
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Risk State</p>
          <p className={`font-semibold text-sm ${allFilled ? 'text-green-400' : 'text-amber-400'}`}>
            {riskState}
          </p>
        </div>
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Signal Count</p>
          <p className="text-white font-semibold text-sm">
            <span className={filledFields.length === FIELDS.length ? 'text-green-400' : 'text-white'}>
              {filledFields.length}
            </span>
            <span className="text-gray-600"> / {FIELDS.length} Inputs</span>
          </p>
        </div>
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Analysis Engine</p>
          <p className="text-blue-400 font-semibold text-sm">Threshold v0.1</p>
        </div>
      </div>

      {/* ── Section header ── */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Operational Signal Inputs</h2>
          <p className="text-gray-500 text-xs mt-0.5">All seven signals required to initialize analysis</p>
        </div>
        {/* Input progress bar */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                allFilled ? 'bg-green-500' : 'bg-amber-500'
              }`}
              style={{ width: `${fillProgress * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 tabular-nums">
            {filledFields.length}/{FIELDS.length}
          </span>
        </div>
      </div>

      {/* ── Signal fields ── */}
      <div className="space-y-3">
        {FIELDS.map((field) => {
          const val     = situation[field.key]
          const isEmpty = !val.trim()
          const catCls  = CATEGORY_COLORS[field.category]
          const catLbl  = CATEGORY_LABELS[field.category]

          return (
            <div
              key={field.key}
              className={`border rounded-lg overflow-hidden transition-colors ${
                isEmpty ? 'border-gray-800' : 'border-gray-700'
              }`}
            >
              {/* Field header row */}
              <div className={`flex items-center gap-2 px-3 py-1.5 border-b ${
                isEmpty ? 'bg-gray-900 border-gray-800' : 'bg-gray-900/80 border-gray-700'
              }`}>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${catCls}`}>
                  {catLbl}
                </span>
                <label className="text-sm font-medium text-gray-300 flex-1">
                  {field.label}
                </label>
                {!isEmpty && (
                  <span className="text-green-500 text-xs">✓</span>
                )}
                {isEmpty && (
                  <span className="text-gray-600 text-xs">Required</span>
                )}
              </div>

              {/* Textarea */}
              <textarea
                rows={2}
                maxLength={500}
                placeholder={field.placeholder}
                value={val}
                onChange={(e) => setSituation(field.key, e.target.value)}
                disabled={loading}
                className="w-full bg-gray-900 px-3 py-2 text-gray-100 text-sm placeholder-gray-700
                  resize-none focus:outline-none focus:bg-gray-800/60 transition-colors disabled:opacity-50"
              />

              <div className="px-3 py-1 bg-gray-900 flex justify-end border-t border-gray-800">
                <span className={`text-xs tabular-nums ${val.length > 450 ? 'text-amber-400' : 'text-gray-700'}`}>
                  {val.length}/500
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Missing fields callout ── */}
      {!allFilled && filledFields.length > 0 && (
        <div className="mt-4 flex items-start gap-2 text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2">
          <span className="mt-0.5 shrink-0">▲</span>
          <span>
            <span className="font-semibold">Missing signals: </span>
            {emptyFields.map((f) => f.label).join(' · ')}
          </span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mt-4">
          <ErrorBanner
            message={error}
            onRetry={retryCount < 2 ? handleScan : undefined}
            retryCount={retryCount}
            maxRetries={2}
          />
        </div>
      )}

      {/* ── CTA ── */}
      {loading ? (
        <div className="mt-6">
          <LoadingSpinner label="Running Intelligence Scan…" />
        </div>
      ) : (
        <button
          onClick={handleScan}
          disabled={!allFilled}
          className={`mt-6 w-full py-3.5 rounded-lg font-bold text-sm tracking-widest uppercase transition-all ${
            allFilled
              ? 'bg-blue-700 hover:bg-blue-600 text-white shadow-lg shadow-blue-950/60'
              : 'bg-gray-900 border border-gray-800 text-gray-600 cursor-not-allowed'
          }`}
        >
          {allFilled ? '▶  Initialize Intelligence Scan' : `Complete ${emptyFields.length} Remaining Signal${emptyFields.length > 1 ? 's' : ''}`}
        </button>
      )}
    </div>
  )
}
