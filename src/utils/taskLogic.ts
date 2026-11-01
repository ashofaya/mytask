import type { TaskRecord, TaskStatus } from '../types/database'
import { addDaysToDateOnly, todayJakarta } from './dateTime'

export function isOverdue(
  task: Pick<TaskRecord, 'deadline' | 'status'>,
  today: string,
): boolean {
  return task.status !== 'Completed' && task.deadline !== null && task.deadline < today
}

export interface TaskDashboardSummary {
  total: number
  todo: number
  inProgress: number
  completed: number
  overdue: number
  today: TaskRecord[]
  upcoming: TaskRecord[]
}

export function getDashboardSummary(
  tasks: TaskRecord[],
  today: string = todayJakarta(),
): TaskDashboardSummary {
  const upcomingEnd = addDaysToDateOnly(today, 7)
  const openTasks = tasks.filter((task) => task.status !== 'Completed')
  const byDeadline = (left: TaskRecord, right: TaskRecord) =>
    (left.deadline ?? '').localeCompare(right.deadline ?? '')

  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'To Do').length,
    inProgress: tasks.filter((task) => task.status === 'In Progress').length,
    completed: tasks.filter((task) => task.status === 'Completed').length,
    overdue: tasks.filter((task) => isOverdue(task, today)).length,
    today: openTasks
      .filter((task) => task.deadline === today)
      .sort(byDeadline),
    upcoming: openTasks
      .filter(
        (task) =>
          task.deadline !== null &&
          task.deadline > today &&
          task.deadline <= upcomingEnd,
      )
      .sort(byDeadline),
  }
}

export function getStatusTransition(
  current: TaskStatus,
  next: TaskStatus,
): TaskStatus {
  return current === next ? current : next
}

export function transitionTaskStatus(
  current: Pick<TaskRecord, 'status' | 'completed_at'>,
  nextStatus: TaskStatus,
  now: Date,
): Pick<TaskRecord, 'status' | 'completed_at'> {
  if (nextStatus !== 'Completed') {
    return { status: nextStatus, completed_at: null }
  }
  if (current.status === 'Completed' && current.completed_at) {
    return { status: nextStatus, completed_at: current.completed_at }
  }
  return { status: nextStatus, completed_at: now.toISOString() }
}
