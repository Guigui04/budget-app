import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { SimulatorChart } from '@/components/charts/SimulatorChart'
import { projectInvestment, RISK_PROFILES, type RiskProfileKey } from '@/data/selectors'
import { formatMoney, formatMoneyCompact } from '@/lib/format'
import { useCountUp } from '@/lib/useCountUp'
import { haptic } from '@/lib/haptics'

interface Props {
  open: boolean
  onClose: () => void
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="sim-field">
      <div className="sim-field-head">
        <label className="sim-field-label">{label}</label>
        <span className="sim-field-value num">{format(value)}</span>
      </div>
      <input
        type="range"
        className="slider"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

/**
 * Simulateur d'intérêts composés interactif. Pédagogique : illustre une
 * mécanique d'épargne, sans recommandation personnalisée (cf. contraintes
 * réglementaires — l'app informe, elle ne conseille pas).
 */
export function SimulatorSheet({ open, onClose }: Props) {
  const [initial, setInitial] = useState(2000)
  const [monthly, setMonthly] = useState(150)
  const [years, setYears] = useState(20)
  const [profileKey, setProfileKey] = useState<RiskProfileKey>('balanced')

  const profile = RISK_PROFILES.find((p) => p.key === profileKey)!
  const projection = useMemo(
    () => projectInvestment({ initial, monthly, years, annualRate: profile.annualRate }),
    [initial, monthly, years, profile.annualRate],
  )
  const displayFinal = useCountUp(projection.finalValue)

  return (
    <Sheet open={open} onClose={onClose} title="Et si tu investissais ?">
      <div className="sim-result">
        <span className="section-label">Valeur projetée dans {years} ans</span>
        <span className="sim-result-value num" style={{ color: profile.color }}>{formatMoney(displayFinal)}</span>
        <div className="sim-result-split">
          <span><span className="sim-dot versed" /> {formatMoneyCompact(projection.totalInvested)} versés</span>
          <span><span className="sim-dot gain" style={{ background: profile.color }} /> +{formatMoneyCompact(projection.totalGain)} d’intérêts</span>
        </div>
      </div>

      <SimulatorChart points={projection.points} color={profile.color} />

      {/* Profil de risque */}
      <div className="sim-field">
        <label className="sim-field-label">Profil</label>
        <div className="sim-profiles">
          {RISK_PROFILES.map((p) => (
            <button
              key={p.key}
              className={`sim-profile ${p.key === profileKey ? 'active' : ''}`}
              style={p.key === profileKey ? { borderColor: p.color, background: `${p.color}14` } : undefined}
              onClick={() => { haptic('selection'); setProfileKey(p.key) }}
            >
              <span className="sim-profile-name" style={{ color: p.color }}>{p.label}</span>
              <span className="sim-profile-rate num">{Math.round(p.annualRate * 100)} %/an</span>
              <span className="sim-profile-blurb">{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>

      <Slider label="Capital de départ" value={initial} min={0} max={50000} step={500} format={(v) => formatMoneyCompact(v)} onChange={setInitial} />
      <Slider label="Versement mensuel" value={monthly} min={0} max={2000} step={10} format={(v) => `${formatMoneyCompact(v)}/mois`} onChange={setMonthly} />
      <Slider label="Durée" value={years} min={1} max={40} step={1} format={(v) => `${v} an${v > 1 ? 's' : ''}`} onChange={setYears} />

      <p className="sim-disclaimer">
        <Info size={13} /> Simulation pédagogique à rendement constant. Les marchés fluctuent : ce n’est ni une promesse ni un conseil en investissement.
      </p>
    </Sheet>
  )
}
