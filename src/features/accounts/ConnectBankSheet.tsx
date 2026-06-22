import { useState } from 'react'
import { Landmark, ShieldCheck, ChevronRight, Lock } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { startBankAuth, supportedBanks } from '@/lib/bank/client'

interface Props {
  open: boolean
  onClose: () => void
}

export function ConnectBankSheet({ open, onClose }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [demoMsg, setDemoMsg] = useState(false)

  async function connect(id: string) {
    setBusy(id)
    setDemoMsg(false)
    const res = await startBankAuth(id)
    setBusy(null)
    if (res.redirectUrl) {
      window.location.assign(res.redirectUrl)
    } else if (res.demo) {
      setDemoMsg(true)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Connecter une banque">
      <div className="consent-note">
        <ShieldCheck size={18} />
        <p>
          Lecture seule (DSP2). Vous serez redirigé vers votre banque pour valider l’accès.
          Aucune donnée d’identification ne transite par l’app.
        </p>
      </div>

      <div className="bank-pick-list">
        {supportedBanks.map((b) => (
          <button key={b.id} className="bank-pick" onClick={() => connect(b.id)} disabled={busy === b.id}>
            <span className="bank-logo"><Landmark size={18} /></span>
            <span className="bank-pick-name">{b.name}</span>
            {busy === b.id ? <span className="bank-pick-loading">…</span> : <ChevronRight size={18} />}
          </button>
        ))}
      </div>

      {demoMsg && (
        <p className="consent-demo">
          <Lock size={14} /> Mode démo : le flux de consentement réel nécessite l’Edge Function
          <code>bank-auth-start</code> et vos clés Enable Banking côté serveur.
        </p>
      )}
    </Sheet>
  )
}
