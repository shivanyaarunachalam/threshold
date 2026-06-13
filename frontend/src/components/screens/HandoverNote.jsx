import { useSessionStore } from '../../store/sessionStore'
import { analyzeSituation } from '../../api/threshold'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { ErrorBanner } from '../ui/ErrorBanner'

const DELAY_COLOR  = (m) => m === 0 ? 'text-green-400' : m <= 10 ? 'text-amber-400' : 'text-red-400'
const CREW_COLOR   = (m) => m > 120 ? 'text-green-400' : m > 60 ? 'text-amber-400' : 'text-red-400'
const TRAIN_BADGE  = {
  'Rajdhani':       'text-red-400 border-red-800',
  'Vande Bharat':   'text-red-400 border-red-800',
  'Express':        'text-blue-400 border-blue-800',
  'Passenger':      'text-gray-400 border-gray-700',
  'Coal Freight':   'text-yellow-500 border-yellow-800',
  'Container Freight':'text-yellow-400 border-yellow-800',
  'Freight':        'text-yellow-400 border-yellow-800',
  'Departmental':   'text-gray-500 border-gray-700',
}

export function HandoverNote() {
  const {
    shiftContext,
    loading, error, retryCount,
    setLoading, setError, clearError,
    incrementRetry, resetRetry,
    setIntelligence, markScreenComplete, navigateTo,
    setSystemStatus,
  } = useSessionStore()

  const { trains, stations, maintenanceBlocks, speedRestrictions,
          crew, freightInfo, handoverNote, shiftStart,
          weather, historicalContext, departmentConstraints } = shiftContext

  const lateTrains  = trains.filter((t) => t.delayMinutes > 0).length
  const crewAtRisk  = (crew ?? []).filter((c) => c.dutyRemainingMinutes < 90).length
  const safetyBlock = (departmentConstraints ?? []).filter((d) => d.blocksMovement).length

  async function handleScan() {
    clearError()
    setLoading(true)
    setSystemStatus('scanning')
    try {
      const result = await analyzeSituation(shiftContext)
      setIntelligence(result)
      resetRetry()
      setSystemStatus('complete')
      markScreenComplete('builder')
      navigateTo('intelligence')
    } catch (err) {
      incrementRetry()
      setSystemStatus('error')
      setError(`Scan failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Historical context banner — shows scenario relevance */}
      {historicalContext && (
        <div className="bg-blue-950/20 border border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 text-lg shrink-0">◈</span>
            <div>
              <p className="text-blue-300 font-bold text-sm mb-1">{historicalContext.title}</p>
              <p className="text-gray-400 text-xs leading-relaxed">{historicalContext.summary}</p>
              <p className="text-blue-600 text-xs mt-2 italic">{historicalContext.lesson}</p>
            </div>
          </div>
        </div>
      )}

      {/* Shift status bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Shift Start</p>
          <p className="text-white font-bold font-mono">{shiftStart}</p>
        </div>
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Trains</p>
          <p className="text-white font-bold">{trains.length} active</p>
        </div>
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Running Late</p>
          <p className={`font-bold ${lateTrains > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {lateTrains > 0 ? `${lateTrains} train${lateTrains > 1 ? 's' : ''}` : 'None'}
          </p>
        </div>
        <div className="bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Safety Blocks</p>
          <p className={`font-bold ${safetyBlock > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {safetyBlock > 0 ? `${safetyBlock} active` : 'None'}
          </p>
        </div>
      </div>

      {/* Weather conditions */}
      {weather && (
        <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${
          weather.rainMm > 5 ? 'bg-blue-950/15 border-blue-800' : 'bg-gray-900 border-gray-800'
        }`}>
          <span className="text-2xl shrink-0">
            {weather.rainMm > 10 ? '🌧' : weather.rainMm > 0 ? '🌦' : '☀️'}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-white font-semibold text-sm">{weather.condition}</span>
              <span className="text-gray-400 text-xs">Visibility: {weather.visibilityKm} km</span>
              <span className="text-gray-400 text-xs">Rain: {weather.rainMm} mm/hr</span>
              <span className="text-gray-400 text-xs">Wind: {weather.windKmh} km/h</span>
            </div>
            {weather.note && (
              <p className="text-amber-400 text-xs mt-1">⚠ {weather.note}</p>
            )}
          </div>
        </div>
      )}

      {/* Handover note */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl">
        <div className="px-4 py-2.5 border-b border-gray-800">
          <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">
            Handover Note — from outgoing controller
          </p>
        </div>
        <div className="px-4 py-3 space-y-1.5">
          {handoverNote.split('\n').filter(Boolean).map((line, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-600 shrink-0 mt-1">·</span>
              <p className="text-gray-300 text-sm">{line}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active trains — clean table */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-800">
          <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest">
            Active Trains
          </p>
        </div>
        <div>
          {trains.map((t, i) => {
            const crewData = crew?.find((c) => c.trainNo === t.trainNo)
            const freight  = freightInfo?.find((f) => f.trainNo === t.trainNo)
            const badge    = TRAIN_BADGE[t.trainType] ?? TRAIN_BADGE['Passenger']
            return (
              <div key={t.trainNo} className={`flex items-center gap-3 px-4 py-2.5 ${
                i < trains.length - 1 ? 'border-b border-gray-800' : ''
              }`}>
                <div className="w-24 shrink-0">
                  <p className="text-white font-mono font-bold text-sm">{t.trainNo}</p>
                  <span className={`text-xs border rounded px-1 ${badge}`}>
                    {freight?.cargo ?? t.trainType}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm truncate">{t.trainName}</p>
                  <p className="text-gray-600 text-xs">{t.currentStation} → {t.nextStation}</p>
                </div>
                <div className="text-right shrink-0 w-20">
                  <p className={`text-sm font-bold ${DELAY_COLOR(t.delayMinutes)}`}>
                    {t.delayMinutes === 0 ? 'On Time' : `+${t.delayMinutes} min`}
                  </p>
                  {crewData && (
                    <p className={`text-xs font-semibold ${CREW_COLOR(crewData.dutyRemainingMinutes)}`}>
                      {crewData.dutyRemainingMinutes}m crew
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Infrastructure at a glance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Loop availability */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-2">Loops</p>
          <div className="space-y-1.5">
            {stations.filter((s) => s.totalLoops > 0).map((s) => {
              const free = s.totalLoops - s.occupiedLoops
              return (
                <div key={s.id} className="flex items-center justify-between">
                  <p className="text-gray-400 text-xs">{s.name}</p>
                  <p className={`text-xs font-bold ${free > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {free}/{s.totalLoops} free
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Maintenance blocks */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-2">Blocks</p>
          {maintenanceBlocks.length === 0 ? (
            <p className="text-gray-600 text-xs">None active</p>
          ) : maintenanceBlocks.map((mb) => (
            <div key={mb.id}>
              <p className="text-amber-400 text-xs font-semibold">{mb.location}</p>
              <p className="text-gray-500 text-xs">{mb.startTime}–{mb.endTime} · {mb.requestedBy}</p>
            </div>
          ))}
        </div>

        {/* Speed restrictions */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <p className="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest mb-2">Restrictions</p>
          {speedRestrictions.length === 0 ? (
            <p className="text-gray-600 text-xs">None active</p>
          ) : speedRestrictions.map((sr, i) => (
            <div key={i}>
              <p className="text-red-400 text-xs font-semibold">{sr.location} — {sr.limitKmh} km/h</p>
              <p className="text-gray-500 text-xs">{sr.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Safety constraints callout */}
      {safetyBlock > 0 && (
        <div className="bg-red-950/20 border border-red-800 rounded-xl px-4 py-3">
          <p className="text-red-300 font-bold text-sm mb-1">⚠ Safety Constraint Active</p>
          {(departmentConstraints ?? []).filter((d) => d.blocksMovement).map((d, i) => (
            <p key={i} className="text-red-400 text-xs">{d.department}: {d.description}</p>
          ))}
        </div>
      )}

      {error && (
        <ErrorBanner message={error}
          onRetry={retryCount < 2 ? handleScan : undefined}
          retryCount={retryCount} maxRetries={2} />
      )}

      {loading ? (
        <LoadingSpinner label="Running AI Intelligence Scan…" />
      ) : (
        <button onClick={handleScan}
          className="w-full py-4 bg-blue-700 hover:bg-blue-600 text-white rounded-xl
            font-bold text-sm tracking-widest uppercase transition-all shadow-lg shadow-blue-950/60">
          ▶  Run AI Intelligence Scan
        </button>
      )}
    </div>
  )
}
