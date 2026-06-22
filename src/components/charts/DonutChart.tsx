import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { CategorySlice } from '@/data/selectors'
import { formatMoneyCompact } from '@/lib/format'

interface DonutChartProps {
  slices: CategorySlice[]
  total: number
  centerLabel?: string
}

export function DonutChart({ slices, total, centerLabel = 'Dépensé' }: DonutChartProps) {
  const data = slices.map((s) => ({ name: s.category.name, value: s.amount, color: s.category.color }))

  return (
    <div className="donut">
      <ResponsiveContainer width="100%" height={188}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span className="donut-center-label">{centerLabel}</span>
        <span className="donut-center-value num">{formatMoneyCompact(total)}</span>
      </div>
    </div>
  )
}
