interface ProgressBarProps {
  ratio: number
  color?: string
  /** When true, colour shifts to amber/negative as the ratio approaches/exceeds 1. */
  semantic?: boolean
}

function semanticColor(ratio: number): string {
  if (ratio >= 1) return 'var(--negative)'
  if (ratio >= 0.8) return 'var(--amber)'
  return 'var(--positive)'
}

export function ProgressBar({ ratio, color, semantic = false }: ProgressBarProps) {
  const width = Math.min(Math.max(ratio, 0), 1) * 100
  const fill = semantic ? semanticColor(ratio) : color ?? 'var(--accent)'
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(ratio * 100)}>
      <div className="progress-fill" style={{ width: `${width}%`, background: fill }} />
    </div>
  )
}
