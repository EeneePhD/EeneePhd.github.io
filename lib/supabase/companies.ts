import { createClient } from './server'
import type { Company, CompanyWithOwner } from '@/lib/types/database.types'

export async function getCompanies(filters?: {
  search?: string
  owner_id?: string
  page?: number
  pageSize?: number
}) {
  const supabase = await createClient()
  const page = filters?.page ?? 0
  const pageSize = filters?.pageSize ?? 50

  let query = supabase
    .from('companies')
    .select(`*, owner:users(id,full_name,avatar_url)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`)
  }
  if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id)

  const { data, error, count } = await query
  if (error) throw error
  return { data: data as CompanyWithOwner[], count: count ?? 0 }
}

export async function getCompany(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select(`*, owner:users(id,full_name,avatar_url)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as CompanyWithOwner
}

export async function createCompany(
  company: Omit<Company, 'id' | 'created_at' | 'updated_at'>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single()
  if (error) throw error
  return data as Company
}

export async function updateCompany(id: string, company: Partial<Company>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .update(company)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Company
}

export async function deleteCompany(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) throw error
}

export async function getCompanyContacts(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select(`*`)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getCompanyDeals(companyId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(`*, stage:pipeline_stages(id,name,color), owner:users(id,full_name)`)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
