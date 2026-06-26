import { useCountUp } from '@/lib/useCountUp'

interface Props {
  /** Score 0-100. */
  score: number
  /** Couleur de l'arc (selon la note). */
  color: string
  size?: number
}

/**
 * Jauge circulaire du score de santé : un anneau qui se remplit de 0 à `score`,
 * coloré selon la note, avec la valeur animée au centre. SVG pur, sans dépendance.
 */
export function HealthGauge({ score, color, size = 132 }: Props) {
  const display = Math.round(useCountUp(score))
  const r = 56
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100

  return (
    <div className="health-gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" width={size} height={size}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth="11" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${pct * c} ${c}`}
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.2,0.6,0.3,1)' }}
        />
      </svg>
      <div className="health-gauge-center">
        <span className="health-gauge-value num" style={{ color }}>{display}</span>
        <span className="health-gauge-max">/ 100</span>
      </div>
    </div>
  )
}
