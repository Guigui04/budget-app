import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Inbox } from 'lucide-react'
import { useAccounts, useCategories, useTransactions } from '@/data/hooks'
import { TransactionRow } from '@/components/TransactionRow'
import { TransactionDetailSheet } from './TransactionDetailSheet'
import { Segmented } from '@/components/ui/Segmented'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/format'
import type { Transaction } from '@/types'

type Filter = 'all' | 'expense' | 'income' | 'todo'

export function TransactionsPage() {
  const { data: transactions = [] } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [accountId, setAccountId] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  // On dérive l'opération sélectionnée de la liste à jour (et non d'une copie
  // figée) pour que la fiche reflète la catégorie dès qu'elle change.
  const selected = selectedId ? transactions.find((t) => t.id === selectedId) ?? null : null

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return transactions
      .filter((t) => {
        if (filter === 'expense' && t.amount >= 0) return false
        if (filter === 'income' && t.amount <= 0) return false
        if (filter === 'todo' && t.categoryId !== null) return false
        if (accountId !== 'all' && t.accountId !== accountId) return false
        if (needle && !t.cleanLabel.toLowerCase().includes(needle)) return false
        return true
      })
      .sort((a, b) => (a.bookingDate < b.bookingDate ? 1 : -1))
  }, [transactions, filter, search, accountId])

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const key = t.bookingDate
      map.set(key, [...(map.get(key) ?? []), t])
    }
    return [...map.entries()]
  }, [filtered])

  const todoCount = transactions.filter((t) => t.categoryId === null).length

  return (
    <div className="page">
      <div className="search-bar">
        <Search size={18} />
        <input
          placeholder="Rechercher un marchand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {accounts.length > 0 && (
          <select className="acct-select" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Compte">
            <option value="all">Tous</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="filter-row">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tout' },
            { value: 'expense', label: 'Dépenses' },
            { value: 'income', label: 'Revenus' },
            { value: 'todo', label: todoCount ? `À classer · ${todoCount}` : 'À classer' },
          ]}
        />
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={filter === 'todo' ? Inbox : SlidersHorizontal} title="Aucune opération" hint="Ajustez vos filtres pour voir plus de transactions." />
      ) : (
        groups.map(([date, items]) => (
          <section key={date} className="txn-group">
            <div className="txn-date">{formatDate(date)}</div>
            <div className="card">
              {items.map((t) => (
                <TransactionRow
                  key={t.id}
                  txn={t}
                  category={t.categoryId ? catMap.get(t.categoryId) : undefined}
                  showDate={false}
                  onClick={() => setSelectedId(t.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <TransactionDetailSheet txn={selected} categories={categories} onClose={() => setSelectedId(null)} />
    </div>
  )
}
