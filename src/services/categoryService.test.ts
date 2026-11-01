import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCategory } from './categoryService'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: { getUser: mocks.getUser },
  },
}))

describe('category service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('inserts an owned category and maps a case-insensitive unique conflict', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key' },
    })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })

    await expect(createCategory('Work')).rejects.toThrow(
      'Nama kategori tersebut sudah digunakan.',
    )
    expect(insert).toHaveBeenCalledWith({ user_id: 'user-1', name: 'Work' })
  })
})
