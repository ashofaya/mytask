import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecurringPage } from './RecurringPage'

const mocks = vi.hoisted(() => ({
  useTaskData: vi.fn(),
  createRecurringRule: vi.fn(),
  generateNextOccurrence: vi.fn(),
  listRecurringRules: vi.fn(),
  setRecurringRuleActive: vi.fn(),
  softDeleteRecurringRule: vi.fn(),
  updateRecurringRule: vi.fn(),
}))
vi.mock('../hooks/useTaskData', () => ({ useTaskData: mocks.useTaskData }))
vi.mock('../services/recurringService', () => ({
  createRecurringRule: mocks.createRecurringRule,
  generateNextOccurrence: mocks.generateNextOccurrence,
  listRecurringRules: mocks.listRecurringRules,
  setRecurringRuleActive: mocks.setRecurringRuleActive,
  softDeleteRecurringRule: mocks.softDeleteRecurringRule,
  updateRecurringRule: mocks.updateRecurringRule,
}))

describe('RecurringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useTaskData.mockReturnValue({
      tasks: [],
      categories: [],
      loading: false,
      error: null,
      reload: vi.fn(),
    })
    mocks.listRecurringRules.mockResolvedValue([])
    mocks.generateNextOccurrence.mockResolvedValue(null)
    mocks.createRecurringRule.mockResolvedValue({
      id: 'rule-1',
      is_active: true,
    })
  })

  it('validates and saves a recurring rule, then requests the idempotent generator', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><RecurringPage /></MemoryRouter>)

    await user.type(await screen.findByLabelText('Judul tugas'), 'Water plants')
    await user.selectOptions(screen.getByLabelText('Frekuensi'), 'weekly')
    fireEvent.change(screen.getByLabelText('Tanggal mulai'), {
      target: { value: '2026-11-02' },
    })
    await user.click(screen.getByRole('button', { name: 'Buat aturan' }))

    await waitFor(() => {
      expect(mocks.createRecurringRule).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Water plants',
          frequency: 'weekly',
          start_date: '2026-11-02',
        }),
      )
      expect(mocks.generateNextOccurrence).toHaveBeenCalledWith('rule-1')
    })
    expect(await screen.findByText('Aturan berulang berhasil dibuat.')).toBeInTheDocument()
  })
})
