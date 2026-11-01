import { supabase } from '../lib/supabase'
import type { Category } from '../types/database'

function getClient() {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.')
  }
  return supabase
}

function getCurrentUserId(): Promise<string> {
  return getClient().auth.getUser().then(({ data, error }) => {
    if (error) {
      throw error
    }
    if (!data.user) {
      throw new Error('Sesi berakhir. Silakan masuk kembali.')
    }
    return data.user.id
  })
}

function mapCategoryError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error('Nama kategori tersebut sudah digunakan.')
  }
  return new Error(error.message || 'Kategori tidak dapat disimpan.')
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await getClient()
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw error
  }
  return data
}

export async function createCategory(name: string): Promise<Category> {
  const userId = await getCurrentUserId()
  const { data, error } = await getClient()
    .from('categories')
    .insert({ user_id: userId, name })
    .select('*')
    .single()

  if (error) {
    throw mapCategoryError(error)
  }
  return data
}

export async function updateCategory(
  categoryId: string,
  name: string,
): Promise<Category> {
  const { data, error } = await getClient()
    .from('categories')
    .update({ name })
    .eq('id', categoryId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw mapCategoryError(error)
  }
  if (!data) {
    throw new Error('Kategori tidak ditemukan atau tidak dapat diakses.')
  }
  return data
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const { data, error } = await getClient()
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .select('id')

  if (error) {
    throw error
  }
  if (!data.length) {
    throw new Error('Kategori tidak ditemukan atau tidak dapat diakses.')
  }
}
