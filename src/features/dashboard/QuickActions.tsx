import { useNavigate } from 'react-router-dom'
import { RefreshCw, Tags, Wallet, Target } from 'lucide-react'
import { useManualSync } from '@/data/hooks'

interface QuickActionsProps {
  todoCount: number
}

/**
 * Rangée d'actions rapides (style « Send / Receive » adapté à une app de suivi
 * en lecture seule) : synchroniser, classer, budgets, objectifs.
 */
export function QuickActions({ todoCount }: QuickActionsProps) {
  const navigate = useNavigate()
  const sync = useManualSync()

  return (
    <div className="quick-actions rise" style={{ animationDelay: '90ms' }}>
      <button
        className="qa"
        onClick={() => sync.mutate()}
        disabled={sync.isPending}
        aria-label="Synchroniser"
      >
        <span className="qa-icon">
          <RefreshCw size={20} className={sync.isPending ? 'spin' : undefined} />
        </span>
        <span className="qa-label">{sync.isPending ? 'Synchro…' : 'Actualiser'}</span>
      </button>

      <button className="qa" onClick={() => navigate('/operations')} aria-label="À classer">
        <span className="qa-icon">
          <Tags size={20} />
          {todoCount > 0 && <span className="qa-badge">{todoCount > 99 ? '99+' : todoCount}</span>}
        </span>
        <span className="qa-label">À classer</span>
      </button>

      <button className="qa" onClick={() => navigate('/budgets')} aria-label="Budgets">
        <span className="qa-icon"><Wallet size={20} /></span>
        <span className="qa-label">Budgets</span>
      </button>

      <button className="qa" onClick={() => navigate('/objectifs')} aria-label="Objectifs">
        <span className="qa-icon"><Target size={20} /></span>
        <span className="qa-label">Objectifs</span>
      </button>
    </div>
  )
}
