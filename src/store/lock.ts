import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateSalt, hashPin, constantTimeEqual } from '@/lib/pin'

interface LockState {
  /** Hash PBKDF2 du PIN, ou null si le verrou est désactivé. */
  pinHash: string | null
  salt: string | null
  /** Verrouillé en mémoire (recalculé à chaque ouverture, jamais persisté). */
  locked: boolean
  setPin: (pin: string) => Promise<void>
  disable: () => void
  verify: (pin: string) => Promise<boolean>
  unlock: () => void
  lock: () => void
}

export const useLock = create<LockState>()(
  persist(
    (set, get) => ({
      pinHash: null,
      salt: null,
      locked: false,
      setPin: async (pin) => {
        const salt = generateSalt()
        const pinHash = await hashPin(pin, salt)
        set({ pinHash, salt, locked: false })
      },
      disable: () => set({ pinHash: null, salt: null, locked: false }),
      verify: async (pin) => {
        const { pinHash, salt } = get()
        if (!pinHash || !salt) return false
        const candidate = await hashPin(pin, salt)
        return constantTimeEqual(candidate, pinHash)
      },
      unlock: () => set({ locked: false }),
      lock: () => {
        if (get().pinHash) set({ locked: true })
      },
    }),
    {
      name: 'foyer-lock',
      // Ne persiste QUE le secret dérivé, jamais l'état `locked`.
      partialize: (s) => ({ pinHash: s.pinHash, salt: s.salt }),
      // À chaque rechargement : si un PIN existe, démarrer verrouillé.
      onRehydrateStorage: () => (state) => {
        if (state?.pinHash) useLock.setState({ locked: true })
      },
    },
  ),
)

export function isPinEnabled(): boolean {
  return useLock.getState().pinHash !== null
}

// Re-verrouille dès que l'app passe en arrière-plan (exigence « verrou à l'ouverture »).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') useLock.getState().lock()
  })
}
