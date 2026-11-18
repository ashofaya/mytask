import { supabase } from '../lib/supabase'
import type {
  VaultNote,
  VaultNoteInsert,
  VaultNoteUpdate,
} from '../types/database'

function getClient() {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.')
  }
  return supabase
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await getClient().auth.getUser()
  if (error) {
    throw error
  }
  if (!data.user) {
    throw new Error('Sesi berakhir. Silakan masuk kembali.')
  }
  return data.user.id
}

export async function listVaultNotes(): Promise<VaultNote[]> {
  const { data, error } = await getClient()
    .from('vault_notes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }
  return (data ?? []) as VaultNote[]
}

export async function createVaultNote(
  input: VaultNoteInsert,
): Promise<VaultNote> {
  const userId = await getCurrentUserId()
  const { data, error } = await getClient()
    .from('vault_notes')
    .insert({
      user_id: userId,
      service_name: input.service_name.trim(),
      category: input.category,
      email_or_username: input.email_or_username.trim(),
      encrypted_password: input.encrypted_password,
      extra_notes: input.extra_notes?.trim() ? input.extra_notes.trim() : null,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message || 'Catatan gagal disimpan.')
  }
  return data as VaultNote
}

export async function updateVaultNote(
  noteId: string,
  input: VaultNoteUpdate,
): Promise<VaultNote> {
  const payload: Record<string, unknown> = {}
  if (input.service_name !== undefined) {
    payload.service_name = input.service_name.trim()
  }
  if (input.category !== undefined) {
    payload.category = input.category
  }
  if (input.email_or_username !== undefined) {
    payload.email_or_username = input.email_or_username.trim()
  }
  if (input.encrypted_password !== undefined) {
    payload.encrypted_password = input.encrypted_password
  }
  if (input.extra_notes !== undefined) {
    payload.extra_notes = input.extra_notes?.trim()
      ? input.extra_notes.trim()
      : null
  }

  const { data, error } = await getClient()
    .from('vault_notes')
    .update(payload)
    .eq('id', noteId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Catatan gagal diperbarui.')
  }
  if (!data) {
    throw new Error('Catatan tidak ditemukan atau tidak dapat diakses.')
  }
  return data as VaultNote
}

export async function deleteVaultNote(noteId: string): Promise<void> {
  const { data, error } = await getClient()
    .from('vault_notes')
    .delete()
    .eq('id', noteId)
    .select('id')

  if (error) {
    throw new Error(error.message || 'Catatan gagal dihapus.')
  }
  if (!data?.length) {
    throw new Error('Catatan tidak ditemukan atau tidak dapat diakses.')
  }
}
