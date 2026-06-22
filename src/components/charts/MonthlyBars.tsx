import { Bar, BarChart, Cell, ResponsiveContainer, XAxis } from 'recharts'
import type { MonthPoint } from '@/data/selectors'
import { formatMoneyCompact } from '@/lib/format'

interface MonthlyBarsProps {
  points: MonthPoint[]
}

export function MonthlyBars({ points }: MonthlyBarsProps) {
  const data = points.map((p) => ({ label: p.label, spending: Math.round(p.spending) }))
  const max = Math.max(...data.map((d) => d.spending), 1)
  const currentIdx = data.length - 1

  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap="26%">
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}
          />
          <Bar dataKey="spending" radius={[14, 14, 14, 14]} maxBarSize={34}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === currentIdx ? 'var(--accent)' : 'var(--accent-soft)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="bars-legend">
        <span className="section-label">Max {formatMoneyCompact(max)}</span>
      </div>
    </div>
  )
}
