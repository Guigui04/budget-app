/**
 * Retour haptique — fine couche au-dessus de l'API Web Vibration.
 *
 * Le support varie : Android/Chrome déclenche `navigator.vibrate`, iOS Safari
 * l'ignore silencieusement (aucune erreur). On reste donc « progressive
 * enhancement » : si ça marche tant mieux, sinon l'UI fonctionne quand même.
 *
 * Un interrupteur global (persisté) permet à l'utilisateur de couper le retour
 * haptique depuis les réglages.
 */

export type HapticKind =
  | 'tap' // pression légère sur un bouton / onglet
  | 'selection' // changement de sélection (segmented, toggle)
  | 'success' // action confirmée
  | 'warning' // attention / valeur limite
  | 'error' // échec
  | 'heavy' // action importante (FAB, validation finale)

// Motifs en millisecondes (nombre = vibration unique, tableau = motif on/off).
const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  selection: 5,
  success: [0, 14, 40, 22],
  warning: [0, 18, 50, 18],
  error: [0, 26, 50, 26, 50, 26],
  heavy: 18,
}

const STORAGE_KEY = 'foyer.haptics'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

function enabled(): boolean {
  if (typeof window === 'undefined') return false
  if (prefersReducedMotion()) return false
  return window.localStorage?.getItem(STORAGE_KEY) !== 'off'
}

/** Active ou coupe globalement le retour haptique (persisté). */
export function setHapticsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* stockage indisponible (mode privé) : on ignore */
  }
}

export function areHapticsEnabled(): boolean {
  return enabled()
}

/** Déclenche un retour haptique. No-op si non supporté ou désactivé. */
export function haptic(kind: HapticKind = 'tap'): void {
  if (!enabled()) return
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (!nav || typeof nav.vibrate !== 'function') return
  try {
    nav.vibrate(PATTERNS[kind])
  } catch {
    /* certains navigateurs lèvent si l'onglet n'a jamais eu d'interaction */
  }
}
