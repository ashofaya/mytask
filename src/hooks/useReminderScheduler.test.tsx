import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReminderScheduler } from './useReminderScheduler'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  listDueReminders: vi.fn(),
  claimDueReminder: vi.fn(),
}))
vi.mock('./useAuth', () => ({ useAuth: mocks.useAuth }))
vi.mock('../services/reminderService', () => ({
  listDueReminders: mocks.listDueReminders,
  claimDueReminder: mocks.claimDueReminder,
}))

describe('useReminderScheduler', () => {
  const notifications: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    notifications.length = 0
    mocks.useAuth.mockReturnValue({
      profile: { notifications_enabled: true },
    })
    mocks.listDueReminders.mockResolvedValue([
      { id: 'reminder-1', task_id: 'task-1', remind_at: '2026-11-01T04:00:00Z', title: 'Pay bill' },
    ])
    class TestNotification {
      static permission: NotificationPermission = 'granted'
      static requestPermission = vi.fn().mockResolvedValue('granted')

      constructor(title: string) {
        notifications.push(title)
      }
    }
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: TestNotification,
    })
  })

  afterEach(() => {
    delete (window as Window & { Notification?: typeof Notification }).Notification
  })

  it('creates notifications only when the atomic claim succeeds', async () => {
    mocks.claimDueReminder.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const { unmount } = renderHook(() => useReminderScheduler())

    await waitFor(() => expect(mocks.listDueReminders).toHaveBeenCalled())
    expect(mocks.claimDueReminder).toHaveBeenCalledWith('reminder-1')
    expect(notifications).toEqual([])

    unmount()
    mocks.listDueReminders.mockClear()
    const second = renderHook(() => useReminderScheduler())
    await waitFor(() => expect(notifications).toEqual(['Pay bill']))
    second.unmount()
  })
})
