import { useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { NetWorthSnapshot } from '@/types'
import { buildNetWorthSeries, type TrendRange } from '@/data/selectors'
import { Segmented } from '@/components/ui/Segmented'
import { formatMoneyCompact, formatSigned, formatDateShort } from '@/lib/format'

interface Props {
  snapshots: NetWorthSnapshot[]
}

const RANGES: { value: TrendRange; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1A' },
  { value: 'ALL', label: 'Max' },
]

export function NetWorthTrend({ snapshots }: Props) {
  const [range, setRange] = useState<TrendRange>('6M')
  const series = useMemo(() => buildNetWorthSeries(snapshots, range), [snapshots, range])

  if (snapshots.length === 0) return null

  const data = series.points.map((p) => ({ asOf: p.asOf, total: Math.round(p.total) }))
  const up = series.delta >= 0
  const stroke = up ? 'var(--positive)' : 'var(--negative)'
  const values = data.map((d) => d.total)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * 0.15, 50)
  const ticks = data
    .filter((_, i) => i === 0 || i === data.length - 1 || i % Math.max(1, Math.ceil(data.length / 3)) === 0)
    .map((d) => d.asOf)

  return (
    <section className="rise">
      <div className="card card-pad">
        <div className="trend-head">
          <span className="section-label">Évolution du patrimoine</span>
          {data.length >= 2 && (
            <span className={`pill ${up ? 'pill-positive' : 'pill-negative'}`}>
              {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {formatSigned(series.delta)}
            </span>
          )}
        </div>

        {data.length < 2 ? (
          <p className="trend-empty">L’historique se construit jour après jour. Reviens demain pour voir ta courbe grandir 🌱</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="asOf"
                ticks={ticks}
                tickFormatter={(v: string) => formatDateShort(v)}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--text-faint)', fontFamily: 'var(--font-ui)' }}
              />
              <YAxis hide domain={[min - pad, max + pad]} />
              <Area type="monotone" dataKey="total" stroke={stroke} strokeWidth={2.5} fill="url(#nwFill)" dot={false} activeDot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}

        <div className="trend-foot">
          <Segmented<TrendRange> options={RANGES} value={range} onChange={setRange} />
          {data.length >= 2 && <span className="trend-foot-val num">{formatMoneyCompact(data[data.length - 1].total)}</span>}
        </div>
      </div>
    </section>
  )
}
