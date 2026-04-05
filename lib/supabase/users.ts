import { createClient } from './server'
import type { User } from '@/lib/types/database.types'

export async function getUsers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data as User[]
}

export async function getUser(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as User
}

export async function updateUser(id: string, updates: Partial<User>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function updateUserRole(id: string, role: User['role']) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as User
}
