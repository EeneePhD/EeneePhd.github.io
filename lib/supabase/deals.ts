import { createClient } from './server'
import type { Deal, DealWithRelations, PipelineStage, PipelineStageWithDeals } from '@/lib/types/database.types'

export async function getPipelines() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipelines')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getPipelineStages(pipelineId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data as PipelineStage[]
}

export async function getPipelineWithDeals(pipelineId: string): Promise<PipelineStageWithDeals[]> {
  const supabase = await createClient()

  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('order_index', { ascending: true })
  if (stagesError) throw stagesError

  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select(`
      *,
      contact:contacts(id,first_name,last_name,email),
      company:companies(id,name),
      owner:users(id,full_name,avatar_url)
    `)
    .in('stage_id', stages.map((s) => s.id))
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (dealsError) throw dealsError

  return stages.map((stage) => {
    const stageDeals = (deals ?? [])
      .filter((d) => d.stage_id === stage.id)
      .map((d) => ({
        ...d,
        days_in_stage: Math.floor(
          (Date.now() - new Date(d.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
      }))

    return {
      ...stage,
      deals: stageDeals as DealWithRelations[],
      totalValue: stageDeals.reduce((sum, d) => sum + d.value, 0),
      weightedValue: stageDeals.reduce(
        (sum, d) => sum + (d.value * d.probability) / 100,
        0
      ),
    }
  })
}

export async function getDeals(filters?: {
  status?: string
  owner_id?: string
  stage_id?: string
}) {
  const supabase = await createClient()
  let query = supabase
    .from('deals')
    .select(`
      *,
      stage:pipeline_stages(id,name,color),
      contact:contacts(id,first_name,last_name),
      company:companies(id,name),
      owner:users(id,full_name,avatar_url)
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id)
  if (filters?.stage_id) query = query.eq('stage_id', filters.stage_id)

  const { data, error } = await query
  if (error) throw error
  return data as DealWithRelations[]
}

export async function getDeal(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(`
      *,
      stage:pipeline_stages(id,name,color,pipeline_id),
      contact:contacts(id,first_name,last_name,email),
      company:companies(id,name),
      owner:users(id,full_name,avatar_url)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  const deal = data as DealWithRelations
  deal.days_in_stage = Math.floor(
    (Date.now() - new Date(deal.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  return deal
}

export async function createDeal(
  deal: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'stage_entered_at'>
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .insert(deal)
    .select()
    .single()
  if (error) throw error
  return data as Deal
}

export async function updateDeal(id: string, deal: Partial<Deal>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .update(deal)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Deal
}

export async function moveDealToStage(dealId: string, stageId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .update({ stage_id: stageId })
    .eq('id', dealId)
    .select()
    .single()
  if (error) throw error
  return data as Deal
}

export async function closeDealWon(dealId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .update({ status: 'won', probability: 100 })
    .eq('id', dealId)
    .select()
    .single()
  if (error) throw error
  return data as Deal
}

export async function closeDealLost(dealId: string, reason: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .update({ status: 'lost', probability: 0, lost_reason: reason })
    .eq('id', dealId)
    .select()
    .single()
  if (error) throw error
  return data as Deal
}

export async function deleteDeal(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('deals').delete().eq('id', id)
  if (error) throw error
}

export async function getDealActivities(dealId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activities')
    .select(`*, owner:users(id,full_name,avatar_url), contact:contacts(id,first_name,last_name)`)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
