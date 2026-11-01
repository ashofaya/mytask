import { z } from 'zod'
import {
  RECURRING_FREQUENCIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../types/database'
import { isValidDateOnly } from '../utils/dateTime'

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || isValidDateOnly(value), {
    message: 'Masukkan tanggal kalender yang valid.',
  })

export const taskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Judul wajib diisi.')
      .max(255, 'Judul maksimal 255 karakter.'),
    description: z
      .string()
      .trim()
      .max(1000, 'Deskripsi maksimal 1.000 karakter.')
      .optional()
      .transform((value) => value || null),
    category_id: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || null)
      .refine((value) => value === null || z.uuid().safeParse(value).success, {
        message: 'Pilih kategori yang valid.',
      }),
    priority: z.enum(TASK_PRIORITIES),
    status: z.enum(TASK_STATUSES),
    start_date: optionalDate,
    deadline: optionalDate,
    remind_at: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || null)
      .refine(
        (value) =>
          value === null ||
          (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
            Number(value.slice(11, 13)) <= 23 &&
            Number(value.slice(14, 16)) <= 59),
        { message: 'Masukkan waktu pengingat yang valid.' },
      ),
  })
  .superRefine((task, context) => {
    if (
      task.start_date &&
      task.deadline &&
      task.deadline < task.start_date
    ) {
      context.addIssue({
        code: 'custom',
        path: ['deadline'],
        message: 'Deadline tidak boleh lebih awal dari tanggal mulai.',
      })
    }

    if (task.remind_at && !isValidDateOnly(task.remind_at.slice(0, 10))) {
      context.addIssue({
        code: 'custom',
        path: ['remind_at'],
        message: 'Masukkan tanggal pengingat yang valid.',
      })
    }
  })

export type TaskFormInput = z.input<typeof taskSchema>
export type ValidatedTaskInput = z.output<typeof taskSchema>

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nama kategori wajib diisi.')
    .max(50, 'Nama kategori maksimal 50 karakter.'),
})

export type CategoryInput = z.infer<typeof categorySchema>

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, 'Nama tampilan wajib diisi.')
    .max(100, 'Nama tampilan maksimal 100 karakter.'),
  notifications_enabled: z.boolean(),
})

export const reminderSchema = z.object({
  task_id: z.uuid('Task tidak valid.'),
  remind_at: z
    .string()
    .trim()
    .refine(
      (value) =>
        !Number.isNaN(Date.parse(value)) &&
        /(?:Z|[+-]\d{2}:\d{2})$/i.test(value),
      { message: 'Reminder harus berupa timestamp dengan timezone.' },
    ),
})

const nullableDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || isValidDateOnly(value), {
    message: 'Masukkan tanggal kalender yang valid.',
  })

export const recurringRuleSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Judul wajib diisi.')
      .max(255, 'Judul maksimal 255 karakter.'),
    description: z
      .string()
      .trim()
      .max(1000, 'Deskripsi maksimal 1.000 karakter.')
      .optional()
      .transform((value) => value || null),
    category_id: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || null)
      .refine((value) => value === null || z.uuid().safeParse(value).success, {
        message: 'Pilih kategori yang valid.',
      }),
    priority: z.enum(TASK_PRIORITIES),
    frequency: z.enum(RECURRING_FREQUENCIES),
    start_date: z.string().trim().refine(isValidDateOnly, {
      message: 'Masukkan tanggal mulai yang valid.',
    }),
    end_date: nullableDate,
    reminder_offset_minutes: z
      .union([z.number(), z.string()])
      .optional()
      .transform((value) => {
        if (value === undefined || value === '') return null
        return typeof value === 'string' ? Number(value) : value
      })
      .refine(
        (value) =>
          value === null ||
          (Number.isInteger(value) && value >= 0 && value <= 525600),
        { message: 'Offset reminder harus 0 sampai 525.600 menit.' },
      ),
    is_active: z.boolean(),
  })
  .superRefine((rule, context) => {
    if (rule.end_date && rule.end_date < rule.start_date) {
      context.addIssue({
        code: 'custom',
        path: ['end_date'],
        message: 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
      })
    }
  })

export type RecurringRuleFormInput = z.input<typeof recurringRuleSchema>
export type ValidatedRecurringRuleInput = z.output<typeof recurringRuleSchema>
