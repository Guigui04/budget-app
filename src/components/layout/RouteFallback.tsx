import { t } from '@/i18n'

/** Indicateur de chargement affiché pendant le chargement d'une route (code-splitting). */
export function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite" aria-busy="true">
      <span className="route-fallback__spinner" aria-hidden="true" />
      <span className="route-fallback__label">{t.common.loading}</span>
    </div>
  )
}
