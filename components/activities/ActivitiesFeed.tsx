'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { ActivityForm } from './ActivityForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/lib/hooks/use-toast'
import { formatDate, formatRelativeDate, cn } from '@/lib/utils'
import { Activity, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ActivityWithRelations } from '@/lib/types/database.types'

const typeColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  email: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  meeting: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  note: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  task: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

function getTaskRowClass(activity: ActivityWithRelations): string {
  if (activity.type !== 'task' || activity.completed) return ''
  if (!activity.due_at) return ''
  const due = new Date(activity.due_at)
  const now = new Date()
  if (due < now) return 'border-l-2 border-red-400 bg-red-50/50 dark:bg-red-900/10'
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (due <= tomorrow) return 'border-l-2 border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10'
  return ''
}

export function ActivitiesFeed() {
  const supabase = createClient()
  const { toast } = useToast()
  const [activities, setActivities] = useState<ActivityWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [typeFilter, setTypeFilter] = useState('')
  const [completedFilter, setCompletedFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<ActivityWithRelations | null>(null)
  const pageSize = 50

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('activities')
      .select(
        '*, owner:users(id,full_name,avatar_url), contact:contacts(id,first_name,last_name), deal:deals(id,title)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (typeFilter) query = query.eq('type', typeFilter)
    if (completedFilter === 'true') query = query.eq('completed', true)
    if (completedFilter === 'false') query = query.eq('completed', false)
    if (dateFrom) query = query.gte('due_at', dateFrom)
    if (dateTo) query = query.lte('due_at', dateTo + 'T23:59:59')

    const { data, count, error } = await query
    if (!error) {
      setActivities((data ?? []) as ActivityWithRelations[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [supabase, page, typeFilter, completedFilter, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  async function handleComplete(id: string) {
    const { error } = await supabase
      .from('activities')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast({ title: 'Error', variant: 'destructive' }); return }
    toast({ title: 'Activity marked complete' })
    load()
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) { toast({ title: 'Error', variant: 'destructive' }); return }
    toast({ title: 'Activity deleted' })
    load()
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activities"
        description={`${total} total activities`}
        actions={
          <Button onClick={() => { setEditActivity(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4" /> Add activity
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="task">Task</SelectItem>
          </SelectContent>
        </Select>

        <Select value={completedFilter} onValueChange={(v) => { setCompletedFilter(v === 'all' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="false">Incomplete</SelectItem>
            <SelectItem value="true">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-40"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
          placeholder="From date"
        />
        <Input
          type="date"
          className="w-40"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
          placeholder="To date"
        />
      </div>

      {/* Feed */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : activities.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No activities found"
            description="Log your first activity to track interactions with contacts and deals."
            action={{ label: 'Add activity', onClick: () => { setEditActivity(null); setFormOpen(true) } }}
          />
        ) : (
          activities.map((a) => (
            <div
              key={a.id}
              className={cn(
                'flex gap-4 p-4 bg-card border border-border rounded-lg hover:shadow-sm transition-shadow',
                getTaskRowClass(a)
              )}
            >
              {/* Complete checkbox for tasks */}
              {a.type === 'task' && !a.completed && (
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={false}
                  onCheckedChange={() => handleComplete(a.id)}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                        typeColors[a.type] ?? ''
                      )}
                    >
                      {a.type}
                    </span>
                    <p className={cn('text-sm font-medium', a.completed && 'line-through text-muted-foreground')}>
                      {a.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(a.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => { setEditActivity(a); setFormOpen(true) }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(a.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {a.body && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{a.body}</p>
                )}

                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  {a.contact && (
                    <span>
                      Contact: {a.contact.first_name} {a.contact.last_name}
                    </span>
                  )}
                  {a.deal && <span>Deal: {a.deal.title}</span>}
                  {a.due_at && (
                    <span className={cn(
                      !a.completed && new Date(a.due_at) < new Date() ? 'text-red-600 font-medium' : ''
                    )}>
                      Due: {formatDate(a.due_at)}
                    </span>
                  )}
                  {a.owner && <span>Owner: {a.owner.full_name}</span>}
                  {a.completed && a.completed_at && (
                    <span className="text-green-600">Completed {formatRelativeDate(a.completed_at)}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <ActivityForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        activity={editActivity as Record<string, unknown> | null}
        onSaved={load}
      />
    </div>
  )
}
