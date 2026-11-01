import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TaskList } from './TaskList'
import type { TaskRecord } from '../../types/database'

const task: TaskRecord = {
  id: 'task-1',
  user_id: 'user-1',
  category_id: null,
  recurring_rule_id: null,
  occurrence_date: null,
  occurrence_key: null,
  title: 'Prepare launch',
  description: null,
  priority: 'High',
  start_date: null,
  deadline: null,
  status: 'To Do',
  completed_at: null,
  created_at: '',
  updated_at: '',
  remind_at: null,
}

describe('TaskList', () => {
  it('changes status and confirms before deleting a task', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn().mockResolvedValue(undefined)
    const onDelete = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <TaskList
          tasks={[task]}
          categories={[]}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText('Status Prepare launch'), 'Completed')
    expect(onStatusChange).toHaveBeenCalledWith('task-1', 'Completed')

    await user.click(screen.getByRole('button', { name: 'Hapus Prepare launch' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /^Hapus$/ }))
    expect(onDelete).toHaveBeenCalledWith(task)
  })
})
