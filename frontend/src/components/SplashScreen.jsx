import { useEffect, useState } from 'react'

export function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Start fade-out at 1.6s, complete by 2s
    const fadeTimer = setTimeout(() => setFading(true), 1600)
    const doneTimer = setTimeout(() => onDone(), 2200)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div className={`fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center
      transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}>

      {/* Logo mark */}
      <div className="mb-6">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 4L44 40H4L24 4Z" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" fill="none"/>
          <path d="M24 16L36 36H12L24 16Z" fill="#3b82f6" fillOpacity="0.15"/>
          <circle cx="24" cy="28" r="2.5" fill="#3b82f6"/>
        </svg>
      </div>

      {/* Wordmark */}
      <h1 className="text-4xl font-bold tracking-[0.2em] text-white mb-3">
        THRESHOLD
      </h1>

      {/* Tagline */}
      <p className="text-gray-500 text-sm tracking-widest text-center max-w-xs">
        Detecting the critical points that often go unnoticed
      </p>

      {/* Subtle pulse dot */}
      <div className="mt-10 flex items-center gap-1.5">
        <div className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" />
        <div className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-1 h-1 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}
