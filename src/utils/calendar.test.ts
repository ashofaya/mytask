import { describe, expect, it } from 'vitest'
import { getMonthDates, getWeekDates, shiftCalendarPeriod, startOfCalendarWeek } from './calendar'

describe('calendar date utilities', () => {
  it('creates Monday-first weeks around date-only values', () => {
    expect(startOfCalendarWeek('2026-11-01')).toBe('2026-10-26')
    expect(getWeekDates('2026-11-01')).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
    ])
  })

  it('includes adjacent dates needed to complete the monthly grid', () => {
    const dates = getMonthDates('2026-11-15')
    expect(dates[0]).toBe('2026-10-26')
    expect(dates[dates.length - 1]).toBe('2026-12-06')
    expect(dates.length % 7).toBe(0)
  })

  it('navigates months without overflowing short months and shifts weeks', () => {
    expect(shiftCalendarPeriod('2026-01-31', 1, 'month')).toBe('2026-02-28')
    expect(shiftCalendarPeriod('2026-11-01', -1, 'week')).toBe('2026-10-25')
  })
})
