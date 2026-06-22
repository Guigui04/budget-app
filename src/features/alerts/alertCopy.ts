import { formatMoney, formatPercent } from '@/lib/format'
import type { Alert, AlertType } from '@/types'

interface AlertCopy {
  title: string
  description: string
  color: string
}

const colors: Record<AlertType, string> = {
  budget_exceeded: 'var(--negative)',
  budget_warning: 'var(--amber)',
  large_transaction: 'var(--info)',
  new_subscription: 'var(--accent)',
  consent_expiring: 'var(--amber)',
  sync_error: 'var(--negative)',
}

export function alertCopy(alert: Alert): AlertCopy {
  const p = alert.payload
  const color = colors[alert.type]
  const category = typeof p.category === 'string' ? p.category : 'Cette catégorie'
  const merchant = typeof p.merchant === 'string' ? p.merchant : 'Cette dépense'
  const bank = typeof p.bank === 'string' ? p.bank : 'Une banque'
  const ratio = typeof p.ratio === 'number' ? p.ratio : undefined
  const amount = typeof p.amount === 'number' ? p.amount : 0
  const days = typeof p.days === 'number' ? p.days : 0

  switch (alert.type) {
    case 'budget_exceeded':
      return { title: 'Budget dépassé', description: `${category} est à ${formatPercent(ratio ?? 1)} de l'enveloppe.`, color }
    case 'budget_warning':
      return { title: 'Budget bientôt atteint', description: `${category} est à ${formatPercent(ratio ?? 0.8)} de l'enveloppe.`, color }
    case 'large_transaction':
      return { title: 'Grosse dépense', description: `${merchant} · ${formatMoney(Math.abs(amount))} inhabituel.`, color }
    case 'new_subscription':
      return { title: 'Nouvel abonnement détecté', description: `${merchant} · ${formatMoney(Math.abs(amount))}. À confirmer.`, color }
    case 'consent_expiring':
      return { title: 'Connexion bancaire à renouveler', description: `${bank} expire dans ${days} jours.`, color }
    case 'sync_error':
      return { title: 'Échec de synchronisation', description: `${bank} n'a pas pu être synchronisée.`, color }
    default:
      return { title: 'Notification', description: '', color }
  }
}
