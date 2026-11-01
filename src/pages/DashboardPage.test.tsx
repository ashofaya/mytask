import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

const taskDataMocks = vi.hoisted(() => ({
  useTaskData: vi.fn(),
}))

vi.mock('../hooks/useTaskData', () => taskDataMocks)

describe('DashboardPage', () => {
  beforeEach(() => {
    taskDataMocks.useTaskData.mockReturnValue({
      tasks: [],
      categories: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      addTask: vi.fn(),
      editTask: vi.fn(),
      changeStatus: vi.fn(),
      removeTask: vi.fn(),
    })
  })

  it('renders real empty states and statistics when there are no tasks', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Selamat datang di MyTask' })).toBeInTheDocument()
    expect(screen.getByText('Total task')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(5)
    expect(screen.getByText('Hari ini masih lengang')).toBeInTheDocument()
    expect(screen.getByText('Belum ada task mendatang')).toBeInTheDocument()
  })

  it('shows a loading state instead of an empty state while loading', () => {
    taskDataMocks.useTaskData.mockReturnValue({
      tasks: [],
      categories: [],
      loading: true,
      error: null,
      reload: vi.fn(),
      addTask: vi.fn(),
      editTask: vi.fn(),
      changeStatus: vi.fn(),
      removeTask: vi.fn(),
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Memuat dashboard')
  })
})
