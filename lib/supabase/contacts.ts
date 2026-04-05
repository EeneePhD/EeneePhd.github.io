import { createClient } from './server'
import type { Contact, ContactWithRelations } from '@/lib/types/database.types'

export async function getContacts(filters?: {
  search?: string
  status?: string
  lead_source?: string
  owner_id?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  const page = filters?.page ?? 0
  const pageSize = filters?.pageSize ?? 50

  let query = supabase
    .from('contacts')
    .select(
      `*, company:companies(id,name), owner:users(id,full_name,avatar_url)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    )
  }
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.lead_source) query = query.eq('lead_source', filters.lead_source)
  if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as ContactWithRelations[], count: count ?? 0 }
}

export async function getContact(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select(`*, company:companies(*), owner:users(id,full_name,avatar_url)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as ContactWithRelations
}

export async function createContact(
  contact: Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'last_contacted_at'>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert(contact)
    .select()
    .single()
  if (error) throw error
  return data as Contact
}

export async function updateContact(id: string, contact: Partial<Contact>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .update(contact)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Contact
}

export async function deleteContact(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id)
  if (error) throw error
}

export async function bulkDeleteContacts(ids: string[]) {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().in('id', ids)
  if (error) throw error
}

export async function bulkUpdateContacts(
  ids: string[],
  update: Partial<Pick<Contact, 'status' | 'owner_id'>>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('contacts').update(update).in('id', ids)
  if (error) throw error
}

export async function getContactActivities(contactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select(`*, owner:users(id,full_name,avatar_url), deal:deals(id,title)`)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getContactDeals(contactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(`*, stage:pipeline_stages(id,name,color), company:companies(id,name)`)
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
