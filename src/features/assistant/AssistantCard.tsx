import { useMemo, useState } from 'react'
import { Sparkles, ChevronRight } from 'lucide-react'
import type { Account, Budget, Category, Goal, Subscription, Transaction } from '@/types'
import { haptic } from '@/lib/haptics'
import { buildAssistantContext } from './assistantContext'
import { AssistantSheet } from './AssistantSheet'

interface Props {
  accounts: Account[]
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  subscriptions: Subscription[]
  goals: Goal[]
}

/** Carte d'accès à l'assistant conversationnel sur l'accueil. */
export function AssistantCard(props: Props) {
  const [open, setOpen] = useState(false)
  const context = useMemo(() => buildAssistantContext(props), [props])

  if (props.accounts.length === 0) return null

  return (
    <>
      <button
        className="assistant-teaser rise"
        style={{ animationDelay: '120ms' }}
        onClick={() => { haptic('tap'); setOpen(true) }}
      >
        <span className="assistant-teaser-icon"><Sparkles size={22} /></span>
        <span className="assistant-teaser-main">
          <span className="assistant-teaser-title">Demander à ton budget</span>
          <span className="assistant-teaser-sub">Pose une question sur ton argent</span>
        </span>
        <ChevronRight size={20} />
      </button>
      <AssistantSheet open={open} onClose={() => setOpen(false)} context={context} />
    </>
  )
}
