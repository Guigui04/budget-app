import { Zap, RefreshCw, Percent, Layers } from 'lucide-react'

/**
 * Vue « Automatismes » (épargne automatique). Placeholder soigné en itération 1 ;
 * le moteur de règles (arrondis, balayage du surplus, % du revenu) arrive en
 * itération 3.
 */
export function AutomationsView() {
  const ideas = [
    { icon: RefreshCw, title: 'Arrondir mes achats', desc: 'Chaque paiement arrondi à l’euro supérieur, mis de côté.' },
    { icon: Zap, title: 'Balayer le surplus', desc: 'Le surplus prévu en fin de mois part vers un objectif.' },
    { icon: Percent, title: '% de mes revenus', desc: 'Une part de chaque salaire automatiquement épargnée.' },
    { icon: Layers, title: 'Déclencheur par catégorie', desc: 'Ex. chaque resto → 3 € de côté.' },
  ]

  return (
    <>
      <div className="auto-hero rise">
        <span className="auto-hero-icon"><Zap size={22} /></span>
        <h2 className="auto-hero-title">Épargne automatique</h2>
        <p className="auto-hero-sub">Mets de l’argent de côté sans y penser. Bientôt disponible.</p>
      </div>
      <div className="auto-ideas">
        {ideas.map((it, i) => (
          <div key={it.title} className="card card-pad auto-idea rise" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="auto-idea-icon"><it.icon size={18} /></span>
            <div>
              <span className="auto-idea-title">{it.title}</span>
              <span className="auto-idea-desc">{it.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
