export function ErrorBanner({ message, onRetry, retryCount = 0, maxRetries = 2 }) {
  const canRetry = retryCount < maxRetries
  return (
    <div className="bg-red-950 border border-red-700 rounded-lg p-4 flex items-start gap-3">
      <span className="text-red-400 text-lg mt-0.5">⚠</span>
      <div className="flex-1">
        <p className="text-red-300 text-sm">{message}</p>
        {retryCount >= maxRetries && (
          <p className="text-red-500 text-xs mt-1">
            Maximum retries reached. Please try again later.
          </p>
        )}
      </div>
      {onRetry && canRetry && (
        <button
          onClick={onRetry}
          className="text-xs bg-red-800 hover:bg-red-700 text-red-200 px-3 py-1.5 rounded transition-colors"
        >
          Retry ({maxRetries - retryCount} left)
        </button>
      )}
    </div>
  )
}
