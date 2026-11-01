import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AuthFeedback } from '../components/auth/AuthFeedback'
import { EmptyState, ErrorState, LoadingState } from '../components/common/DataState'
import { Button } from '../components/ui/button'
import { categorySchema } from '../lib/taskValidation'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categoryService'
import type { Category } from '../types/database'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      setCategories(await listCategories())
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Kategori gagal dimuat.',
      )
    }
  }, [])

  useEffect(() => {
    let active = true
    void listCategories().then(
      (items) => {
        if (active) setCategories(items)
      },
      (loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : 'Kategori gagal dimuat.',
          )
        }
      },
    )
    return () => {
      active = false
    }
  }, [])

  function retryLoad() {
    setCategories(null)
    setError(null)
    void reload()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMutationError(null)
    const result = categorySchema.safeParse({ name })
    if (!result.success) {
      setMutationError(result.error.issues[0]?.message ?? 'Nama kategori tidak valid.')
      return
    }
    setBusy(true)
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, result.data.name)
      } else {
        await createCategory(result.data.name)
      }
      setName('')
      setEditingCategory(null)
      await reload()
    } catch (saveError) {
      setMutationError(
        saveError instanceof Error ? saveError.message : 'Kategori gagal disimpan.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(category: Category) {
    if (!window.confirm(`Hapus kategori “${category.name}”? Task terkait tetap tersimpan.`)) {
      return
    }
    setMutationError(null)
    setBusy(true)
    try {
      await deleteCategory(category.id)
      await reload()
    } catch (deleteError) {
      setMutationError(
        deleteError instanceof Error ? deleteError.message : 'Kategori gagal dihapus.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (categories === null && !error) return <LoadingState label="Memuat kategori…" />
  if (error) return <ErrorState message={error} onRetry={retryLoad} />
  const categoryList = categories ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-blue-700">Organisasi</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Kategori</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gunakan kategori untuk mengelompokkan task pribadi Anda.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="font-semibold">{editingCategory ? 'Ubah kategori' : 'Kategori baru'}</h2>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="category-name" className="sr-only">Nama kategori</label>
          <input
            id="category-name"
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Contoh: Pekerjaan"
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          />
          <Button type="submit" disabled={busy} className="h-11 gap-2 bg-blue-600 text-white hover:bg-blue-700">
            {editingCategory ? <Pencil aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
            {editingCategory ? 'Simpan' : 'Tambah kategori'}
          </Button>
          {editingCategory && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingCategory(null)
                setName('')
                setMutationError(null)
              }}
            >
              Batal
            </Button>
          )}
        </form>
        {mutationError && <div className="mt-4"><AuthFeedback>{mutationError}</AuthFeedback></div>}
      </section>

      {categoryList.length ? (
        <ul className="space-y-2">
          {categoryList.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <span className="truncate text-sm font-medium">{category.name}</span>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => {
                    setEditingCategory(category)
                    setName(category.name)
                    setMutationError(null)
                  }}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Hapus ${category.name}`}
                  disabled={busy}
                  onClick={() => void handleDelete(category)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Belum ada kategori"
          description="Kategori yang Anda tambahkan akan tersedia saat membuat atau mengedit task."
        />
      )}
    </div>
  )
}
