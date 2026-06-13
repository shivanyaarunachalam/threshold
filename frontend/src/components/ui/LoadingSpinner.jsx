export function LoadingSpinner({ label = 'Processing…' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      <p className="text-blue-400 text-xs font-mono tracking-widest uppercase">{label}</p>
      <p className="text-gray-600 text-xs">This may take 10–30 seconds</p>
    </div>
  )
}
