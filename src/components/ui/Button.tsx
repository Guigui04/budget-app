import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'quiet'
  block?: boolean
  size?: 'md' | 'sm'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  block = false,
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'btn',
        `btn-${variant}`,
        block && 'btn-block',
        size === 'sm' && 'btn-sm',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
