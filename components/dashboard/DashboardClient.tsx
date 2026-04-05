'use client'

import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { formatCurrency, formatRelativeDate, cn } from '@/lib/utils'
import type { DashboardMetrics } from '@/lib/types/database.types'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'

interface DashboardClientProps {
  metrics: DashboardMetrics
  pipelineByStage: Array<{ name: string; color: string; count: number; value: number }>
  topDeals: Array<{
    id: string
    title: string
    value: number
    company?: { name: string } | null
    stage?: { name: string; color: string } | null
  }>
  recentActivities: Array<{
    id: string
    type: string
    title: string
    created_at: string
    contact?: { first_name: string; last_name: string } | null
  }>
  overdueCount: number
}

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  trend?: { value: number; label: string }
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-1 text-xs font-medium',
                  trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {trend.value >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(trend.value).toFixed(0)}% {trend.label}
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardClient({
  metrics,
  pipelineByStage,
  topDeals,
  recentActivities,
  overdueCount,
}: DashboardClientProps) {
  const wonDelta =
    metrics.dealsWonLastMonth > 0
      ? ((metrics.dealsWonThisMonth - metrics.dealsWonLastMonth) /
          metrics.dealsWonLastMonth) *
        100
      : metrics.dealsWonThisMonth > 0
      ? 100
      : 0

  const donutData = [
    { name: 'Won', value: metrics.closeRate },
    { name: 'Lost', value: 100 - metrics.closeRate },
  ]

  const activityTypeColor: Record<string, string> = {
    call: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    email: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    meeting: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    note: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    task: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your sales overview"
        actions={
          overdueCount > 0 ? (
            <Link href="/activities">
              <Button variant="outline" size="sm" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                <AlertCircle className="w-4 h-4" />
                {overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Open Pipeline"
          value={formatCurrency(metrics.totalOpenPipeline)}
          sub="Total open deal value"
          icon={DollarSign}
        />
        <MetricCard
          title="Weighted Pipeline"
          value={formatCurrency(metrics.weightedPipeline)}
          sub="Value × probability"
          icon={Target}
        />
        <MetricCard
          title="Deals Won (month)"
          value={String(metrics.dealsWonThisMonth)}
          icon={TrendingUp}
          trend={{ value: wonDelta, label: 'vs last month' }}
        />
        <MetricCard
          title="Revenue Won"
          value={formatCurrency(metrics.revenueWonThisMonth)}
          sub="This month"
          icon={DollarSign}
        />
        <MetricCard
          title="Avg Deal Size"
          value={formatCurrency(metrics.avgDealSize)}
          sub="Rolling 90 days"
          icon={DollarSign}
        />
        <MetricCard
          title="Close Rate"
          value={`${metrics.closeRate.toFixed(0)}%`}
          sub="Won / total closed, 90d"
          icon={Target}
        />
        <MetricCard
          title="Overdue Tasks"
          value={String(overdueCount)}
          sub="Require attention"
          icon={AlertCircle}
        />
        <MetricCard
          title="Activities (recent)"
          value={String(recentActivities.length)}
          sub="Your last 10"
          icon={Activity}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline by stage bar chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineByStage} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pipelineByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                No pipeline data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Close rate donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Close Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center -mt-4">
              <p className="text-3xl font-bold">{metrics.closeRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Win rate (90d)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top deals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Top Open Deals</CardTitle>
            <Link href="/pipeline">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {topDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No open deals</p>
            ) : (
              <div className="divide-y divide-border">
                {topDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {deal.company?.name ?? '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {deal.stage && (
                        <Badge
                          variant="outline"
                          className="text-xs hidden sm:flex"
                          style={{ borderColor: deal.stage.color, color: deal.stage.color }}
                        >
                          {deal.stage.name}
                        </Badge>
                      )}
                      <span className="text-sm font-semibold">{formatCurrency(deal.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent Activities</CardTitle>
            <Link href="/activities">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activities yet</p>
            ) : (
              <div className="divide-y divide-border">
                {recentActivities.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0',
                        activityTypeColor[a.type] ?? 'bg-gray-100 text-gray-700'
                      )}
                    >
                      {a.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{a.title}</p>
                      {a.contact && (
                        <p className="text-xs text-muted-foreground truncate">
                          {a.contact.first_name} {a.contact.last_name}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatRelativeDate(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
