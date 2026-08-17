import { useEffect, useState } from 'react'

interface GaugeRingProps {
  /** 0-1, how much of income is already allocated (bills + flex spent) */
  fraction: number
  overBudget: boolean
  size?: number
  strokeWidth?: number
  children: React.ReactNode
}

export default function GaugeRing({ fraction, overBudget, size = 240, strokeWidth = 18, children }: GaugeRingProps) {
  const [animatedFraction, setAnimatedFraction] = useState(0)
  const clamped = Math.min(Math.max(fraction, 0), 1)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setAnimatedFraction(clamped))
    return () => cancelAnimationFrame(raf)
  }, [clamped])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - animatedFraction)
  const center = size / 2

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={overBudget ? '#ff5c5c' : '#6c5ce7'} />
            <stop offset="100%" stopColor={overBudget ? '#ff9f43' : '#4f8cff'} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/5 dark:text-white/10"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
