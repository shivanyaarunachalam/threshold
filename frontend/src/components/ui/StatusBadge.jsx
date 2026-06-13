/**
 * State color system:
 *   Blue  → Information / nominal
 *   Amber → Uncertainty / caution
 *   Red   → Critical / high risk
 *   Green → Verified / safe
 *   Gray  → Unknown
 */
export function StatusBadge({ level }) {
  const map = {
    // Risk levels
    high:    'bg-red-950 text-red-400 border border-red-800',
    medium:  'bg-amber-950 text-amber-400 border border-amber-800',
    low:     'bg-blue-950 text-blue-400 border border-blue-800',
    // Quality ratings
    good:     'bg-green-950 text-green-400 border border-green-800',
    adequate: 'bg-blue-950 text-blue-400 border border-blue-800',
    medium:   'bg-amber-950 text-amber-400 border border-amber-800',
    poor:     'bg-red-950 text-red-400 border border-red-800',
    // Confidence
    verified: 'bg-green-950 text-green-400 border border-green-800',
    unknown: 'bg-gray-800 text-gray-500 border border-gray-700',
  }
  const cls = map[level?.toLowerCase()] ?? map.unknown
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${cls}`}>
      {level}
    </span>
  )
}
