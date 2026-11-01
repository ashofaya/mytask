import { describe, expect, it } from 'vitest'
import {
  addDaysToDateOnly,
  formatDateJakarta,
  isPastJakartaDateTime,
  isValidDateOnly,
  jakartaDateTimeLocalToIso,
  todayJakarta,
} from './dateTime'
import { getDashboardSummary, isOverdue, transitionTaskStatus } from './taskLogic'
import type { TaskRecord } from '../types/database'

const task = (
  id: string,
  overrides: Partial<TaskRecord> = {},
): TaskRecord => ({
  id,
  user_id: 'user',
  category_id: null,
  recurring_rule_id: null,
  occurrence_date: null,
  occurrence_key: null,
  title: id,
  description: null,
  priority: 'Medium',
  start_date: null,
  deadline: null,
  status: 'To Do',
  completed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  remind_at: null,
  ...overrides,
})

describe('Asia/Jakarta date and task logic', () => {
  it('calculates the business date across UTC midnight correctly', () => {
    expect(todayJakarta(new Date('2026-10-31T17:00:00.000Z'))).toBe('2026-11-01')
    expect(todayJakarta(new Date('2026-10-31T16:59:59.000Z'))).toBe('2026-10-31')
  })

  it('validates date-only values and adds days without local timezone drift', () => {
    expect(isValidDateOnly('2024-02-29')).toBe(true)
    expect(isValidDateOnly('2026-02-29')).toBe(false)
    expect(addDaysToDateOnly('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDaysToDateOnly('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('formats date-only values as calendar dates and reminders as WIB instants', () => {
    expect(formatDateJakarta('2026-11-01')).toContain('1')
    expect(jakartaDateTimeLocalToIso('2026-11-01T09:30')).toBe(
      '2026-11-01T02:30:00.000Z',
    )
  })

  it('compares reminder times as Asia/Jakarta instants', () => {
    const now = new Date('2026-11-01T03:00:00.000Z')
    expect(isPastJakartaDateTime('2026-11-01T10:59', now)).toBe(false)
    expect(isPastJakartaDateTime('2026-11-01T10:00', now)).toBe(true)
  })

  it('marks only non-completed tasks before the Jakarta date as overdue', () => {
    expect(isOverdue(task('late', { deadline: '2026-10-31' }), '2026-11-01')).toBe(true)
    expect(isOverdue(task('today', { deadline: '2026-11-01' }), '2026-11-01')).toBe(false)
    expect(
      isOverdue(
        task('completed', { deadline: '2026-10-31', status: 'Completed' }),
        '2026-11-01',
      ),
    ).toBe(false)
    expect(isOverdue(task('no-deadline'), '2026-11-01')).toBe(false)
  })

  it('summarizes statuses and separates today, upcoming, and overdue tasks', () => {
    const summary = getDashboardSummary(
      [
        task('today', { deadline: '2026-11-01' }),
        task('upcoming', { deadline: '2026-11-08' }),
        task('outside-week', { deadline: '2026-11-09' }),
        task('late', { deadline: '2026-10-30', status: 'In Progress' }),
        task('done', { deadline: '2026-10-30', status: 'Completed' }),
        task('no-date'),
      ],
      '2026-11-01',
    )

    expect(summary).toMatchObject({
      total: 6,
      todo: 4,
      inProgress: 1,
      completed: 1,
      overdue: 1,
    })
    expect(summary.today.map((entry) => entry.id)).toEqual(['today'])
    expect(summary.upcoming.map((entry) => entry.id)).toEqual(['upcoming'])
  })

  it('keeps completed_at correct when completing and reopening a task', () => {
    const now = new Date('2026-11-01T04:30:00.000Z')
    const completed = transitionTaskStatus(
      { status: 'In Progress', completed_at: null },
      'Completed',
      now,
    )
    expect(completed).toEqual({
      status: 'Completed',
      completed_at: '2026-11-01T04:30:00.000Z',
    })
    expect(
      transitionTaskStatus(completed, 'To Do', new Date('2026-11-02T00:00:00.000Z')),
    ).toEqual({ status: 'To Do', completed_at: null })
    expect(
      transitionTaskStatus(
        { status: 'Completed', completed_at: completed.completed_at },
        'Completed',
        new Date('2026-11-02T00:00:00.000Z'),
      ).completed_at,
    ).toBe(completed.completed_at)
  })
})
