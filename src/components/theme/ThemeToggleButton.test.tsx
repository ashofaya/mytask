import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeProvider'
import { ThemeToggleButton } from './ThemeToggleButton'

describe('ThemeToggleButton', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('toggles and persists the selected theme', () => {
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan tema gelap' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('mytask:theme')).toBe('dark')

    fireEvent.click(screen.getByRole('button', { name: 'Aktifkan tema terang' }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('mytask:theme')).toBe('light')
  })
})
