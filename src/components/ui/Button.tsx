import type { ButtonHTMLAttributes, ReactNode, PointerEvent } from 'react'
import clsx from 'clsx'
import { haptic as fireHaptic, type HapticKind } from '@/lib/haptics'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'quiet'
  block?: boolean
  size?: 'md' | 'sm'
  /** Retour haptique au press. `false` pour le couper. Défaut : 'tap'. */
  haptic?: HapticKind | false
  children: ReactNode
}

export function Button({
  variant = 'primary',
  block = false,
  size = 'md',
  haptic = 'tap',
  className,
  onPointerDown,
  children,
  ...rest
}: ButtonProps) {
  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (haptic && !rest.disabled) fireHaptic(haptic)
    onPointerDown?.(e)
  }
  return (
    <button
      className={clsx(
        'btn',
        `btn-${variant}`,
        block && 'btn-block',
        size === 'sm' && 'btn-sm',
        className,
      )}
      onPointerDown={handlePointerDown}
      {...rest}
    >
      {children}
    </button>
  )
}
