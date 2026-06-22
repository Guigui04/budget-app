/**
 * Point d'entrée i18n. FR par défaut.
 *
 * Usage en composant :
 *   const t = useT()
 *   <span>{t.nav.home}</span>
 *
 * Hors composant (ex. constantes) : importer `t` directement.
 *
 * Interpolation : `interpolate('Bonjour {name}', { name })`.
 */
import { fr, type Dictionary } from './fr'

// Une seule langue active pour l'instant ; brancher ici un store de locale
// (ex. prefs) le jour où une 2ᵉ langue est ajoutée.
export const t: Dictionary = fr

/** Remplace les marqueurs `{clé}` par les valeurs fournies. */
export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  )
}

/** Hook React : renvoie le dictionnaire actif. */
export function useT(): Dictionary {
  return t
}
