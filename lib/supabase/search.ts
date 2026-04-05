import { createClient } from './server'

export interface SearchResult {
  id: string
  record_type: 'contact' | 'company' | 'deal'
  title: string
  subtitle: string | null
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return []
  const supabase = await createClient()
  const q = `%${query.trim()}%`

  const [contacts, companies, deals] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, first_name, last_name, email')
      .or(`first_name.ilike.${q},last_name.ilike.${q},email.ilike.${q}`)
      .limit(5),
    supabase
      .from('companies')
      .select('id, name, website')
      .ilike('name', q)
      .limit(5),
    supabase
      .from('deals')
      .select('id, title, status')
      .ilike('title', q)
      .limit(5),
  ])

  const results: SearchResult[] = [
    ...(contacts.data ?? []).map((c) => ({
      id: c.id,
      record_type: 'contact' as const,
      title: `${c.first_name} ${c.last_name}`,
      subtitle: c.email,
    })),
    ...(companies.data ?? []).map((c) => ({
      id: c.id,
      record_type: 'company' as const,
      title: c.name,
      subtitle: c.website,
    })),
    ...(deals.data ?? []).map((d) => ({
      id: d.id,
      record_type: 'deal' as const,
      title: d.title,
      subtitle: d.status,
    })),
  ]

  return results
}
