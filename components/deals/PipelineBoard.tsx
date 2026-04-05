'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DealForm } from './DealForm'
import { DealDetailPanel } from './DealDetailPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/lib/hooks/use-toast'
import { formatCurrency, getInitials, cn, getDaysInStage } from '@/lib/utils'
import { Plus, Kanban } from 'lucide-react'
import type { DealWithRelations, PipelineStageWithDeals } from '@/lib/types/database.types'

function DealCard({
  deal,
  onClick,
}: {
  deal: DealWithRelations
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const days = getDaysInStage(deal.stage_entered_at)
  const isStale = days > 14

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all select-none"
    >
      <p className="text-sm font-medium leading-snug mb-2">{deal.title}</p>
      {deal.company && (
        <p className="text-xs text-muted-foreground mb-2">{deal.company.name}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-primary">{formatCurrency(deal.value)}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded-full font-medium',
              isStale
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {days}d
          </span>
          {deal.owner && (
            <Avatar className="w-5 h-5">
              <AvatarImage src={deal.owner.avatar_url ?? undefined} />
              <AvatarFallback className="text-[9px]">
                {getInitials(deal.owner.full_name ?? '?')}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{deal.probability}% probability</span>
        <span className="text-xs text-muted-foreground">
          {formatCurrency((deal.value * deal.probability) / 100)} weighted
        </span>
      </div>
    </div>
  )
}

function StageColumn({
  stage,
  onDealClick,
  onAddDeal,
}: {
  stage: PipelineStageWithDeals
  onDealClick: (id: string) => void
  onAddDeal: (stageId: string) => void
}) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[280px] bg-muted/30 rounded-lg border border-border">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="font-medium text-sm">{stage.name}</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {stage.deals.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={() => onAddDeal(stage.id)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(stage.totalValue)} total •{' '}
          <span className="text-foreground">{formatCurrency(stage.weightedValue)}</span> weighted
        </div>
      </div>

      {/* Cards */}
      <SortableContext items={stage.deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 min-h-[100px]">
          {stage.deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onDealClick(deal.id)} />
          ))}
          {stage.deals.length === 0 && (
            <div
              className="h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onAddDeal(stage.id)}
            >
              <span className="text-xs text-muted-foreground">Drop here or click +</span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export function PipelineBoard() {
  const supabase = createClient()
  const { toast } = useToast()
  const [pipelines, setPipelines] = useState<Array<{ id: string; name: string }>>([])
  const [activePipelineId, setActivePipelineId] = useState<string>('')
  const [stages, setStages] = useState<PipelineStageWithDeals[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDrag, setActiveDrag] = useState<DealWithRelations | null>(null)
  const [dealFormOpen, setDealFormOpen] = useState(false)
  const [defaultStageId, setDefaultStageId] = useState<string>()
  const [editDeal, setEditDeal] = useState<DealWithRelations | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loadBoard = useCallback(async () => {
    if (!activePipelineId) return
    setLoading(true)
    const { data: stageData } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('pipeline_id', activePipelineId)
      .order('order_index')

    if (!stageData) { setLoading(false); return }

    const { data: deals } = await supabase
      .from('deals')
      .select(`*, contact:contacts(id,first_name,last_name), company:companies(id,name), owner:users(id,full_name,avatar_url), stage:pipeline_stages(id,name,color)`)
      .in('stage_id', stageData.map((s) => s.id))
      .eq('status', 'open')

    const built = stageData.map((stage) => {
      const stageDeals = (deals ?? [])
        .filter((d) => d.stage_id === stage.id)
        .map((d) => ({ ...d, days_in_stage: getDaysInStage(d.stage_entered_at) })) as DealWithRelations[]
      return {
        ...stage,
        deals: stageDeals,
        totalValue: stageDeals.reduce((s, d) => s + d.value, 0),
        weightedValue: stageDeals.reduce((s, d) => s + (d.value * d.probability) / 100, 0),
      }
    })
    setStages(built)
    setLoading(false)
  }, [activePipelineId, supabase])

  useEffect(() => {
    supabase.from('pipelines').select('id, name').order('created_at').then(({ data }) => {
      if (data?.length) {
        setPipelines(data)
        setActivePipelineId(data[0].id)
      }
    })
  }, [supabase])

  useEffect(() => { loadBoard() }, [loadBoard])

  function findStageByDealId(dealId: string): PipelineStageWithDeals | undefined {
    return stages.find((s) => s.deals.some((d) => d.id === dealId))
  }

  function handleDragStart(event: DragStartEvent) {
    const stage = findStageByDealId(event.active.id as string)
    const deal = stage?.deals.find((d) => d.id === event.active.id)
    setActiveDrag(deal ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const fromStage = findStageByDealId(active.id as string)
    const toStage =
      stages.find((s) => s.id === over.id) ?? findStageByDealId(over.id as string)
    if (!fromStage || !toStage || fromStage.id === toStage.id) return

    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === fromStage.id) {
          return { ...stage, deals: stage.deals.filter((d) => d.id !== active.id) }
        }
        if (stage.id === toStage.id) {
          const deal = fromStage.deals.find((d) => d.id === active.id)!
          return { ...stage, deals: [...stage.deals, deal] }
        }
        return stage
      })
    )
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDrag(null)
    if (!over) return

    const toStage =
      stages.find((s) => s.id === over.id) ?? findStageByDealId(over.id as string)
    if (!toStage) return

    const { error } = await supabase
      .from('deals')
      .update({ stage_id: toStage.id })
      .eq('id', active.id as string)

    if (error) {
      toast({ title: 'Error moving deal', variant: 'destructive' })
      loadBoard()
    } else {
      // Recalculate totals
      setStages((prev) =>
        prev.map((stage) => ({
          ...stage,
          totalValue: stage.deals.reduce((s, d) => s + d.value, 0),
          weightedValue: stage.deals.reduce((s, d) => s + (d.value * d.probability) / 100, 0),
        }))
      )
    }
  }

  const allDeals = stages.flatMap((s) => s.deals)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pipeline"
        description="Drag deals between stages"
        actions={
          <div className="flex items-center gap-2">
            {pipelines.length > 1 && (
              <Select value={activePipelineId} onValueChange={setActivePipelineId}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => { setEditDeal(null); setDefaultStageId(undefined); setDealFormOpen(true) }}>
              <Plus className="w-4 h-4" /> Add deal
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="min-w-[260px]">
              <Skeleton className="h-16 rounded-t-lg" />
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-24 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : stages.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="No pipeline stages"
          description="Create pipeline stages in Settings to get started."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                onDealClick={(id) => setDetailId(id)}
                onAddDeal={(stageId) => {
                  setEditDeal(null)
                  setDefaultStageId(stageId)
                  setDealFormOpen(true)
                }}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDrag && (
              <div className="bg-card border border-primary rounded-lg p-3 shadow-xl w-64 rotate-2 opacity-95">
                <p className="text-sm font-medium">{activeDrag.title}</p>
                <p className="text-sm font-semibold text-primary mt-1">
                  {formatCurrency(activeDrag.value)}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <DealForm
        open={dealFormOpen}
        onClose={() => setDealFormOpen(false)}
        deal={editDeal}
        defaultStageId={defaultStageId}
        onSaved={loadBoard}
      />

      <DealDetailPanel
        dealId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          const deal = allDeals.find((d) => d.id === detailId)
          if (deal) { setEditDeal(deal); setDetailId(null); setDealFormOpen(true) }
        }}
        onRefresh={loadBoard}
      />
    </div>
  )
}
