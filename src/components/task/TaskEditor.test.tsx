import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskEditor } from './TaskEditor'

describe('TaskEditor', () => {
  it('blocks invalid title and deadline before start without saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <TaskEditor
        categories={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Judul'), '  ')
    await user.type(screen.getByLabelText('Tanggal mulai'), '2026-11-05')
    await user.type(screen.getByLabelText('Tenggat'), '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Simpan tugas' }))

    expect(await screen.findByText('Judul wajib diisi.')).toBeInTheDocument()
    expect(
      screen.getByText('Deadline tidak boleh lebih awal dari tanggal mulai.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('submits validated task values and renders task options', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskEditor
        categories={[
          {
            id: '10000000-0000-4000-8000-000000000001',
            user_id: 'user-1',
            name: 'Work',
            created_at: '',
            updated_at: '',
          },
        ]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Judul'), 'Write proposal')
    await user.selectOptions(screen.getByLabelText('Kategori'), '10000000-0000-4000-8000-000000000001')
    await user.selectOptions(screen.getByLabelText('Prioritas'), 'High')
    await user.selectOptions(screen.getByLabelText('Status'), 'In Progress')
    await user.click(screen.getByRole('button', { name: 'Simpan tugas' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Write proposal',
        category_id: '10000000-0000-4000-8000-000000000001',
        priority: 'High',
        status: 'In Progress',
        start_date: null,
        deadline: null,
        remind_at: null,
      }),
    )
  })

  it('warns and omits a reminder that is already in the past', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <TaskEditor
        categories={[]}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText('Judul'), 'Historical task')
    await user.type(screen.getByLabelText('Waktu pengingat (WIB)'), '2000-01-01T12:00')
    await user.click(screen.getByRole('button', { name: 'Simpan tugas' }))

    expect(
      await screen.findByText(/waktu reminder sudah lewat/i),
    ).toBeInTheDocument()
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Historical task', remind_at: null }),
    )
  })
})
