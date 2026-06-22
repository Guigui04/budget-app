import { useState, type FormEvent } from 'react'
import { motion } from 'motion/react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useLock } from '@/store/lock'

/** Écran plein cadre demandant le PIN avant d'accéder à l'app. */
export function UnlockScreen() {
  const verify = useLock((s) => s.verify)
  const unlock = useLock((s) => s.unlock)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!pin) return
    setBusy(true)
    const ok = await verify(pin)
    setBusy(false)
    if (ok) {
      unlock()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="login">
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true"><Lock size={26} /></span>
          <h1 className="login-title">Foyer verrouillé</h1>
          <p className="login-tagline">Saisissez votre code pour continuer.</p>
        </div>

        <form onSubmit={onSubmit}>
          <motion.div
            className="field"
            animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <label htmlFor="pin">Code</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className="input pin-input"
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setError(false)
                setPin(e.target.value.replace(/\D/g, '').slice(0, 8))
              }}
              autoFocus
            />
          </motion.div>
          {error && <p className="login-error">Code incorrect.</p>}
          <Button type="submit" block disabled={busy || pin.length < 4}>
            {busy ? 'Vérification…' : 'Déverrouiller'}
          </Button>
        </form>
      </motion.div>

      <p className="login-foot">Verrou local · vos données restent protégées par votre compte</p>
    </div>
  )
}
