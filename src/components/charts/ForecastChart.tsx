import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { ForecastPoint } from '@/data/selectors'

interface ForecastChartProps {
  points: ForecastPoint[]
  /** True si la projection passe sous zéro (risque de découvert). */
  atRisk: boolean
}

export function ForecastChart({ points, atRisk }: ForecastChartProps) {
  const data = points.map((p) => ({ day: p.day, balance: Math.round(p.balance) }))
  const stroke = atRisk ? 'var(--negative)' : 'var(--accent)'
  const min = Math.min(...data.map((d) => d.balance))
  const max = Math.max(...data.map((d) => d.balance))
  // Marge verticale pour ne pas coller la courbe aux bords.
  const pad = Math.max((max - min) * 0.15, 20)
  // Quelques repères de jours répartis sur le mois.
  const ticks = data
    .filter((_, i) => i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 4) === 0)
    .map((d) => d.day)

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        {atRisk && (
          <ReferenceLine y={0} stroke="var(--negative)" strokeDasharray="3 3" strokeOpacity={0.5} />
        )}
        <XAxis
          dataKey="day"
          ticks={ticks}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}
        />
        <YAxis hide domain={[min - pad, max + pad]} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={stroke}
          strokeWidth={2.5}
          fill="url(#forecastFill)"
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
