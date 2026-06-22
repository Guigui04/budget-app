import { useMemo } from 'react'
import { Repeat, Check, X, CalendarClock } from 'lucide-react'
import { useCategories, useSubscriptions, useUpdateSubscription } from '@/data/hooks'
import { activeSubscriptionsMonthlyCost } from '@/data/selectors'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatMoney, formatMoneyCompact, formatDateShort, daysUntil } from '@/lib/format'

const freqLabel: Record<string, string> = { monthly: '/mois', yearly: '/an', weekly: '/sem.' }

export function SubscriptionsPage() {
  const { data: subscriptions = [] } = useSubscriptions()
  const { data: categories = [] } = useCategories()
  const update = useUpdateSubscription()

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const monthlyCost = activeSubscriptionsMonthlyCost(subscriptions)
  const yearlyCost = monthlyCost * 12

  const confirmed = subscriptions.filter((s) => s.isConfirmed)
  const pending = subscriptions.filter((s) => !s.isConfirmed)

  return (
    <div className="page">
      <section className="card card-pad rise subs-summary">
        <span className="section-label">Coût mensuel des abonnements</span>
        <div className="subs-summary-amount num">{formatMoney(monthlyCost)}<small>/mois</small></div>
        <p className="subs-summary-hint num">soit {formatMoneyCompact(yearlyCost)} par an · {confirmed.filter((s) => s.isActive).length} actifs</p>
      </section>

      {pending.length > 0 && (
        <section className="rise" style={{ animationDelay: '60ms' }}>
          <div className="row-head"><h2 className="block-title">À confirmer</h2></div>
          <div className="card stack-rows">
            {pending.map((s) => {
              const cat = s.categoryId ? catMap.get(s.categoryId) : undefined
              return (
                <div key={s.id} className="sub-row pending">
                  <CategoryIcon icon={cat?.icon ?? 'repeat'} color={cat?.color ?? '#ef6f9c'} size={42} />
                  <div className="sub-main">
                    <span className="sub-name">{s.merchantLabel}</span>
                    <span className="sub-meta num">{formatMoney(s.amount)}{freqLabel[s.frequency]} · détecté</span>
                  </div>
                  <div className="sub-actions">
                    <button className="sub-act reject" onClick={() => update.mutate({ id: s.id, isActive: false, isConfirmed: true })} aria-label="Rejeter"><X size={18} /></button>
                    <button className="sub-act confirm" onClick={() => update.mutate({ id: s.id, isConfirmed: true })} aria-label="Confirmer"><Check size={18} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="rise" style={{ animationDelay: '100ms' }}>
        <div className="row-head"><h2 className="block-title">Abonnements actifs</h2></div>
        {confirmed.length === 0 ? (
          <EmptyState icon={Repeat} title="Aucun abonnement" hint="Les paiements récurrents détectés apparaîtront ici." />
        ) : (
          <div className="card stack-rows">
            {confirmed.map((s) => {
              const cat = s.categoryId ? catMap.get(s.categoryId) : undefined
              const days = daysUntil(s.nextExpectedDate)
              return (
                <div key={s.id} className={`sub-row ${s.isActive ? '' : 'inactive'}`}>
                  <CategoryIcon icon={cat?.icon ?? 'repeat'} color={cat?.color ?? '#ef6f9c'} size={42} />
                  <div className="sub-main">
                    <span className="sub-name">{s.merchantLabel}</span>
                    <span className="sub-meta">
                      <CalendarClock size={13} />
                      {s.isActive ? `${formatDateShort(s.nextExpectedDate)}${days >= 0 ? ` · dans ${days} j` : ''}` : 'mis en pause'}
                    </span>
                  </div>
                  <div className="sub-right">
                    <span className="sub-amount num">{formatMoney(s.amount)}<small>{freqLabel[s.frequency]}</small></span>
                    <button className={`toggle ${s.isActive ? 'on' : ''}`} onClick={() => update.mutate({ id: s.id, isActive: !s.isActive })} aria-label="Activer/désactiver">
                      <span className="toggle-knob" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
