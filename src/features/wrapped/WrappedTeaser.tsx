import { useMemo, useState } from 'react'
import { Sparkles, ChevronRight } from 'lucide-react'
import type { Category, Transaction } from '@/types'
import { haptic } from '@/lib/haptics'
import { buildWrapped } from './wrappedData'
import { WrappedStory } from './WrappedStory'

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

/** Carte d'accès au bilan annuel sur l'accueil. Masquée si trop peu d'historique. */
export function WrappedTeaser({ transactions, categories }: Props) {
  const [open, setOpen] = useState(false)
  const year = new Date().getFullYear()
  const data = useMemo(() => buildWrapped(transactions, categories, year), [transactions, categories, year])

  if (!data.hasEnoughData) return null

  return (
    <>
      <button
        className="wrap-teaser rise"
        style={{ animationDelay: '110ms' }}
        onClick={() => { haptic('tap'); setOpen(true) }}
      >
        <span className="wrap-teaser-icon"><Sparkles size={22} /></span>
        <span className="wrap-teaser-main">
          <span className="wrap-teaser-title">Ton bilan {year} ✨</span>
          <span className="wrap-teaser-sub">Découvre ton année en argent</span>
        </span>
        <ChevronRight size={20} />
      </button>
      {open && <WrappedStory data={data} onClose={() => setOpen(false)} />}
    </>
  )
}
