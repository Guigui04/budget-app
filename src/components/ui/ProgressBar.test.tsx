import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('expose le ratio via aria-valuenow', () => {
    render(<ProgressBar ratio={0.42} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42')
  })

  it('borne la largeur entre 0 et 100 %', () => {
    const { rerender } = render(<ProgressBar ratio={1.5} />)
    const fill = () => document.querySelector('.progress-fill') as HTMLElement
    expect(fill().style.width).toBe('100%')
    rerender(<ProgressBar ratio={-0.5} />)
    expect(fill().style.width).toBe('0%')
  })
})
