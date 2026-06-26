import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { InvestmentProjectionPoint } from '@/data/selectors'
import { formatMoneyCompact } from '@/lib/format'

interface Props {
  points: InvestmentProjectionPoint[]
  /** Couleur de l'aire « valeur » (profil de risque). */
  color: string
}

/**
 * Projection d'un placement : aire « versé » (capital injecté) sous l'aire
 * « valeur » (avec intérêts composés). L'écart visuel = l'effet des intérêts.
 */
export function SimulatorChart({ points, color }: Props) {
  if (points.length < 2) return null
  const data = points.map((p) => ({
    year: p.year,
    invested: Math.round(p.invested),
    value: Math.round(p.value),
  }))
  const max = Math.max(...data.map((d) => d.value))
  const ticks = data
    .filter((_, i) => i === 0 || i === data.length - 1 || i % Math.max(1, Math.ceil(data.length / 4)) === 0)
    .map((d) => d.year)

  return (
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="simValueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="year"
          ticks={ticks}
          tickFormatter={(v: number) => `${v} an${v > 1 ? 's' : ''}`}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}
        />
        <YAxis hide domain={[0, max * 1.08]} tickFormatter={(v: number) => formatMoneyCompact(v)} />
        {/* Capital versé : aire pleine discrète, repère du « sans rendement ». */}
        <Area type="monotone" dataKey="invested" stroke="var(--text-faint)" strokeWidth={1.5} strokeDasharray="3 3" fill="var(--surface-sunk)" fillOpacity={0.5} dot={false} activeDot={false} />
        {/* Valeur capitalisée. */}
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#simValueFill)" dot={false} activeDot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
