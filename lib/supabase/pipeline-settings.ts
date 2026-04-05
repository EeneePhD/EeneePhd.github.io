import { createClient } from './server'
import type { PipelineStage } from '@/lib/types/database.types'

export async function updatePipelineStage(id: string, updates: Partial<PipelineStage>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as PipelineStage
}

export async function createPipelineStage(stage: Omit<PipelineStage, 'id' | 'created_at'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .insert(stage)
    .select()
    .single()
  if (error) throw error
  return data as PipelineStage
}

export async function deletePipelineStage(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
  if (error) throw error
}

export async function reorderPipelineStages(stages: { id: string; order_index: number }[]) {
  const supabase = await createClient()
  const updates = stages.map(({ id, order_index }) =>
    supabase.from('pipeline_stages').update({ order_index }).eq('id', id)
  )
  await Promise.all(updates)
}
