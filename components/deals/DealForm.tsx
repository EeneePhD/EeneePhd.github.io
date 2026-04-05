'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { DealWithRelations } from '@/lib/types/database.types'

const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value: z.coerce.number().min(0, 'Value must be positive'),
  currency: z.string().default('USD'),
  stage_id: z.string().min(1, 'Stage is required'),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  owner_id: z.string().optional(),
  close_date: z.string().optional(),
  probability: z.coerce.number().min(0).max(100),
})

type DealFormValues = z.infer<typeof dealSchema>

interface DealFormProps {
  open: boolean
  onClose: () => void
  deal?: DealWithRelations | null
  defaultStageId?: string
  onSaved: () => void
}

export function DealForm({ open, onClose, deal, defaultStageId, onSaved }: DealFormProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [stages, setStages] = useState<Array<{ id: string; name: string }>>([])
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; full_name: string | null }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: { currency: 'USD', probability: 50 },
  })

  useEffect(() => {
    if (open) {
      Promise.all([
        supabase.from('pipeline_stages').select('id, name').order('order_index'),
        supabase.from('contacts').select('id, first_name, last_name').order('first_name').limit(100),
        supabase.from('companies').select('id, name').order('name').limit(100),
        supabase.from('users').select('id, full_name'),
      ]).then(([s, c, co, u]) => {
        setStages(s.data ?? [])
        setContacts(c.data ?? [])
        setCompanies(co.data ?? [])
        setUsers(u.data ?? [])
      })

      if (deal) {
        reset({
          title: deal.title,
          value: deal.value,
          currency: deal.currency,
          stage_id: deal.stage_id ?? '',
          contact_id: deal.contact_id ?? '',
          company_id: deal.company_id ?? '',
          owner_id: deal.owner_id ?? '',
          close_date: deal.close_date ?? '',
          probability: deal.probability,
        })
      } else {
        reset({
          currency: 'USD',
          probability: 50,
          stage_id: defaultStageId ?? '',
        })
      }
    }
  }, [open, deal, defaultStageId, supabase, reset])

  async function onSubmit(values: DealFormValues) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      ...values,
      contact_id: values.contact_id || null,
      company_id: values.company_id || null,
      owner_id: values.owner_id || user?.id,
      close_date: values.close_date || null,
    }

    const { error } = deal
      ? await supabase.from('deals').update(payload).eq('id', deal.id)
      : await supabase.from('deals').insert({ ...payload, status: 'open' })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: deal ? 'Deal updated' : 'Deal created' })
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deal ? 'Edit Deal' : 'Add Deal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Title *</Label>
            <Input {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="value">Value *</Label>
              <Input type="number" min={0} step={100} {...register('value')} />
              {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Input {...register('currency')} defaultValue="USD" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Stage *</Label>
            <Select value={watch('stage_id')} onValueChange={(v) => setValue('stage_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stage_id && <p className="text-xs text-destructive">{errors.stage_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Contact</Label>
              <Select value={watch('contact_id') ?? ''} onValueChange={(v) => setValue('contact_id', v)}>
                <SelectTrigger><SelectValue placeholder="Link contact" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No contact</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Company</Label>
              <Select value={watch('company_id') ?? ''} onValueChange={(v) => setValue('company_id', v)}>
                <SelectTrigger><SelectValue placeholder="Link company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input type="number" min={0} max={100} {...register('probability')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="close_date">Expected close date</Label>
              <Input type="date" {...register('close_date')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Owner</Label>
            <Select value={watch('owner_id') ?? ''} onValueChange={(v) => setValue('owner_id', v)}>
              <SelectTrigger><SelectValue placeholder="Assign owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {deal ? 'Save changes' : 'Create deal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
