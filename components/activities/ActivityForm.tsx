'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const activitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  title: z.string().min(1, 'Title is required'),
  body: z.string().optional(),
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  due_at: z.string().optional(),
  completed: z.boolean().default(false),
  outcome: z.string().optional(),
})

type ActivityFormValues = z.infer<typeof activitySchema>

interface ActivityFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultContactId?: string
  defaultDealId?: string
  activity?: Record<string, unknown> | null
}

export function ActivityForm({
  open,
  onClose,
  onSaved,
  defaultContactId,
  defaultDealId,
  activity,
}: ActivityFormProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [deals, setDeals] = useState<Array<{ id: string; title: string }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: 'call', completed: false },
  })

  useEffect(() => {
    if (open) {
      supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .order('first_name')
        .limit(100)
        .then(({ data }) => setContacts(data ?? []))
      supabase
        .from('deals')
        .select('id, title')
        .eq('status', 'open')
        .order('title')
        .limit(100)
        .then(({ data }) => setDeals(data ?? []))

      if (activity) {
        reset({
          type: activity.type as ActivityFormValues['type'],
          title: activity.title as string,
          body: (activity.body as string) ?? '',
          contact_id: (activity.contact_id as string) ?? '',
          deal_id: (activity.deal_id as string) ?? '',
          due_at: activity.due_at
            ? new Date(activity.due_at as string).toISOString().slice(0, 16)
            : '',
          completed: activity.completed as boolean,
          outcome: (activity.outcome as string) ?? '',
        })
      } else {
        reset({
          type: 'call',
          completed: false,
          contact_id: defaultContactId ?? '',
          deal_id: defaultDealId ?? '',
        })
      }
    }
  }, [open, activity, defaultContactId, defaultDealId, supabase, reset])

  async function onSubmit(values: ActivityFormValues) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      ...values,
      body: values.body || null,
      contact_id: values.contact_id || null,
      deal_id: values.deal_id || null,
      due_at: values.due_at || null,
      outcome: values.outcome || null,
      owner_id: user?.id,
      completed_at: values.completed ? new Date().toISOString() : null,
    }

    const { error } = activity
      ? await supabase.from('activities').update(payload).eq('id', activity.id as string)
      : await supabase.from('activities').insert(payload)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: activity ? 'Activity updated' : 'Activity created' })
    onSaved()
    onClose()
  }

  const activityType = watch('type')

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{activity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label>Type *</Label>
            <Select value={activityType} onValueChange={(v) => setValue('type', v as ActivityFormValues['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="task">Task</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="title">Title *</Label>
            <Input {...register('title')} placeholder="Activity title..." />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="body">Description</Label>
            <Textarea {...register('body')} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact</Label>
              <Select
                value={watch('contact_id') ?? ''}
                onValueChange={(v) => setValue('contact_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No contact</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Deal</Label>
              <Select
                value={watch('deal_id') ?? ''}
                onValueChange={(v) => setValue('deal_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No deal</SelectItem>
                  {deals.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="due_at">Due date</Label>
            <Input type="datetime-local" {...register('due_at')} />
          </div>

          {activityType === 'call' && (
            <div className="space-y-1">
              <Label htmlFor="outcome">Outcome</Label>
              <Input {...register('outcome')} placeholder="Call outcome..." />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="completed"
              checked={watch('completed')}
              onCheckedChange={(v) => setValue('completed', v as boolean)}
            />
            <Label htmlFor="completed" className="font-normal cursor-pointer">
              Mark as completed
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {activity ? 'Save changes' : 'Create activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
