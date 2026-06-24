import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useAccounts, useBudgets, useCategories, useGoals, useSubscriptions, useTransactions } from '@/data/hooks'
import { haptic } from '@/lib/haptics'
import { buildAssistantContext } from './assistantContext'
import { AssistantSheet } from './AssistantSheet'

/** Bouton flottant (bulle) à droite de la nav — accès à l'assistant sur toutes les pages. */
export function AssistantFab() {
  const [open, setOpen] = useState(false)
  const { data: accounts = [] } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: budgets = [] } = useBudgets()
  const { data: subscriptions = [] } = useSubscriptions()
  const { data: goals = [] } = useGoals()

  const context = useMemo(
    () => buildAssistantContext({ accounts, transactions, categories, budgets, subscriptions, goals }),
    [accounts, transactions, categories, budgets, subscriptions, goals],
  )

  return (
    <>
      <button
        className="assistant-fab"
        onClick={() => { haptic('tap'); setOpen(true) }}
        aria-label="Demander à ton budget"
      >
        <Sparkles size={24} />
      </button>
      <AssistantSheet open={open} onClose={() => setOpen(false)} context={context} />
    </>
  )
}
