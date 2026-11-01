import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarPage } from './CalendarPage'

const mocks = vi.hoisted(() => ({ useTaskData: vi.fn() }))
vi.mock('../hooks/useTaskData', () => ({ useTaskData: mocks.useTaskData }))

describe('CalendarPage', () => {
  beforeEach(() => {
    mocks.useTaskData.mockReturnValue({
      tasks: [{
        id: 'task-1',
        title: 'Deadline test',
        deadline: '2026-11-01',
        status: 'To Do',
        priority: 'High',
        category_id: null,
      }],
      loading: false,
      error: null,
      reload: vi.fn(),
    })
  })

  it('shows deadline task, switches to week view, and opens task edit', () => {
    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('Deadline test').length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Minggu' }))
    expect(screen.getAllByRole('link', { name: /Deadline test/ })[0]).toHaveAttribute(
      'href', '/tasks/task-1',
    )
  })
})
