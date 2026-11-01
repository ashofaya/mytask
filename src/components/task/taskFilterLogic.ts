import type { TaskPriority, TaskRecord, TaskStatus } from '../../types/database'

export interface TaskFilterValues {
  query: string
  status: TaskStatus | 'all'
  categoryId: string
  priority: TaskPriority | 'all'
}

export function filterTasks(
  tasks: TaskRecord[],
  filters: TaskFilterValues,
): TaskRecord[] {
  const query = filters.query.trim().toLocaleLowerCase()
  return tasks.filter((task) => {
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.categoryId && task.category_id !== filters.categoryId) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    return (
      !query ||
      task.title.toLocaleLowerCase().includes(query) ||
      (task.description ?? '').toLocaleLowerCase().includes(query)
    )
  })
}
