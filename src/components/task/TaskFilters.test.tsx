import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskFilters } from './TaskFilters'
import { filterTasks, type TaskFilterValues } from './taskFilterLogic'
import type { TaskRecord } from '../../types/database'

const task = (id: string, values: Partial<TaskRecord> = {}): TaskRecord => ({
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
  created_at: '',
  updated_at: '',
  remind_at: null,
  ...values,
})

describe('task filtering', () => {
  it('combines case-insensitive search, status, category, and priority filters', () => {
    const tasks = [
      task('Prepare report', {
        status: 'In Progress',
        priority: 'High',
        category_id: 'category-1',
      }),
      task('Read book'),
    ]
    const filters: TaskFilterValues = {
      query: 'PREPARE',
      status: 'In Progress',
      categoryId: 'category-1',
      priority: 'High',
    }

    expect(filterTasks(tasks, filters).map((item) => item.id)).toEqual([
      'Prepare report',
    ])
  })

  it('renders controlled filters and emits changes', () => {
    const onChange = vi.fn()
    render(
      <TaskFilters
        value={{ query: '', status: 'all', categoryId: '', priority: 'all' }}
        categories={[]}
        onChange={onChange}
      />,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Cari task' }), {
      target: { value: 'Plan' },
    })
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Plan' }),
    )
  })
})
