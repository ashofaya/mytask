import { supabase } from '../lib/supabase'
import type {
  RecurringRule,
  RecurringRuleInsert,
  RecurringRuleUpdate,
} from '../types/database'
import type { ValidatedRecurringRuleInput } from '../lib/taskValidation'

export interface GeneratedOccurrence {
  was_created: boolean
  generated_task_id: string
  generated_occurrence_date: string
  generated_occurrence_key: string
}

function getClient() {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.')
  }
  return supabase
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await getClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Sesi berakhir. Silakan masuk kembali.')
  return data.user.id
}

export async function listRecurringRules(): Promise<RecurringRule[]> {
  const { data, error } = await getClient()
    .from('recurring_rules')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createRecurringRule(
  input: ValidatedRecurringRuleInput,
): Promise<RecurringRule> {
  const userId = await getCurrentUserId()
  const insert: RecurringRuleInsert = { ...input, user_id: userId }
  const { data, error } = await getClient()
    .from('recurring_rules')
    .insert(insert)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateRecurringRule(
  ruleId: string,
  input: RecurringRuleUpdate,
): Promise<RecurringRule> {
  const { data: current, error: currentError } = await getClient()
    .from('recurring_rules')
    .select('next_occurrence_index, frequency, start_date')
    .eq('id', ruleId)
    .is('deleted_at', null)
    .maybeSingle()

  if (currentError) throw currentError
  if (!current) throw new Error('Aturan berulang tidak ditemukan atau tidak dapat diakses.')
  if (
    current.next_occurrence_index > 0 &&
    ((input.frequency !== undefined && input.frequency !== current.frequency) ||
      (input.start_date !== undefined && input.start_date !== current.start_date))
  ) {
    throw new Error(
      'Frekuensi dan tanggal mulai tidak dapat diubah setelah occurrence pertama dibuat.',
    )
  }

  const changesSchedule =
    input.frequency !== undefined || input.start_date !== undefined
  let updateQuery = getClient()
    .from('recurring_rules')
    .update(input)
    .eq('id', ruleId)
    .is('deleted_at', null)
  if (changesSchedule && current.next_occurrence_index === 0) {
    updateQuery = updateQuery.eq('next_occurrence_index', 0)
  }
  const { data, error } = await updateQuery.select('*').maybeSingle()

  if (error) throw error
  if (!data) {
    if (changesSchedule) {
      throw new Error(
        'Jadwal tidak dapat diubah karena occurrence pertama sudah dibuat.',
      )
    }
    throw new Error('Aturan berulang tidak ditemukan atau tidak dapat diakses.')
  }
  return data
}

export async function setRecurringRuleActive(
  ruleId: string,
  isActive: boolean,
): Promise<void> {
  const { data, error } = await getClient()
    .from('recurring_rules')
    .update({ is_active: isActive })
    .eq('id', ruleId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Aturan berulang tidak ditemukan atau tidak dapat diakses.')
}

export async function softDeleteRecurringRule(ruleId: string): Promise<void> {
  const { data, error } = await getClient()
    .from('recurring_rules')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', ruleId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Aturan berulang tidak ditemukan atau tidak dapat diakses.')
}

export async function generateNextOccurrence(
  ruleId: string,
): Promise<GeneratedOccurrence | null> {
  const { data, error } = await getClient().rpc(
    'generate_next_recurring_occurrence',
    { p_rule_id: ruleId },
  )

  if (error) throw error
  const occurrence = data?.[0] as GeneratedOccurrence | undefined
  return occurrence ?? null
}

export async function generateActiveOccurrences(): Promise<void> {
  const rules = await listRecurringRules()
  const failures: string[] = []
  for (const rule of rules) {
    if (rule.is_active) {
      try {
        await generateNextOccurrence(rule.id)
      } catch (error) {
        failures.push(
          `${rule.title}: ${
            error instanceof Error ? error.message : 'Kesalahan tidak diketahui.'
          }`,
        )
      }
    }
  }
  if (failures.length) {
    throw new Error(`Sebagian aturan berulang gagal diproses: ${failures.join('; ')}`)
  }
}
