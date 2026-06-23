/**
 * Fond « Aurora » — halos de lumière colorés qui dérivent lentement derrière
 * toute l'app (mesh gradient animé). Rendu une seule fois, plein écran, fixé
 * derrière le contenu. Animé uniquement via transform/opacity (GPU friendly) ;
 * figé si l'utilisateur demande moins de mouvement (règle globale reduced-motion).
 */
export function Aurora() {
  return (
    <div className="aurora" aria-hidden="true">
      <span className="aurora-blob aurora-blob-1" />
      <span className="aurora-blob aurora-blob-2" />
      <span className="aurora-blob aurora-blob-3" />
      <span className="aurora-blob aurora-blob-4" />
      <span className="aurora-grain" />
    </div>
  )
}
