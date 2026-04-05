import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics, getPipelineByStage, getTopOpenDeals } from '@/lib/supabase/dashboard'
import { getUserRecentActivities, getOverdueTasksCount } from '@/lib/supabase/activities'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { Skeleton } from '@/components/ui/skeleton'
import { redirect } from 'next/navigation'
import type { DashboardMetrics } from '@/lib/types/database.types'

const EMPTY_METRICS: DashboardMetrics = {
  totalOpenPipeline: 0,
  weightedPipeline: 0,
  dealsWonThisMonth: 0,
  dealsWonLastMonth: 0,
  revenueWonThisMonth: 0,
  avgDealSize: 0,
  closeRate: 0,
  overdueTasksCount: 0,
}

async function DashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    const [metrics, pipelineByStage, topDeals, recentActivities, overdueCount] =
      await Promise.all([
        getDashboardMetrics(user.id).catch(() => EMPTY_METRICS),
        getPipelineByStage().catch(() => []),
        getTopOpenDeals(5).catch(() => []),
        getUserRecentActivities(user.id, 10).catch(() => []),
        getOverdueTasksCount(user.id).catch(() => 0),
      ])

    return (
      <DashboardClient
        metrics={metrics}
        pipelineByStage={pipelineByStage}
        topDeals={topDeals ?? []}
        recentActivities={recentActivities ?? []}
        overdueCount={overdueCount}
      />
    )
  } catch {
    return (
      <DashboardClient
        metrics={EMPTY_METRICS}
        pipelineByStage={[]}
        topDeals={[]}
        recentActivities={[]}
        overdueCount={0}
      />
    )
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  )
}
