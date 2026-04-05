'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { formatCurrency, formatDate, formatRelativeDate, getDaysInStage, cn } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import { CheckCircle2, Circle, Plus, Trophy, XCircle } from 'lucide-react'
import type { DealWithRelations } from '@/lib/types/database.types'

interface DealDetailPanelProps {
  dealId: string | null
  onClose: () => void
  onEdit: () => void
  onRefresh: () => void
}

export function DealDetailPanel({ dealId, onClose, onEdit, onRefresh }: DealDetailPanelProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [deal, setDeal] = useState<DealWithRelations | null>(null)
  const [activities, setActivities] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)
  const [activityFormOpen, setActivityFormOpen] = useState(false)
  const [wonConfirmOpen, setWonConfirmOpen] = useState(false)
  const [lostConfirmOpen, setLostConfirmOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')

  const load = useCallback(async () => {
    if (!dealId) return
    setLoading(true)
    const [{ data: d }, { data: acts }] = await Promise.all([
      supabase
        .from('deals')
        .select(`*, stage:pipeline_stages(id,name,color), contact:contacts(id,first_name,last_name,email), company:companies(id,name), owner:users(id,full_name,avatar_url)`)
        .eq('id', dealId)
        .single(),
      supabase
        .from('activities')
        .select('*, owner:users(id,full_name), contact:contacts(id,first_name,last_name)')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false }),
    ])
    if (d) {
      const deal = d as DealWithRelations
      deal.days_in_stage = getDaysInStage(deal.stage_entered_at)
      setDeal(deal)
    }
    setActivities(acts ?? [])
    setLoading(false)
  }, [dealId, supabase])

  useEffect(() => { load() }, [load])

  async function handleMarkWon() {
    if (!dealId) return
    const { error } = await supabase
      .from('deals')
      .update({ status: 'won', probability: 100 })
      .eq('id', dealId)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Deal marked as won!' })
    setWonConfirmOpen(false)
    onRefresh()
    load()
  }

  async function handleMarkLost() {
    if (!dealId || !lostReason.trim()) return
    const { error } = await supabase
      .from('deals')
      .update({ status: 'lost', probability: 0, lost_reason: lostReason })
      .eq('id', dealId)
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Deal marked as lost' })
    setLostConfirmOpen(false)
    setLostReason('')
    onRefresh()
    load()
  }

  const activityTypeColor: Record<string, string> = {
    call: 'text-blue-600', email: 'text-purple-600', meeting: 'text-green-600',
    note: 'text-gray-500', task: 'text-orange-600',
  }

  return (
    <>
      <Sheet open={!!dealId} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          {loading || !deal ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              <SheetHeader className="p-6 pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <SheetTitle className="text-xl">{deal.title}</SheetTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {deal.company?.name ?? deal.contact ? `${deal.contact?.first_name} ${deal.contact?.last_name}` : '—'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xl font-bold">{formatCurrency(deal.value)}</span>
                  {deal.stage && (
                    <Badge
                      variant="outline"
                      style={{ borderColor: deal.stage.color, color: deal.stage.color }}
                    >
                      {deal.stage.name}
                    </Badge>
                  )}
                  <Badge
                    variant={deal.status === 'won' ? 'default' : deal.status === 'lost' ? 'destructive' : 'secondary'}
                    className="capitalize"
                  >
                    {deal.status}
                  </Badge>
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      deal.days_in_stage > 14
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {deal.days_in_stage}d in stage
                  </span>
                </div>
                {deal.status === 'open' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                      onClick={() => setWonConfirmOpen(true)}
                    >
                      <Trophy className="w-3 h-3" /> Mark Won
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setLostConfirmOpen(true)}
                    >
                      <XCircle className="w-3 h-3" /> Mark Lost
                    </Button>
                  </div>
                )}
              </SheetHeader>

              <Separator className="mt-4" />

              <div className="p-6 pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Probability</p>
                    <p>{deal.probability}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Close date</p>
                    <p>{deal.close_date ? formatDate(deal.close_date) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Contact</p>
                    <p>{deal.contact ? `${deal.contact.first_name} ${deal.contact.last_name}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Owner</p>
                    <p>{deal.owner?.full_name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Created</p>
                    <p>{formatDate(deal.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Weighted value</p>
                    <p>{formatCurrency((deal.value * deal.probability) / 100)}</p>
                  </div>
                </div>
                {deal.lost_reason && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-md text-sm text-red-700 dark:text-red-400">
                    <strong>Lost reason:</strong> {deal.lost_reason}
                  </div>
                )}
              </div>

              <Separator />

              <Tabs defaultValue="activities" className="p-6 pt-3">
                <TabsList>
                  <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="activities" className="mt-4">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" onClick={() => setActivityFormOpen(true)}>
                      <Plus className="w-4 h-4" /> Add activity
                    </Button>
                  </div>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No activities yet</p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map((a: Record<string, unknown>) => (
                        <div key={a.id as string} className="flex gap-3">
                          <div className="mt-0.5">
                            {a.completed
                              ? <CheckCircle2 className={`w-4 h-4 ${activityTypeColor[a.type as string] ?? ''}`} />
                              : <Circle className={`w-4 h-4 ${activityTypeColor[a.type as string] ?? ''}`} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{a.title as string}</p>
                            {a.body ? <p className="text-xs text-muted-foreground truncate">{String(a.body)}</p> : null}
                            <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeDate(a.created_at as string)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Won confirmation */}
      <Dialog open={wonConfirmOpen} onOpenChange={setWonConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark deal as won?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will move the deal to &ldquo;Won&rdquo; status and set probability to 100%.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWonConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkWon} className="bg-green-600 hover:bg-green-700">
              <Trophy className="w-4 h-4" /> Confirm Won
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost confirmation */}
      <Dialog open={lostConfirmOpen} onOpenChange={setLostConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark deal as lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lost_reason">Reason for losing *</Label>
            <Textarea
              id="lost_reason"
              placeholder="e.g. Chose competitor, budget cut, timing..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleMarkLost}
              disabled={!lostReason.trim()}
            >
              <XCircle className="w-4 h-4" /> Confirm Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActivityForm
        open={activityFormOpen}
        onClose={() => setActivityFormOpen(false)}
        defaultDealId={dealId ?? undefined}
        onSaved={() => { load(); setActivityFormOpen(false) }}
      />
    </>
  )
}
