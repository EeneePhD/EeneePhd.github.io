'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeadScoreBadge } from './LeadScoreBadge'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { formatDate, formatRelativeDate, formatCurrency, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone, Mail, Building2, Plus, CheckCircle2, Circle } from 'lucide-react'
import type { ContactWithRelations } from '@/lib/types/database.types'

interface ContactDetailPanelProps {
  contactId: string | null
  onClose: () => void
  onEdit: () => void
}

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700',
  churned: 'bg-gray-100 text-gray-600',
}

export function ContactDetailPanel({ contactId, onClose, onEdit }: ContactDetailPanelProps) {
  const supabase = createClient()
  const [contact, setContact] = useState<ContactWithRelations | null>(null)
  const [activities, setActivities] = useState<Array<Record<string, unknown>>>([])
  const [deals, setDeals] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)
  const [activityFormOpen, setActivityFormOpen] = useState(false)

  const loadContact = useCallback(async () => {
    if (!contactId) return
    setLoading(true)
    const [{ data: c }, { data: acts }, { data: dls }] = await Promise.all([
      supabase
        .from('contacts')
        .select('*, company:companies(*), owner:users(id,full_name,avatar_url)')
        .eq('id', contactId)
        .single(),
      supabase
        .from('activities')
        .select('*, owner:users(id,full_name), deal:deals(id,title)')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false }),
      supabase
        .from('deals')
        .select('*, stage:pipeline_stages(id,name,color), company:companies(id,name)')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false }),
    ])
    setContact(c as ContactWithRelations)
    setActivities(acts ?? [])
    setDeals(dls ?? [])
    setLoading(false)
  }, [contactId, supabase])

  useEffect(() => {
    loadContact()
  }, [loadContact])

  const activityTypeColor: Record<string, string> = {
    call: 'text-blue-600',
    email: 'text-purple-600',
    meeting: 'text-green-600',
    note: 'text-gray-500',
    task: 'text-orange-600',
  }

  return (
    <>
      <Sheet open={!!contactId} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {loading || !contact ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              <SheetHeader className="p-6 pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback>
                        {getInitials(`${contact.first_name} ${contact.last_name}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-xl">
                        {contact.first_name} {contact.last_name}
                      </SheetTitle>
                      {contact.company && (
                        <p className="text-sm text-muted-foreground">{contact.company.name}</p>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={onEdit}>
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[contact.status] ?? ''}`}
                  >
                    {contact.status}
                  </span>
                  <LeadScoreBadge score={contact.lead_score} />
                  {contact.lead_source && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {contact.lead_source.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <Separator className="mt-4" />

              <div className="p-6 pt-4 space-y-3">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {contact.phone}
                  </a>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {contact.company.name}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Owner</p>
                    <p>{contact.owner?.full_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Last contacted</p>
                    <p>{formatRelativeDate(contact.last_contacted_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Created</p>
                    <p>{formatDate(contact.created_at)}</p>
                  </div>
                </div>
                {contact.notes && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">{contact.notes}</div>
                )}
              </div>

              <Separator />

              <Tabs defaultValue="activities" className="p-6 pt-3">
                <TabsList>
                  <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
                  <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="activities" className="mt-4">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => setActivityFormOpen(true)}>
                      <Plus className="w-4 h-4" /> Add activity
                    </Button>
                  </div>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No activities yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((a: Record<string, unknown>) => (
                        <div key={a.id as string} className="flex gap-3">
                          <div className="mt-0.5">
                            {a.completed ? (
                              <CheckCircle2 className={`w-4 h-4 ${activityTypeColor[a.type as string] ?? 'text-gray-500'}`} />
                            ) : (
                              <Circle className={`w-4 h-4 ${activityTypeColor[a.type as string] ?? 'text-gray-500'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{a.title as string}</p>
                              <span className="text-xs text-muted-foreground capitalize">
                                ({a.type as string})
                              </span>
                            </div>
                            {a.body ? (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {String(a.body)}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatRelativeDate(a.created_at as string)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="deals" className="mt-4">
                  {deals.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No deals yet</p>
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
                            <p className="text-sm font-semibold">
                              {formatCurrency(d.value as number)}
                            </p>
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

      <ActivityForm
        open={activityFormOpen}
        onClose={() => setActivityFormOpen(false)}
        defaultContactId={contactId ?? undefined}
        onSaved={() => {
          loadContact()
          setActivityFormOpen(false)
        }}
      />
    </>
  )
}
