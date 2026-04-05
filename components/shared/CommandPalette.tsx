'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Users, Building2, TrendingUp, Search, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SearchResult {
  id: string
  record_type: 'contact' | 'company' | 'deal'
  title: string
  subtitle: string | null
}

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

const iconMap = {
  contact: Users,
  company: Building2,
  deal: TrendingUp,
}

const labelMap = {
  contact: 'Contacts',
  company: 'Companies',
  deal: 'Deals',
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        return
      }
      setLoading(true)
      const likeQ = `%${q.trim()}%`

      const [contacts, companies, deals] = await Promise.all([
        supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .or(`first_name.ilike.${likeQ},last_name.ilike.${likeQ},email.ilike.${likeQ}`)
          .limit(4),
        supabase.from('companies').select('id, name, website').ilike('name', likeQ).limit(4),
        supabase.from('deals').select('id, title, status').ilike('title', likeQ).limit(4),
      ])

      const all: SearchResult[] = [
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
      setResults(all)
      setSelected(0)
      setLoading(false)
    },
    [supabase]
  )

  useEffect(() => {
    const debounce = setTimeout(() => search(query), 200)
    return () => clearTimeout(debounce)
  }, [query, search])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  function navigate(result: SearchResult) {
    const paths: Record<string, string> = {
      contact: `/contacts?selected=${result.id}`,
      company: `/companies?selected=${result.id}`,
      deal: `/pipeline?selected=${result.id}`,
    }
    router.push(paths[result.record_type])
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected])
    }
  }

  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.record_type]) acc[r.record_type] = []
      acc[r.record_type].push(r)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  let flatIndex = 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden" aria-label="Search">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            placeholder="Search contacts, companies, deals..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 p-0 h-auto text-base focus-visible:ring-0 shadow-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {query.length >= 2 && results.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
          {query.length < 2 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Type at least 2 characters to search
            </p>
          )}

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <p className="text-xs font-semibold text-muted-foreground px-4 py-1.5 uppercase tracking-wider">
                {labelMap[type as keyof typeof labelMap]}
              </p>
              {items.map((result) => {
                const Icon = iconMap[result.record_type]
                const idx = flatIndex++
                return (
                  <button
                    key={result.id}
                    onClick={() => navigate(result)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                      selected === idx ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    )}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
