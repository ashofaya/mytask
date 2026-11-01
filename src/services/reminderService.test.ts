import { beforeEach, describe, expect, it, vi } from 'vitest'
import { claimDueReminder, listDueReminders } from './reminderService'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  supabase: { from: mocks.from, rpc: mocks.rpc },
}))

describe('reminder service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads due reminders and joins titles without bypassing RLS', async () => {
    const reminderQuery = {
      select: vi.fn(),
      is: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
    }
    reminderQuery.select.mockReturnValue(reminderQuery)
    reminderQuery.is.mockReturnValue(reminderQuery)
    reminderQuery.lte.mockReturnValue(reminderQuery)
    reminderQuery.order.mockResolvedValue({
      data: [{ id: 'reminder-1', task_id: 'task-1', remind_at: '2026-11-01T04:00:00Z' }],
      error: null,
    })
    const taskQuery = { select: vi.fn(), in: vi.fn() }
    taskQuery.select.mockReturnValue(taskQuery)
    taskQuery.in.mockResolvedValue({ data: [{ id: 'task-1', title: 'Pay bill' }], error: null })
    mocks.from.mockImplementation((table: string) =>
      table === 'reminders' ? reminderQuery : taskQuery,
    )

    await expect(listDueReminders(new Date('2026-11-01T05:00:00Z'))).resolves.toEqual([
      {
        id: 'reminder-1',
        task_id: 'task-1',
        remind_at: '2026-11-01T04:00:00Z',
        title: 'Pay bill',
      },
    ])
    expect(reminderQuery.is).toHaveBeenCalledWith('delivered_at', null)
    expect(reminderQuery.lte).toHaveBeenCalledWith('remind_at', '2026-11-01T05:00:00.000Z')
    expect(taskQuery.in).toHaveBeenCalledWith('id', ['task-1'])
  })

  it('skips reminders whose task was deleted while the due list was loaded', async () => {
    const reminderQuery = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'reminder-1', task_id: 'gone', remind_at: '2026-11-01T04:00:00Z' }],
        error: null,
      }),
    }
    const taskQuery = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) }
    mocks.from.mockImplementation((table: string) =>
      table === 'reminders' ? reminderQuery : taskQuery,
    )
    await expect(listDueReminders()).resolves.toEqual([])
  })

  it('claims reminders through the atomic database RPC and reports failures', async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    await expect(claimDueReminder('reminder-1')).resolves.toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith('claim_due_reminder', {
      p_reminder_id: 'reminder-1',
    })
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('RPC failed') })
    await expect(claimDueReminder('reminder-1')).rejects.toThrow('RPC failed')
  })
})
