import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { GoalProjectionPoint } from '@/data/selectors'
import { formatMoneyCompact, formatDateShort } from '@/lib/format'

interface Props {
  points: GoalProjectionPoint[]
  /** Montant cible (ligne de repère). */
  target: number
  color: string
}

/**
 * Courbe de projection d'un objectif : progression mensuelle cumulée jusqu'à
 * l'atteinte, avec la cible en ligne de repère. Lecture immédiate du « quand ».
 */
export function GoalProjectionChart({ points, target, color }: Props) {
  if (points.length < 2) return null
  const data = points.map((p) => ({ month: p.monthIso, value: Math.round(p.value) }))
  const max = Math.max(target, ...data.map((d) => d.value))
  const ticks = data
    .filter((_, i) => i === 0 || i === data.length - 1 || i % Math.max(1, Math.ceil(data.length / 3)) === 0)
    .map((d) => d.month)

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <ReferenceLine
          y={target}
          stroke={color}
          strokeDasharray="4 4"
          strokeOpacity={0.55}
          label={{
            value: formatMoneyCompact(target),
            position: 'insideTopRight',
            fontSize: 10,
            fill: 'var(--text-faint)',
            fontFamily: 'var(--font-ui)',
          }}
        />
        <XAxis
          dataKey="month"
          ticks={ticks}
          tickFormatter={(v: string) => formatDateShort(v)}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}
        />
        <YAxis hide domain={[0, max * 1.08]} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill="url(#goalFill)" dot={false} activeDot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
