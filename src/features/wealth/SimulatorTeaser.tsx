import { useState } from 'react'
import { LineChart, ChevronRight } from 'lucide-react'
import { SimulatorSheet } from './SimulatorSheet'
import { haptic } from '@/lib/haptics'

/**
 * Point d'entrée vers le simulateur d'intérêts composés interactif.
 * Affiche un exemple parlant ; le tap ouvre la fiche complète (sliders, profil).
 */
export function SimulatorTeaser() {
  const [open, setOpen] = useState(false)
  return (
    <section className="rise" style={{ animationDelay: '160ms' }}>
      <button className="card card-pad sim-teaser" onClick={() => { haptic('tap'); setOpen(true) }}>
        <span className="sim-teaser-icon"><LineChart size={20} /></span>
        <div className="sim-teaser-main">
          <span className="sim-teaser-title">Et si tu investissais ?</span>
          <span className="sim-teaser-sub">
            150&nbsp;€/mois pendant 20&nbsp;ans à 6&nbsp;% ≈ <strong>69&nbsp;000&nbsp;€</strong>
          </span>
        </div>
        <ChevronRight size={18} className="sim-teaser-chevron" />
      </button>
      <SimulatorSheet open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
