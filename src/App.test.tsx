import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('application scaffold', () => {
  it('requires authentication before displaying the private home page', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Masuk ke MyTask' })).toBeInTheDocument()
  })
})
