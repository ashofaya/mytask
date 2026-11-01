import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateUserProfile } from './profileService'

const mocks = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../lib/supabase', () => ({ supabase: { from: mocks.from } }))

describe('profile service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates only the authenticated profile id and returns refreshed preferences', async () => {
    const query = {
      update: vi.fn(),
      eq: vi.fn(),
      select: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'user-1',
          display_name: 'Nadia',
          timezone: 'Asia/Jakarta',
          notifications_enabled: false,
        },
        error: null,
      }),
    }
    query.update.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.select.mockReturnValue(query)
    mocks.from.mockReturnValue(query)

    await expect(
      updateUserProfile(
        { id: 'user-1' } as never,
        { display_name: 'Nadia', notifications_enabled: false },
      ),
    ).resolves.toMatchObject({ display_name: 'Nadia', notifications_enabled: false })
    expect(mocks.from).toHaveBeenCalledWith('profiles')
    expect(query.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('reports an inaccessible profile rather than success-shaped empty data', async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    mocks.from.mockReturnValue(query)

    await expect(updateUserProfile({ id: 'user-1' } as never, {})).rejects.toThrow(
      'Profil tidak ditemukan',
    )
  })
})
