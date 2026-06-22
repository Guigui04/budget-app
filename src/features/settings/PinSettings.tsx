import { useState } from 'react'
import { Fingerprint, ChevronRight } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { useLock } from '@/store/lock'
import { isValidPin } from '@/lib/pin'

/** Gestion du verrou PIN local : activer, changer ou désactiver. */
export function PinSettings() {
  const enabled = useLock((s) => s.pinHash !== null)
  const setPin = useLock((s) => s.setPin)
  const disable = useLock((s) => s.disable)
  const verify = useLock((s) => s.verify)

  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [pin, setPin1] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setCurrent('')
    setPin1('')
    setConfirm('')
    setError(null)
  }

  function close() {
    setOpen(false)
    reset()
  }

  function digits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 8)
  }

  async function save() {
    setError(null)
    if (enabled) {
      const ok = await verify(current)
      if (!ok) {
        setError('Code actuel incorrect.')
        return
      }
    }
    if (!isValidPin(pin)) {
      setError('Le code doit comporter 4 à 8 chiffres.')
      return
    }
    if (pin !== confirm) {
      setError('Les deux codes ne correspondent pas.')
      return
    }
    setBusy(true)
    await setPin(pin)
    setBusy(false)
    close()
  }

  async function turnOff() {
    setError(null)
    const ok = await verify(current)
    if (!ok) {
      setError('Code actuel incorrect.')
      return
    }
    disable()
    close()
  }

  return (
    <>
      <button className="settings-row" onClick={() => setOpen(true)}>
        <Fingerprint size={18} />
        <span className="settings-row-label">Verrouillage par code</span>
        <span className="pill">{enabled ? 'Activé' : 'Désactivé'}</span>
        <ChevronRight size={18} />
      </button>

      <Sheet open={open} onClose={close} title={enabled ? 'Modifier le code' : 'Définir un code'}>
        <div className="pin-settings">
          {enabled && (
            <div className="field">
              <label htmlFor="pin-current">Code actuel</label>
              <input
                id="pin-current"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                className="input pin-input"
                placeholder="••••"
                value={current}
                onChange={(e) => setCurrent(digits(e.target.value))}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="pin-new">Nouveau code</label>
            <input
              id="pin-new"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className="input pin-input"
              placeholder="4 à 8 chiffres"
              value={pin}
              onChange={(e) => setPin1(digits(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="pin-confirm">Confirmer le code</label>
            <input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              className="input pin-input"
              placeholder="••••"
              value={confirm}
              onChange={(e) => setConfirm(digits(e.target.value))}
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <Button block onClick={save} disabled={busy}>
            {busy ? 'Enregistrement…' : enabled ? 'Modifier le code' : 'Activer le verrou'}
          </Button>
          {enabled && (
            <Button variant="ghost" block onClick={turnOff} disabled={busy}>
              Désactiver le verrou
            </Button>
          )}
        </div>
      </Sheet>
    </>
  )
}
