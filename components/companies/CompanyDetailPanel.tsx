'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Globe, Users, Building2 } from 'lucide-react'
import type { CompanyWithOwner } from '@/lib/types/database.types'

interface CompanyDetailPanelProps {
  companyId: string | null
  onClose: () => void
  onEdit: () => void
}

export function CompanyDetailPanel({ companyId, onClose, onEdit }: CompanyDetailPanelProps) {
  const supabase = createClient()
  const [company, setCompany] = useState<CompanyWithOwner | null>(null)
  const [contacts, setContacts] = useState<Array<Record<string, unknown>>>([])
  const [deals, setDeals] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    const [{ data: c }, { data: cts }, { data: dls }] = await Promise.all([
      supabase
        .from('companies')
        .select('*, owner:users(id,full_name,avatar_url)')
        .eq('id', companyId)
        .single(),
      supabase
        .from('contacts')
        .select('id, first_name, last_name, email, status, lead_score')
        .eq('company_id', companyId)
        .order('first_name'),
      supabase
        .from('deals')
        .select('id, title, value, status, stage:pipeline_stages(id,name,color)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
    ])
    setCompany(c as CompanyWithOwner)
    setContacts(cts ?? [])
    setDeals(dls ?? [])
    setLoading(false)
  }, [companyId, supabase])

  useEffect(() => { load() }, [load])

  const statusColors: Record<string, string> = {
    lead: 'bg-blue-100 text-blue-700',
    prospect: 'bg-yellow-100 text-yellow-700',
    customer: 'bg-green-100 text-green-700',
    churned: 'bg-gray-100 text-gray-600',
  }

  return (
    <Sheet open={!!companyId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {loading || !company ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl">{company.name}</SheetTitle>
                    {company.industry && (
                      <p className="text-sm text-muted-foreground">{company.industry}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
              </div>
            </SheetHeader>

            <Separator className="mt-4" />

            <div className="p-6 pt-4 space-y-3">
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  {company.website}
                </a>
              )}
              {company.employee_count && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {company.employee_count.toLocaleString()} employees
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                {company.annual_revenue && (
                  <div>
                    <p className="text-muted-foreground text-xs">Annual revenue</p>
                    <p>{formatCurrency(company.annual_revenue)}</p>
                  </div>
                )}
                {(company.city || company.country) && (
                  <div>
                    <p className="text-muted-foreground text-xs">Location</p>
                    <p>{[company.city, company.state, company.country].filter(Boolean).join(', ')}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">Owner</p>
                  <p>{company.owner?.full_name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Created</p>
                  <p>{formatDate(company.created_at)}</p>
                </div>
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="contacts" className="p-6 pt-3">
              <TabsList>
                <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
                <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="contacts" className="mt-4">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No contacts</p>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((c: Record<string, unknown>) => (
                      <div
                        key={c.id as string}
                        className="flex items-center justify-between p-3 rounded-lg border border-border"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {c.first_name as string} {c.last_name as string}
                          </p>
                          <p className="text-xs text-muted-foreground">{c.email as string ?? '—'}</p>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[c.status as string] ?? ''}`}
                        >
                          {c.status as string}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="deals" className="mt-4">
                {deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No deals</p>
                ) : (
                  <div className="space-y-2">
                    {deals.map((d: Record<string, unknown>) => {
                      const stage = d.stage as { name: string; color: string } | null
                      return (
                        <div
                          key={d.id as string}
                          className="flex items-center justify-between p-3 rounded-lg border border-border"
                        >
                          <div>
                            <p className="text-sm font-medium">{d.title as string}</p>
                            {stage && (
                              <Badge
                                variant="outline"
                                className="text-xs mt-1"
                                style={{ borderColor: stage.color, color: stage.color }}
                              >
                                {stage.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-semibold">{formatCurrency(d.value as number)}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
