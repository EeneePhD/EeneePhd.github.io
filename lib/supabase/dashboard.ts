import { createClient } from './server'
import type { DashboardMetrics } from '@/lib/types/database.types'

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [openDeals, wonThisMonth, wonLastMonth, wonLast90Days, overdueCount] =
    await Promise.all([
      supabase
        .from('deals')
        .select('value, probability')
        .eq('status', 'open'),
      supabase
        .from('deals')
        .select('value')
        .eq('status', 'won')
        .gte('updated_at', startOfMonth),
      supabase
        .from('deals')
        .select('value')
        .eq('status', 'won')
        .gte('updated_at', startOfLastMonth)
        .lte('updated_at', endOfLastMonth),
      supabase
        .from('deals')
        .select('value')
        .eq('status', 'won')
        .gte('updated_at', ninetyDaysAgo),
      supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'task')
        .eq('completed', false)
        .lt('due_at', now.toISOString()),
    ])

  const totalOpenPipeline =
    openDeals.data?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
  const weightedPipeline =
    openDeals.data?.reduce(
      (sum, d) => sum + ((d.value ?? 0) * (d.probability ?? 0)) / 100,
      0
    ) ?? 0

  const dealsWonThisMonth = wonThisMonth.data?.length ?? 0
  const dealsWonLastMonth = wonLastMonth.data?.length ?? 0
  const revenueWonThisMonth =
    wonThisMonth.data?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
  const avgDealSize =
    wonLast90Days.data && wonLast90Days.data.length > 0
      ? wonLast90Days.data.reduce((sum, d) => sum + (d.value ?? 0), 0) /
        wonLast90Days.data.length
      : 0

  // Close rate: won / (won + lost) in last 90 days
  const { data: closedDeals } = await supabase
    .from('deals')
    .select('status')
    .in('status', ['won', 'lost'])
    .gte('updated_at', ninetyDaysAgo)

  const wonCount = closedDeals?.filter((d) => d.status === 'won').length ?? 0
  const totalClosed = closedDeals?.length ?? 0
  const closeRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0

  return {
    totalOpenPipeline,
    weightedPipeline,
    dealsWonThisMonth,
    dealsWonLastMonth,
    revenueWonThisMonth,
    avgDealSize,
    closeRate,
    overdueTasksCount: overdueCount.count ?? 0,
  }
}

export async function getPipelineByStage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select(
      `*, deals!inner(id, value, probability, status)`
    )
    .order('order_index', { ascending: true })
  if (error) {
    // Fallback: stages without deals
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('order_index', { ascending: true })
    return (stages ?? []).map((s) => ({
      name: s.name,
      color: s.color,
      count: 0,
      value: 0,
    }))
  }
  return (data ?? []).map((stage) => {
    const openDeals = (stage.deals as Array<{id: string; value: number; probability: number; status: string}>).filter(
      (d) => d.status === 'open'
    )
    return {
      name: stage.name,
      color: stage.color,
      count: openDeals.length,
      value: openDeals.reduce((sum, d) => sum + d.value, 0),
    }
  })
}

export async function getTopOpenDeals(limit = 5) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('deals')
    .select(
      `*, company:companies(id,name), owner:users(id,full_name), stage:pipeline_stages(id,name,color)`
    )
    .eq('status', 'open')
    .order('value', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}
