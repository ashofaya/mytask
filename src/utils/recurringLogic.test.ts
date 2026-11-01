import { describe, expect, it } from 'vitest'
import { getNextOccurrenceDate, getOccurrenceDate, getOccurrenceKey } from './recurringLogic'

describe('recurring date logic', () => {
  it('calculates daily and weekly dates without local timezone dependence', () => {
    expect(getOccurrenceDate('2026-11-01', 'daily', 3)).toBe('2026-11-04')
    expect(getOccurrenceDate('2026-11-01', 'weekly', 2)).toBe('2026-11-15')
  })

  it('clamps monthly occurrences to the last day without drifting the anchor day', () => {
    expect(getOccurrenceDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28')
    expect(getOccurrenceDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31')
    expect(getOccurrenceDate('2024-01-31', 'monthly', 1)).toBe('2024-02-29')
  })

  it('clamps leap-day yearly occurrences and includes the end date', () => {
    expect(getOccurrenceDate('2024-02-29', 'yearly', 1)).toBe('2025-02-28')
    expect(
      getNextOccurrenceDate(
        { start_date: '2026-11-01', end_date: '2026-11-08', frequency: 'weekly' },
        1,
      ),
    ).toBe('2026-11-08')
    expect(
      getNextOccurrenceDate(
        { start_date: '2026-11-01', end_date: '2026-11-07', frequency: 'weekly' },
        1,
      ),
    ).toBeNull()
  })

  it('rejects invalid indices and creates a stable key', () => {
    expect(getOccurrenceDate('2026-11-01', 'daily', -1)).toBeNull()
    expect(getOccurrenceDate('2026-02-30', 'daily', 0)).toBeNull()
    expect(getOccurrenceKey('rule-1', '2026-11-01')).toBe('rule-1_2026-11-01')
  })
})
