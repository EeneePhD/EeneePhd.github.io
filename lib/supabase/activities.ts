import { createClient } from './server'
import type { Activity, ActivityWithRelations } from '@/lib/types/database.types'

export async function getActivities(filters?: {
  type?: string
  owner_id?: string
  completed?: boolean
  contact_id?: string
  deal_id?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  const page = filters?.page ?? 0
  const pageSize = filters?.pageSize ?? 50

  let query = supabase
    .from('activities')
    .select(
      `*, owner:users(id,full_name,avatar_url), contact:contacts(id,first_name,last_name), deal:deals(id,title)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (filters?.type) query = query.eq('type', filters.type)
  if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id)
  if (filters?.completed !== undefined) query = query.eq('completed', filters.completed)
  if (filters?.contact_id) query = query.eq('contact_id', filters.contact_id)
  if (filters?.deal_id) query = query.eq('deal_id', filters.deal_id)
  if (filters?.dateFrom) query = query.gte('due_at', filters.dateFrom)
  if (filters?.dateTo) query = query.lte('due_at', filters.dateTo)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as ActivityWithRelations[], count: count ?? 0 }
}

export async function createActivity(
  activity: Omit<Activity, 'id' | 'created_at' | 'updated_at' | 'completed_at'>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single()
  if (error) throw error
  return data as Activity
}

export async function updateActivity(id: string, activity: Partial<Activity>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .update(activity)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Activity
}

export async function markActivityComplete(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Activity
}

export async function deleteActivity(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw error
}

export async function getOverdueTasksCount(ownerId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('activities')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'task')
    .eq('completed', false)
    .eq('owner_id', ownerId)
    .lt('due_at', new Date().toISOString())
  if (error) throw error
  return count ?? 0
}

export async function getUserRecentActivities(ownerId: string, limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select(
      `*, contact:contacts(id,first_name,last_name), deal:deals(id,title)`
    )
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
