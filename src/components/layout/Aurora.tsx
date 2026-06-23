/**
 * Fond « Aurora » — formes organiques colorées vues à travers une véritable surface
 * de verre. Le verre n'est pas qu'un flou : il réfracte (filtre SVG turbulence +
 * displacement → ondulations), reflète la lumière (traînées spéculaires qui balaient),
 * possède une tranche lumineuse (biseau) et un givre fin. Les formes ne bougent qu'en
 * `transform` (GPU) ; le verre les réfracte en une seule passe de filtre.
 * Mouvement figé si l'utilisateur demande moins d'animation (reduced-motion).
 */
export function Aurora() {
  return (
    <>
      {/* Définition du filtre « verre » (réfraction + givre), invisible. */}
      <svg className="aurora-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="auroraGlass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G" result="disp" />
            <feGaussianBlur in="disp" stdDeviation="5" />
          </filter>
        </defs>
      </svg>

      <div className="aurora" aria-hidden="true">
        {/* Lumière colorée derrière le verre (réfractée par le filtre). */}
        <div className="aurora-shapes">
          <span className="aurora-blob aurora-blob-1" />
          <span className="aurora-blob aurora-blob-2" />
          <span className="aurora-blob aurora-blob-3" />
          <span className="aurora-blob aurora-blob-4" />
          <span className="aurora-blob aurora-blob-5" />
        </div>

        {/* La surface de verre : reflets, tranche lumineuse, givre. */}
        <div className="aurora-glass">
          <span className="aurora-streak aurora-streak-1" />
          <span className="aurora-streak aurora-streak-2" />
          <span className="aurora-frost" />
        </div>
      </div>
    </>
  )
}
