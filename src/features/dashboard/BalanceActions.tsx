import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { RefreshCw, CreditCard, Repeat } from 'lucide-react'
import { useManualSync } from '@/data/hooks'
import { haptic } from '@/lib/haptics'

/**
 * Rangée de 3 actions principales sous la carte solde (cf. Send/Receive/Swap
 * des inspirations) — adaptées à un agrégateur en lecture seule : actualiser
 * les données, voir les comptes, gérer les abonnements.
 */
export function BalanceActions() {
  const navigate = useNavigate()
  const sync = useManualSync()

  const actions: { key: string; label: string; icon: LucideIcon; onClick: () => void; busy?: boolean }[] = [
    {
      key: 'sync',
      label: sync.isPending ? 'Synchro…' : 'Actualiser',
      icon: RefreshCw,
      busy: sync.isPending,
      onClick: () => { haptic('success'); sync.mutate() },
    },
    { key: 'accounts', label: 'Comptes', icon: CreditCard, onClick: () => { haptic('tap'); navigate('/comptes') } },
    { key: 'subs', label: 'Abonnements', icon: Repeat, onClick: () => { haptic('tap'); navigate('/abonnements') } },
  ]

  return (
    <div className="hero-actions rise" style={{ animationDelay: '70ms' }}>
      {actions.map((a) => {
        const Icon = a.icon
        return (
          <button key={a.key} type="button" className="hero-action" onClick={a.onClick} disabled={a.busy}>
            <span className="hero-action-icon">
              <Icon size={20} className={a.busy ? 'spin' : undefined} />
            </span>
            <span className="hero-action-label">{a.label}</span>
          </button>
        )
      })}
    </div>
  )
}
