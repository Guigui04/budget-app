import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AlertType } from '@/types'

type AlertPrefKey = Exclude<AlertType, never>

interface PrefsState {
  alertPrefs: Record<AlertPrefKey, boolean>
  toggleAlert: (type: AlertPrefKey) => void
}

const defaults: Record<AlertPrefKey, boolean> = {
  budget_exceeded: true,
  budget_warning: true,
  large_transaction: true,
  new_subscription: true,
  consent_expiring: true,
  sync_error: true,
}

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      alertPrefs: defaults,
      toggleAlert: (type) =>
        set((s) => ({ alertPrefs: { ...s.alertPrefs, [type]: !s.alertPrefs[type] } })),
    }),
    { name: 'foyer-prefs' },
  ),
)
