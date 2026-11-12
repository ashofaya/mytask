import { useCallback, useEffect, useState } from 'react'
import { listCategories } from '../services/categoryService'
import {
  createTask,
  deleteTask,
  listTasks,
  TaskOccurrenceGenerationError,
  updateTask,
  updateTaskStatus,
  type SaveTaskInput,
} from '../services/taskService'
import type {
  Category,
  TaskRecord,
  TaskStatus,
} from '../types/database'

export function useTaskData() {
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextTasks, nextCategories] = await Promise.all([
        listTasks(),
        listCategories(),
      ])
      setTasks(nextTasks)
      setCategories(nextCategories)
      window.dispatchEvent(new Event('mytask:tasks-updated'))
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Data task tidak dapat dimuat. Periksa koneksi lalu coba lagi.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void Promise.all([listTasks(), listCategories()])
      .then(([nextTasks, nextCategories]) => {
        if (active) {
          setTasks(nextTasks)
          setCategories(nextCategories)
          setError(null)
          window.dispatchEvent(new Event('mytask:tasks-updated'))
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Data task tidak dapat dimuat. Periksa koneksi lalu coba lagi.',
          )
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  const addTask = useCallback(
    async (input: SaveTaskInput) => {
      const created = await createTask(input)
      await reload()
      return created
    },
    [reload],
  )

  const editTask = useCallback(
    async (taskId: string, input: SaveTaskInput) => {
      const updated = await updateTask(taskId, input)
      await reload()
      return updated
    },
    [reload],
  )

  const changeStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        await updateTaskStatus(taskId, status)
      } catch (error) {
        if (error instanceof TaskOccurrenceGenerationError) {
          await reload()
        }
        throw error
      }
      await reload()
    },
    [reload],
  )

  const removeTask = useCallback(
    async (taskId: string) => {
      await deleteTask(taskId)
      await reload()
    },
    [reload],
  )

  return {
    tasks,
    categories,
    loading,
    error,
    reload,
    addTask,
    editTask,
    changeStatus,
    removeTask,
  }
}
