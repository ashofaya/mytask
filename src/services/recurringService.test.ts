import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  generateNextOccurrence,
  listRecurringRules,
  softDeleteRecurringRule,
  updateRecurringRule,
} from './recurringService'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}))

describe('recurring service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists only non-deleted rules and surfaces database failures', async () => {
    const query = {
      select: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
    }
    query.select.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.order.mockResolvedValue({ data: [], error: null })
    mocks.from.mockReturnValue(query)

    await expect(listRecurringRules()).resolves.toEqual([])
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
    query.order.mockResolvedValueOnce({ data: null, error: new Error('offline') })
    await expect(listRecurringRules()).rejects.toThrow('offline')
  })

  it('invokes the transactional generator and returns its single occurrence', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        was_created: true,
        generated_task_id: 'task-1',
        generated_occurrence_date: '2026-11-01',
        generated_occurrence_key: 'rule-1_2026-11-01',
      }],
      error: null,
    })

    await expect(generateNextOccurrence('rule-1')).resolves.toMatchObject({
      was_created: true,
      generated_occurrence_key: 'rule-1_2026-11-01',
    })
    expect(mocks.rpc).toHaveBeenCalledWith(
      'generate_next_recurring_occurrence',
      { p_rule_id: 'rule-1' },
    )
  })

  it('soft-deletes rules and leaves existing task rows untouched', async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'rule-1' }, error: null }),
    }
    query.update.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.is.mockReturnValue(query)
    query.select.mockReturnValue(query)
    mocks.from.mockReturnValue(query)

    await expect(softDeleteRecurringRule('rule-1')).resolves.toBeUndefined()
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false, deleted_at: expect.any(String) }),
    )
    expect(mocks.from).toHaveBeenCalledWith('recurring_rules')
  })

  it('prevents changing frequency after the first occurrence has been generated', async () => {
    const currentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          next_occurrence_index: 1,
          frequency: 'weekly',
          start_date: '2026-11-01',
        },
        error: null,
      }),
    }
    const updateQuery = { update: vi.fn() }
    mocks.from.mockImplementation((table: string) =>
      table === 'recurring_rules' && mocks.from.mock.calls.length === 1
        ? currentQuery
        : updateQuery,
    )

    await expect(
      updateRecurringRule('rule-1', { frequency: 'monthly' }),
    ).rejects.toThrow('tidak dapat diubah setelah occurrence pertama')
    expect(updateQuery.update).not.toHaveBeenCalled()
  })
})
