import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics, getPipelineByStage, getTopOpenDeals } from '@/lib/supabase/dashboard'
import { getUserRecentActivities, getOverdueTasksCount } from '@/lib/supabase/activities'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { Skeleton } from '@/components/ui/skeleton'
import { redirect } from 'next/navigation'

async function DashboardData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [metrics, pipelineByStage, topDeals, recentActivities, overdueCount] =
    await Promise.all([
      getDashboardMetrics(user.id),
      getPipelineByStage(),
      getTopOpenDeals(5),
      getUserRecentActivities(user.id, 10),
      getOverdueTasksCount(user.id),
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
