import { supabase } from '../lib/supabase'

export interface DueReminder {
  id: string
  task_id: string
  remind_at: string
  title: string
}

function getClient() {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.')
  }
  return supabase
}

export async function listDueReminders(
  now: Date = new Date(),
): Promise<DueReminder[]> {
  const client = getClient()
  const { data: reminders, error } = await client
    .from('reminders')
    .select('id, task_id, remind_at')
    .is('delivered_at', null)
    .lte('remind_at', now.toISOString())
    .order('remind_at', { ascending: true })

  if (error) throw error
  if (!reminders.length) return []

  const { data: tasks, error: taskError } = await client
    .from('tasks')
    .select('id, title')
    .in('id', reminders.map((reminder) => reminder.task_id))

  if (taskError) throw taskError
  const titleByTaskId = new Map(tasks.map((task) => [task.id, task.title]))

  return reminders.flatMap((reminder) => {
    const title = titleByTaskId.get(reminder.task_id)
    return title
      ? [{ ...reminder, title }]
      : []
  })
}

export async function claimDueReminder(reminderId: string): Promise<boolean> {
  const { data, error } = await getClient().rpc('claim_due_reminder', {
    p_reminder_id: reminderId,
  })
  if (error) throw error
  return data === true
}
