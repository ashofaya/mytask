import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TasksPage } from './TasksPage'

const taskDataMocks = vi.hoisted(() => ({
  useTaskData: vi.fn(),
}))

vi.mock('../hooks/useTaskData', () => taskDataMocks)

const useTaskData = taskDataMocks.useTaskData
const task = {
  id: 'task-1',
  user_id: 'user-1',
  category_id: null,
  recurring_rule_id: null,
  occurrence_date: null,
  occurrence_key: null,
  title: 'Prepare release',
  description: 'Check deployment plan',
  priority: 'High',
  start_date: null,
  deadline: '2026-11-03',
  status: 'To Do',
  completed_at: null,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
  remind_at: null,
} as const

describe('TasksPage', () => {
  const reload = vi.fn().mockResolvedValue(undefined)
  const addTask = vi.fn().mockResolvedValue(undefined)
  const editTask = vi.fn().mockResolvedValue(undefined)
  const changeStatus = vi.fn().mockResolvedValue(undefined)
  const removeTask = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    useTaskData.mockReturnValue({
      tasks: [task],
      categories: [],
      loading: false,
      error: null,
      reload,
      addTask,
      editTask,
      changeStatus,
      removeTask,
    })
  })

  it('renders actual task list and filters by search text', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <Routes>
          <Route path="/tasks" element={<TasksPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Prepare release')).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: 'Cari task' }), 'not found')
    expect(screen.queryByText('Prepare release')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Belum ada task' })).toBeInTheDocument()
  })

  it('opens edit form for a task route and saves through the hook service', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/tasks/task-1']}>
        <Routes>
          <Route path="/tasks/:taskId" element={<TasksPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Prepare release')).toBeInTheDocument()
    await user.clear(screen.getByLabelText('Judul'))
    await user.type(screen.getByLabelText('Judul'), 'Release ready')
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }))

    await waitFor(() => {
      expect(editTask).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ title: 'Release ready' }),
      )
    })
  })
})
