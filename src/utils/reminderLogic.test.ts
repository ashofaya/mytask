import { describe, expect, it } from 'vitest'
import { getNotificationPermission, shouldPollReminders } from './reminderLogic'

describe('reminder permission logic', () => {
  it('distinguishes unsupported API and each permission state', () => {
    expect(getNotificationPermission()).toBe('unsupported')
    expect(getNotificationPermission({ permission: 'granted' })).toBe('granted')
    expect(getNotificationPermission({ permission: 'denied' })).toBe('denied')
    expect(getNotificationPermission({ permission: 'default' })).toBe('default')
  })

  it('polls only when profile preference is on and browser permission is granted', () => {
    expect(shouldPollReminders(true, 'granted')).toBe(true)
    expect(shouldPollReminders(false, 'granted')).toBe(false)
    expect(shouldPollReminders(true, 'denied')).toBe(false)
    expect(shouldPollReminders(true, 'unsupported')).toBe(false)
  })
})
