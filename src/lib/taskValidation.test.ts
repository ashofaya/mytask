import { describe, expect, it } from 'vitest'
import {
  categorySchema,
  profileSchema,
  reminderSchema,
  recurringRuleSchema,
  taskSchema,
} from './taskValidation'

const validTask = {
  title: '  Prepare report  ',
  description: '  Details  ',
  category_id: '',
  priority: 'High',
  status: 'In Progress',
  start_date: '2026-11-01',
  deadline: '2026-11-03',
  remind_at: '',
}

describe('task and category schemas', () => {
  it('trims task text and normalizes optional empty fields', () => {
    expect(taskSchema.parse(validTask)).toMatchObject({
      title: 'Prepare report',
      description: 'Details',
      category_id: null,
      start_date: '2026-11-01',
      deadline: '2026-11-03',
      remind_at: null,
    })
  })

  it('rejects blank/oversized titles and descriptions', () => {
    expect(taskSchema.safeParse({ ...validTask, title: '  ' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...validTask, title: 'x'.repeat(256) }).success).toBe(
      false,
    )
    expect(
      taskSchema.safeParse({ ...validTask, description: 'x'.repeat(1001) }).success,
    ).toBe(false)
  })

  it('rejects impossible dates, deadline before start, and unsupported states', () => {
    expect(taskSchema.safeParse({ ...validTask, deadline: '2026-02-30' }).success).toBe(
      false,
    )
    expect(
      taskSchema.safeParse({
        ...validTask,
        start_date: '2026-11-03',
        deadline: '2026-11-02',
      }).success,
    ).toBe(false)
    expect(taskSchema.safeParse({ ...validTask, status: 'Overdue' }).success).toBe(false)
    expect(
      taskSchema.safeParse({ ...validTask, remind_at: '2026-11-01T25:30' }).success,
    ).toBe(false)
  })

  it('validates category UUID and trims category names', () => {
    expect(
      taskSchema.safeParse({
        ...validTask,
        category_id: 'not-a-uuid',
      }).success,
    ).toBe(false)
    expect(categorySchema.parse({ name: '  Personal  ' })).toEqual({
      name: 'Personal',
    })
    expect(categorySchema.safeParse({ name: '   ' }).success).toBe(false)
  })

  it('validates trimmed profile names and notification preferences', () => {
    expect(
      profileSchema.parse({
        display_name: '  Nadia  ',
        notifications_enabled: true,
      }),
    ).toEqual({ display_name: 'Nadia', notifications_enabled: true })
    expect(
      profileSchema.safeParse({
        display_name: ' ',
        notifications_enabled: false,
      }).success,
    ).toBe(false)
  })

  it('validates recurring date ranges, frequencies, and reminder offsets', () => {
    const validRule = {
      title: 'Routine',
      priority: 'Medium',
      frequency: 'monthly',
      start_date: '2026-01-31',
      end_date: '2026-02-28',
      reminder_offset_minutes: '60',
      is_active: true,
    }
    expect(recurringRuleSchema.parse(validRule)).toMatchObject({
      end_date: '2026-02-28',
      reminder_offset_minutes: 60,
    })
    expect(
      recurringRuleSchema.safeParse({
        ...validRule,
        end_date: '2026-01-30',
      }).success,
    ).toBe(false)
    expect(
      recurringRuleSchema.safeParse({
        ...validRule,
        reminder_offset_minutes: '-1',
      }).success,
    ).toBe(false)
  })

  it('requires an absolute reminder timestamp and a task UUID', () => {
    expect(
      reminderSchema.safeParse({
        task_id: '00000000-0000-4000-8000-000000000001',
        remind_at: '2026-11-01T04:30:00Z',
      }).success,
    ).toBe(true)
    expect(
      reminderSchema.safeParse({
        task_id: 'invalid',
        remind_at: '2026-11-01T04:30:00',
      }).success,
    ).toBe(false)
  })
})
