'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { ContactWithRelations } from '@/lib/types/database.types'

const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  company_id: z.string().optional(),
  owner_id: z.string().optional(),
  lead_source: z.enum(['cold_call', 'referral', 'inbound', 'outbound']).optional(),
  status: z.enum(['lead', 'prospect', 'customer', 'churned']),
  lead_score: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactSchema>

interface ContactFormProps {
  open: boolean
  onClose: () => void
  contact?: ContactWithRelations | null
  onSaved: () => void
}

export function ContactForm({ open, onClose, contact, onSaved }: ContactFormProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; full_name: string | null }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      status: 'lead',
      lead_score: 0,
    },
  })

  useEffect(() => {
    if (open) {
      supabase.from('companies').select('id, name').order('name').then(({ data }) => {
        setCompanies(data ?? [])
      })
      supabase.from('users').select('id, full_name').then(({ data }) => {
        setUsers(data ?? [])
      })

      if (contact) {
        reset({
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          company_id: contact.company_id ?? '',
          owner_id: contact.owner_id ?? '',
          lead_source: contact.lead_source ?? undefined,
          status: contact.status,
          lead_score: contact.lead_score,
          notes: contact.notes ?? '',
        })
      } else {
        reset({ status: 'lead', lead_score: 0 })
      }
    }
  }, [open, contact, supabase, reset])

  async function onSubmit(values: ContactFormValues) {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const payload = {
      ...values,
      email: values.email || null,
      phone: values.phone || null,
      company_id: values.company_id || null,
      // Default to current user so RLS owner_id = auth.uid() check passes
      owner_id: values.owner_id || authUser?.id || null,
      notes: values.notes || null,
    }

    const { error } = contact
      ? await supabase.from('contacts').update(payload).eq('id', contact.id)
      : await supabase.from('contacts').insert(payload)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: contact ? 'Contact updated' : 'Contact created' })
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="first_name">First name *</Label>
              <Input {...register('first_name')} />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Last name *</Label>
              <Input {...register('last_name')} />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input {...register('phone')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Company</Label>
              <Select
                value={watch('company_id') || '__none__'}
                onValueChange={(v) => setValue('company_id', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No company</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Owner</Label>
              <Select
                value={watch('owner_id') || '__none__'}
                onValueChange={(v) => setValue('owner_id', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name ?? u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select value={watch('status')} onValueChange={(v) => setValue('status', v as ContactFormValues['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Lead source</Label>
              <Select
                value={watch('lead_source') ?? '__none__'}
                onValueChange={(v) => setValue('lead_source', v === '__none__' ? undefined : v as ContactFormValues['lead_source'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Unknown</SelectItem>
                  <SelectItem value="cold_call">Cold call</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="lead_score">Lead score (0–100)</Label>
            <Input type="number" min={0} max={100} {...register('lead_score')} />
            {errors.lead_score && (
              <p className="text-xs text-destructive">{errors.lead_score.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register('notes')} rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {contact ? 'Save changes' : 'Create contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
