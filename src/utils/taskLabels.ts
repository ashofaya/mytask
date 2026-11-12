import type { TaskPriority, TaskStatus } from '../types/database'

const taskStatusLabels: Record<TaskStatus, string> = {
  'To Do': 'Belum dimulai',
  'In Progress': 'Sedang dikerjakan',
  Completed: 'Selesai',
}

const taskPriorityLabels: Record<TaskPriority, string> = {
  Low: 'Rendah',
  Medium: 'Sedang',
  High: 'Tinggi',
}

export function getTaskStatusLabel(status: TaskStatus): string {
  return taskStatusLabels[status]
}

export function getTaskPriorityLabel(priority: TaskPriority): string {
  return taskPriorityLabels[priority]
}
