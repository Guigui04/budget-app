import { LineChart, Sparkles } from 'lucide-react'

/**
 * Accroche vers le simulateur d'intérêts composés (version interactive complète
 * livrée en itération 2). Affiche un exemple parlant pour donner envie.
 */
export function SimulatorTeaser() {
  return (
    <section className="rise" style={{ animationDelay: '160ms' }}>
      <div className="card card-pad sim-teaser">
        <span className="sim-teaser-icon"><LineChart size={20} /></span>
        <div className="sim-teaser-main">
          <span className="sim-teaser-title">Et si tu investissais ?</span>
          <span className="sim-teaser-sub">
            100&nbsp;€/mois pendant 20&nbsp;ans à 6&nbsp;% ≈ <strong>46&nbsp;000&nbsp;€</strong>
          </span>
        </div>
        <span className="sim-teaser-badge"><Sparkles size={12} /> Bientôt</span>
      </div>
    </section>
  )
}
