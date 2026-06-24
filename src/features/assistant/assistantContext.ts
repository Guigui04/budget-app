/** Construit un résumé financier compact (texte) pour l'assistant. Déterministe. */
import type { Account, Budget, Category, Goal, Subscription, Transaction } from '@/types'
import {
  activeSubscriptionsMonthlyCost,
  buildEnvelopes,
  categoryBreakdown,
  isInMonth,
  monthForecast,
  monthIncome,
  monthSpending,
  monthlyEvolution,
  totalBalance,
} from '@/data/selectors'
import { buildWrapped } from '@/features/wrapped/wrappedData'

interface ContextInput {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  subscriptions: Subscription[]
  goals: Goal[]
}

const eur = (n: number) => `${Math.round(n)} €`

export function buildAssistantContext(input: ContextInput): string {
  const { accounts, transactions, categories, budgets, subscriptions, goals } = input
  const now = new Date()
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const lines: string[] = []

  // Soldes
  lines.push(`Solde total : ${eur(totalBalance(accounts))}`)
  for (const a of accounts) lines.push(`  - ${a.name} : ${eur(a.balance)}`)

  // Mois en cours
  const income = monthIncome(transactions)
  const spending = monthSpending(transactions)
  lines.push(`\nMois en cours (${monthLabel}) : revenus ${eur(income)}, dépenses ${eur(spending)}, net ${eur(income - spending)}`)

  // Dépenses par catégorie (mois)
  const breakdown = categoryBreakdown(transactions, categories).slice(0, 8)
  if (breakdown.length) {
    lines.push('Dépenses par catégorie ce mois :')
    for (const s of breakdown) lines.push(`  - ${s.category.name} : ${eur(s.amount)} (${Math.round(s.ratio * 100)} %)`)
  }

  // Budgets
  const envelopes = buildEnvelopes(budgets, categories, transactions)
  if (envelopes.length) {
    lines.push('Budgets :')
    for (const e of envelopes) {
      lines.push(`  - ${e.category.name} : ${eur(e.spent)} / ${eur(e.budget.amount)} (${Math.round(e.ratio * 100)} %)`)
    }
  }

  // Prévision de fin de mois
  const f = monthForecast(accounts, transactions)
  lines.push('\nPrévision de fin de mois :')
  lines.push(`  - solde projeté en fin de mois : ${eur(f.endBalance)}`)
  lines.push(`  - revenus encore à venir : ${eur(f.upcomingIncome)}`)
  lines.push(`  - charges fixes encore à venir : ${eur(f.upcomingFixed)}`)
  lines.push(`  - dépenses variables estimées d'ici la fin du mois : ${eur(f.variableProjected)} (~${eur(f.dailyBurn)}/jour)`)
  if (f.lowestPoint.balance < 0) lines.push(`  - ALERTE : risque de découvert ce mois-ci (point bas ${eur(f.lowestPoint.balance)})`)
  if (f.fixedItems.filter((i) => !i.excluded).length) {
    lines.push('  - prochaines charges fixes :')
    for (const it of f.fixedItems.filter((i) => !i.excluded)) lines.push(`      • ${it.label} : ${eur(it.amount)}`)
  }

  // Abonnements
  const activeSubs = subscriptions.filter((s) => s.isActive && s.isConfirmed)
  if (activeSubs.length) {
    lines.push(`\nAbonnements actifs (${eur(activeSubscriptionsMonthlyCost(subscriptions))}/mois) :`)
    for (const s of activeSubs) lines.push(`  - ${s.merchantLabel} : ${eur(s.amount)} (${s.frequency})`)
  }

  // Plus grosses dépenses du mois (avec marchands)
  const topExpenses = transactions
    .filter((t) => t.amount < 0 && isInMonth(t.bookingDate))
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 6)
  if (topExpenses.length) {
    lines.push('Plus grosses dépenses ce mois :')
    for (const t of topExpenses) lines.push(`  - ${t.cleanLabel || t.rawLabel} : ${eur(Math.abs(t.amount))} (${t.bookingDate.slice(0, 10)})`)
  }

  // Marchands les plus fréquents (année en cours) — pour « où / chez qui je vais le plus souvent »
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const transferRe = /\b(emis|virement|vir)\b/i
  const freq = new Map<string, { count: number; total: number }>()
  for (const t of transactions) {
    if (t.amount >= 0) continue
    if (new Date(t.bookingDate) < yearStart) continue
    const label = (t.cleanLabel || t.rawLabel).trim()
    if (!label || transferRe.test(label.toLowerCase())) continue
    const cur = freq.get(label) ?? { count: 0, total: 0 }
    cur.count += 1
    cur.total += Math.abs(t.amount)
    freq.set(label, cur)
  }
  const topFreq = [...freq.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, 10)
  if (topFreq.length) {
    lines.push('Marchands les plus fréquents cette année (nombre de paiements) :')
    for (const m of topFreq) lines.push(`  - ${m.label} : ${m.count} fois, ${eur(m.total)} au total`)
  }

  // Sources d'argent reçu cette année (qui envoie de l'argent : salaires, proches, remboursements…)
  const incomeSrc = new Map<string, { count: number; total: number; label: string }>()
  for (const t of transactions) {
    if (t.amount <= 0) continue
    if (new Date(t.bookingDate) < yearStart) continue
    const raw = (t.cleanLabel || t.rawLabel).trim()
    if (!raw) continue
    const key = raw.toLowerCase().replace(/\d+/g, ' ').replace(/[^a-zà-ÿ\s]/gi, ' ').replace(/\s+/g, ' ').trim() || raw
    const cur = incomeSrc.get(key) ?? { count: 0, total: 0, label: raw.slice(0, 44) }
    cur.count += 1
    cur.total += t.amount
    incomeSrc.set(key, cur)
  }
  const topSrc = [...incomeSrc.values()].sort((a, b) => b.total - a.total).slice(0, 8)
  if (topSrc.length) {
    lines.push("Sources d'argent reçu cette année (qui t'envoie de l'argent) :")
    for (const s of topSrc) lines.push(`  - ${s.label} : ${eur(s.total)} (${s.count} fois)`)
  }

  // Tendance 6 mois
  const evolution = monthlyEvolution(transactions, 6)
  lines.push('Dépenses des 6 derniers mois : ' + evolution.map((m) => `${m.label} ${eur(m.spending)}`).join(', '))

  // Objectifs
  if (goals.length) {
    lines.push('Objectifs d\'épargne :')
    for (const g of goals) lines.push(`  - ${g.name} : ${eur(g.currentAmount)} / ${eur(g.targetAmount)}`)
  }

  // Bilan de l'année
  const w = buildWrapped(transactions, categories, now.getFullYear())
  lines.push(`\nDepuis le 1er janvier : ${eur(w.totalSpent)} dépensés sur ${w.txnCount} achats` + (w.topCategory ? `, top poste « ${w.topCategory.category?.name} »` : ''))

  return lines.join('\n')
}
