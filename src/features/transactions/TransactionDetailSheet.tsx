import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { CategoryIcon } from '@/components/ui/CategoryIcon'
import { useCategorizeTransaction, useCreateRule } from '@/data/hooks'
import { formatSigned, formatDate } from '@/lib/format'
import type { Category, Transaction } from '@/types'

interface Props {
  txn: Transaction | null
  categories: Category[]
  onClose: () => void
}

export function TransactionDetailSheet({ txn, categories, onClose }: Props) {
  const categorize = useCategorizeTransaction()
  const createRule = useCreateRule()
  if (!txn) return null

  const current = categories.find((c) => c.id === txn.categoryId)

  return (
    <Sheet open={!!txn} onClose={onClose} title="Transaction">
      <div className="detail-head">
        <CategoryIcon icon={current?.icon ?? 'circle-dashed'} color={current?.color ?? '#a89e8c'} size={52} />
        <div>
          <div className="detail-label">{txn.cleanLabel}</div>
          <div className="detail-meta">{formatDate(txn.bookingDate)}</div>
        </div>
        <div className={`detail-amount amount ${txn.amount > 0 ? 'amount-pos' : ''}`}>{formatSigned(txn.amount, txn.currency)}</div>
      </div>

      <div className="detail-raw">
        <span className="section-label">Libellé brut</span>
        <p>{txn.rawLabel}</p>
      </div>

      <span className="section-label" style={{ display: 'block', marginBottom: 10 }}>Catégorie</span>
      <div className="cat-grid">
        {categories.map((c) => (
          <button
            key={c.id}
            className={`cat-pick ${c.id === txn.categoryId ? 'selected' : ''}`}
            onClick={() => categorize.mutate({ txnId: txn.id, categoryId: c.id })}
          >
            <CategoryIcon icon={c.icon} color={c.color} size={34} />
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {current && (
        <Button
          variant="ghost"
          block
          style={{ marginTop: 16 }}
          onClick={() => {
            createRule.mutate({ txn, categoryId: current.id })
            onClose()
          }}
        >
          Toujours classer « {txn.cleanLabel} » en {current.name}
        </Button>
      )}
    </Sheet>
  )
}
