export const TASK_STATUSES = ['To Do', 'In Progress', 'Completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const RECURRING_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number]

export interface Profile {
  id: string
  display_name: string
  timezone: string
  notifications_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface RecurringRule {
  id: string
  user_id: string
  category_id: string | null
  title: string
  description: string | null
  priority: TaskPriority
  frequency: RecurringFrequency
  start_date: string
  end_date: string | null
  next_occurrence_index: number
  reminder_offset_minutes: number | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskRecord {
  id: string
  user_id: string
  category_id: string | null
  recurring_rule_id: string | null
  occurrence_date: string | null
  occurrence_key: string | null
  title: string
  description: string | null
  priority: TaskPriority
  start_date: string | null
  deadline: string | null
  status: TaskStatus
  completed_at: string | null
  created_at: string
  updated_at: string
  remind_at: string | null
}

export interface Reminder {
  id: string
  user_id: string
  task_id: string
  remind_at: string
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export type TaskInsert = Pick<TaskRecord, 'title'> &
  Partial<
    Pick<
      TaskRecord,
      | 'category_id'
      | 'description'
      | 'priority'
      | 'start_date'
      | 'deadline'
      | 'status'
    >
  >

export type TaskUpdate = Partial<TaskInsert>

export type ProfileUpdate = Partial<
  Pick<Profile, 'display_name' | 'notifications_enabled'>
>

export type CategoryInsert = Pick<Category, 'user_id' | 'name'>
export type CategoryUpdate = Partial<Pick<Category, 'name'>>

export type RecurringRuleInsert = Pick<
  RecurringRule,
  'user_id' | 'title' | 'frequency' | 'start_date'
> &
  Partial<
    Pick<
      RecurringRule,
      | 'category_id'
      | 'description'
      | 'priority'
      | 'end_date'
      | 'reminder_offset_minutes'
      | 'is_active'
    >
  >

export type RecurringRuleUpdate = Partial<
  Pick<
    RecurringRule,
    | 'category_id'
    | 'title'
    | 'description'
    | 'priority'
    | 'frequency'
    | 'start_date'
    | 'end_date'
    | 'reminder_offset_minutes'
    | 'is_active'
    | 'deleted_at'
  >
>

export type ReminderInsert = Pick<Reminder, 'user_id' | 'task_id' | 'remind_at'>
export type ReminderUpdate = Partial<
  Pick<Reminder, 'remind_at' | 'delivered_at'>
>
