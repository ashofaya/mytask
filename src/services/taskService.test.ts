import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDaysToDateOnly, todayJakarta } from '../utils/dateTime'
import {
  countOverdueTasks,
  createTask,
  listTasks,
  TaskReminderSaveError,
  updateTaskStatus,
} from './taskService'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    auth: { getUser: mocks.getUser },
  },
}))

const taskRow = {
  id: 'task-1',
  user_id: 'user-1',
  category_id: null,
  recurring_rule_id: null,
  occurrence_date: null,
  occurrence_key: null,
  title: 'Review plan',
  description: null,
  priority: 'Medium',
  start_date: null,
  deadline: null,
  status: 'To Do',
  completed_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
}

describe('task service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('loads tasks and their reminders through the authenticated Supabase client', async () => {
    const taskQuery = {
      select: vi.fn(),
      order: vi.fn(),
    }
    taskQuery.select.mockReturnValue(taskQuery)
    taskQuery.order.mockResolvedValue({ data: [taskRow], error: null })
    const reminderQuery = {
      select: vi.fn(),
      in: vi.fn(),
    }
    reminderQuery.select.mockReturnValue(reminderQuery)
    reminderQuery.in.mockResolvedValue({
      data: [{ task_id: 'task-1', remind_at: '2026-11-02T03:00:00.000Z' }],
      error: null,
    })
    mocks.from.mockImplementation((table: string) =>
      table === 'tasks' ? taskQuery : reminderQuery,
    )

    await expect(listTasks()).resolves.toMatchObject([
      { id: 'task-1', title: 'Review plan', remind_at: '2026-11-02T03:00:00.000Z' },
    ])
    expect(mocks.from).toHaveBeenNthCalledWith(1, 'tasks')
    expect(mocks.from).toHaveBeenNthCalledWith(2, 'reminders')
    expect(reminderQuery.in).toHaveBeenCalledWith('task_id', ['task-1'])
  })

  it('counts only unfinished tasks with a deadline before Jakarta today', async () => {
    const query = {
      select: vi.fn(),
      lt: vi.fn(),
      neq: vi.fn(),
    }
    query.select.mockReturnValue(query)
    query.lt.mockReturnValue(query)
    query.neq.mockResolvedValue({ count: 2, error: null })
    mocks.from.mockReturnValue(query)

    await expect(countOverdueTasks()).resolves.toBe(2)
    expect(mocks.from).toHaveBeenCalledWith('tasks')
    expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(query.lt).toHaveBeenCalledWith('deadline', expect.any(String))
    expect(query.neq).toHaveBeenCalledWith('status', 'Completed')
  })

  it('uses the authenticated user id on inserts and reports partial reminder failure', async () => {
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: taskRow, error: null }),
      }),
    })
    const upsert = vi.fn().mockResolvedValue({
      error: { message: 'reminder insert failed' },
    })
    mocks.from.mockImplementation((table: string) =>
      table === 'tasks' ? { insert } : { upsert },
    )

    await expect(
      createTask({
        title: 'Review plan',
        priority: 'Medium',
        status: 'To Do',
        remind_at: `${addDaysToDateOnly(todayJakarta(), 1)}T12:00`,
      }),
    ).rejects.toBeInstanceOf(TaskReminderSaveError)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', title: 'Review plan' }),
    )
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        task_id: 'task-1',
        delivered_at: null,
      }),
      { onConflict: 'task_id' },
    )
  })

  it('updates only the selected task status and leaves completion time to the database trigger', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'task-1' },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ update })

    await expect(updateTaskStatus('task-1', 'Completed')).resolves.toBeUndefined()
    expect(update).toHaveBeenCalledWith({ status: 'Completed' })
    expect(eq).toHaveBeenCalledWith('id', 'task-1')
  })

  it('generates the next occurrence after completing a recurring task', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'task-1', recurring_rule_id: 'rule-1' },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ update })
    mocks.rpc.mockResolvedValue({ data: [], error: null })

    await expect(updateTaskStatus('task-1', 'Completed')).resolves.toBeUndefined()
    expect(mocks.rpc).toHaveBeenCalledWith(
      'generate_next_recurring_occurrence',
      { p_rule_id: 'rule-1' },
    )
  })
})
