import { useSessionStore } from '../../store/sessionStore'

const STEPS = [
  { key: 'builder',      label: 'Shift Brief',      code: '01' },
  { key: 'intelligence', label: 'AI Discoveries',   code: '02' },
  { key: 'simulator',    label: 'Risk Responses',   code: '03' },
  { key: 'command',      label: 'Decision',         code: '04' },
]

export function StepNav() {
  const { currentScreen, completedScreens, navigateTo, setError } = useSessionStore()

  function handleClick(key) {
    const result = navigateTo(key)
    if (!result.allowed) {
      setError(`Complete the ${result.blockedAt} phase first.`)
    }
  }

  return (
    <nav className="flex items-stretch mb-10 border border-gray-800 rounded-xl overflow-hidden bg-gray-900">
      {STEPS.map((step, i) => {
        const isActive = currentScreen === step.key
        const isDone   = completedScreens.includes(step.key)
        const isLocked = !isDone && !isActive

        return (
          <button
            key={step.key}
            onClick={() => handleClick(step.key)}
            disabled={isLocked}
            className={`relative flex-1 flex flex-col items-center gap-1 px-3 py-3 text-center
              transition-all border-r border-gray-800 last:border-r-0
              ${isActive              ? 'bg-blue-950/60'             : ''}
              ${isDone && !isActive   ? 'hover:bg-gray-800/50 cursor-pointer' : ''}
              ${isLocked              ? 'cursor-not-allowed'         : ''}
            `}
          >
            {isActive          && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />}
            {isDone && !isActive && <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-700" />}

            <span className={`text-xs font-bold font-mono tracking-widest
              ${isActive            ? 'text-blue-400'  : ''}
              ${isDone && !isActive ? 'text-green-500' : ''}
              ${isLocked            ? 'text-gray-700'  : ''}
            `}>
              {isDone && !isActive ? '✓' : step.code}
            </span>
            <span className={`text-xs font-medium leading-tight
              ${isActive            ? 'text-white'    : ''}
              ${isDone && !isActive ? 'text-gray-400' : ''}
              ${isLocked            ? 'text-gray-700' : ''}
            `}>
              {step.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
