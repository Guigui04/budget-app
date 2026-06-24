import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Charges fixes masquées manuellement dans la prévision (faux positifs :
 * dette terminée, dépense mal détectée…). Persisté localement par appareil.
 * La clé est la `key` (libellé normalisé) de la charge détectée.
 */
interface ForecastState {
  excludedChargeKeys: string[]
  toggleCharge: (key: string) => void
}

export const useForecastPrefs = create<ForecastState>()(
  persist(
    (set) => ({
      excludedChargeKeys: [],
      toggleCharge: (key) =>
        set((s) => ({
          excludedChargeKeys: s.excludedChargeKeys.includes(key)
            ? s.excludedChargeKeys.filter((k) => k !== key)
            : [...s.excludedChargeKeys, key],
        })),
    }),
    { name: 'foyer-forecast' },
  ),
)
