import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  hint?: string
}

export function EmptyState({ icon: Icon, title, hint }: EmptyStateProps) {
  return (
    <div className="empty">
      <Icon size={32} strokeWidth={1.5} />
      <p style={{ fontWeight: 600, color: 'var(--text)' }}>{title}</p>
      {hint && <p style={{ fontSize: '0.9rem', marginTop: 4 }}>{hint}</p>}
    </div>
  )
}
