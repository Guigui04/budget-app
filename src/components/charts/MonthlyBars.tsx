import { Bar, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { MonthPoint } from '@/data/selectors'
import { formatMoneyCompact, formatSigned } from '@/lib/format'

interface MonthlyBarsProps {
  points: MonthPoint[]
}

interface Row {
  label: string
  spending: number
  income: number
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: Row }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="evo-tip">
      <span className="evo-tip-month">{label}</span>
      <span className="evo-tip-line"><span className="evo-dot dep" />Dépenses <b className="num">{formatMoneyCompact(row.spending)}</b></span>
      <span className="evo-tip-line"><span className="evo-dot rev" />Revenus <b className="num">{formatMoneyCompact(row.income)}</b></span>
    </div>
  )
}

/**
 * Évolution mensuelle : dépenses en barres (dégradé, mois courant accentué) et
 * revenus en courbe superposée, pour comparer entrées/sorties d'un coup d'œil.
 * En-tête = dépense du mois + tendance vs mois précédent. Remplit la carte.
 */
export function MonthlyBars({ points }: MonthlyBarsProps) {
  const data: Row[] = points.map((p) => ({
    label: p.label,
    spending: Math.round(p.spending),
    income: Math.round(p.income),
  }))
  const currentIdx = data.length - 1
  const cur = data[currentIdx]?.spending ?? 0
  const prev = data[currentIdx - 1]?.spending ?? 0
  const delta = cur - prev
  const max = Math.max(...data.flatMap((d) => [d.spending, d.income]), 1)
  const down = delta <= 0 // moins de dépenses = bon signe

  return (
    <div className="evo">
      <div className="evo-head">
        <div>
          <span className="section-label">Dépenses ce mois</span>
          <span className="evo-value num">{formatMoneyCompact(cur)}</span>
        </div>
        {prev > 0 && (
          <span className={`pill ${down ? 'pill-positive' : 'pill-negative'}`}>
            {down ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
            {formatSigned(delta)}
          </span>
        )}
      </div>

      <div className="evo-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="evoBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.12} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}
            />
            <YAxis hide domain={[0, max * 1.15]} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)', radius: 8 }} />
            <Bar dataKey="spending" radius={[10, 10, 10, 10]} maxBarSize={30}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === currentIdx ? 'var(--accent)' : 'url(#evoBar)'} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="income"
              stroke="var(--positive)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--positive)', strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="evo-legend">
        <span><span className="evo-dot dep" /> Dépenses</span>
        <span><span className="evo-dot rev" /> Revenus</span>
      </div>
    </div>
  )
}
