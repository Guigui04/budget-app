import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { formatSigned, formatDateShort } from '@/lib/format'
import type { Category, Transaction } from '@/types'

interface TransactionRowProps {
  txn: Transaction
  category?: Category
  onClick?: () => void
  showDate?: boolean
}

const fallback = { icon: 'circle-dashed', color: '#a89e8c', name: 'À classer' }

export function TransactionRow({ txn, category, onClick, showDate = true }: TransactionRowProps) {
  const cat = category ?? fallback
  const income = txn.amount > 0
  return (
    <button className="txn-row" onClick={onClick}>
      <CategoryIcon icon={cat.icon} color={cat.color} size={42} />
      <div className="txn-main">
        <span className="txn-label">{txn.cleanLabel}</span>
        <span className="txn-meta">
          {cat.name}
          {showDate && <> · {formatDateShort(txn.bookingDate)}</>}
          {txn.isRecurring && <> · récurrent</>}
        </span>
      </div>
      <span className={clsx('txn-amount amount', income ? 'amount-pos' : 'amount-neg')}>
        {formatSigned(txn.amount, txn.currency)}
      </span>
      {onClick && <ChevronRight size={16} className="txn-chevron" aria-hidden="true" />}
    </button>
  )
}
