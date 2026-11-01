import { supabase } from '../lib/supabase'
import type {
  TaskInsert,
  TaskRecord,
  TaskStatus,
} from '../types/database'
import {
  isPastJakartaDateTime,
  jakartaDateTimeLocalToIso,
} from '../utils/dateTime'

export interface SaveTaskInput extends TaskInsert {
  remind_at: string | null
}

export class TaskReminderSaveError extends Error {
  readonly taskWasSaved = true

  constructor(message: string) {
    super(message)
    this.name = 'TaskReminderSaveError'
  }
}

export class TaskOccurrenceGenerationError extends Error {
  readonly taskStatusWasSaved = true

  constructor(message: string) {
    super(message)
    this.name = 'TaskOccurrenceGenerationError'
  }
}

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

async function saveReminder(
  taskId: string,
  userId: string,
  reminderLocal: string | null,
): Promise<void> {
  const client = getClient()

  if (!reminderLocal || isPastJakartaDateTime(reminderLocal)) {
    const { error } = await client
      .from('reminders')
      .delete()
      .eq('task_id', taskId)
    if (error) {
      throw error
    }
    return
  }

  const remindAt = jakartaDateTimeLocalToIso(reminderLocal)
  if (!remindAt) {
    return
  }

  const { error } = await client.from('reminders').upsert(
    {
      user_id: userId,
      task_id: taskId,
      remind_at: remindAt,
      delivered_at: null,
    },
    { onConflict: 'task_id' },
  )

  if (error) {
    throw error
  }
}

export async function listTasks(): Promise<TaskRecord[]> {
  const client = getClient()
  const { data, error } = await client
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const tasks = data as Omit<TaskRecord, 'remind_at'>[]
  if (!tasks.length) {
    return []
  }

  const { data: reminders, error: reminderError } = await client
    .from('reminders')
    .select('task_id, remind_at')
    .in(
      'task_id',
      tasks.map((task) => task.id),
    )

  if (reminderError) {
    throw reminderError
  }

  const reminderByTask = new Map(
    reminders.map((reminder) => [reminder.task_id, reminder.remind_at]),
  )
  return tasks.map((task) => ({
    ...task,
    remind_at: reminderByTask.get(task.id) ?? null,
  }))
}

export async function createTask(input: SaveTaskInput): Promise<TaskRecord> {
  const client = getClient()
  const userId = await getCurrentUserId()
  const { remind_at: reminderLocal, ...taskInput } = input
  const { data, error } = await client
    .from('tasks')
    .insert({ ...taskInput, user_id: userId })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  try {
    await saveReminder(data.id, userId, reminderLocal)
  } catch (reminderError) {
    const message =
      reminderError instanceof Error
        ? reminderError.message
        : 'Kesalahan tidak diketahui.'
    throw new TaskReminderSaveError(
      `Task berhasil disimpan, tetapi reminder gagal disimpan: ${message}`,
    )
  }

  return { ...data, remind_at: reminderLocal }
}

export async function updateTask(
  taskId: string,
  input: SaveTaskInput,
): Promise<TaskRecord> {
  const client = getClient()
  const userId = await getCurrentUserId()
  const { remind_at: reminderLocal, ...taskInput } = input
  const { data, error } = await client
    .from('tasks')
    .update(taskInput)
    .eq('id', taskId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error('Task tidak ditemukan atau tidak dapat diakses.')
  }

  try {
    await saveReminder(taskId, userId, reminderLocal)
  } catch (reminderError) {
    const message =
      reminderError instanceof Error
        ? reminderError.message
        : 'Kesalahan tidak diketahui.'
    throw new TaskReminderSaveError(
      `Task berhasil diperbarui, tetapi reminder gagal diperbarui: ${message}`,
    )
  }

  return { ...data, remind_at: reminderLocal }
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  const client = getClient()
  const { data, error } = await client
    .from('tasks')
    .update({ status })
    .eq('id', taskId)
    .select('id, recurring_rule_id')
    .maybeSingle()

  if (error) {
    throw error
  }
  if (!data) {
    throw new Error('Task tidak ditemukan atau tidak dapat diakses.')
  }
  if (status === 'Completed' && data.recurring_rule_id) {
    const { error: generationError } = await client.rpc(
      'generate_next_recurring_occurrence',
      { p_rule_id: data.recurring_rule_id },
    )
    if (generationError) {
      throw new TaskOccurrenceGenerationError(
        `Status task berhasil diperbarui, tetapi occurrence berikutnya gagal dibuat: ${generationError.message}`,
      )
    }
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  const { data, error } = await getClient()
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .select('id')

  if (error) {
    throw error
  }
  if (!data.length) {
    throw new Error('Task tidak ditemukan atau tidak dapat diakses.')
  }
}
