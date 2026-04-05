'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { CompanyWithOwner } from '@/lib/types/database.types'

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  industry: z.string().optional(),
  employee_count: z.coerce.number().positive().optional().or(z.literal('')),
  annual_revenue: z.coerce.number().positive().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companySchema>

interface CompanyFormProps {
  open: boolean
  onClose: () => void
  company?: CompanyWithOwner | null
  onSaved: () => void
}

export function CompanyForm({ open, onClose, company, onSaved }: CompanyFormProps) {
  const supabase = createClient()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({ resolver: zodResolver(companySchema) })

  useEffect(() => {
    if (open) {
      if (company) {
        reset({
          name: company.name,
          website: company.website ?? '',
          industry: company.industry ?? '',
          employee_count: company.employee_count ?? '',
          annual_revenue: company.annual_revenue ?? '',
          address: company.address ?? '',
          city: company.city ?? '',
          state: company.state ?? '',
          country: company.country ?? '',
        })
      } else {
        reset({})
      }
    }
  }, [open, company, reset])

  async function onSubmit(values: CompanyFormValues) {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      name: values.name,
      website: values.website || null,
      industry: values.industry || null,
      employee_count: values.employee_count ? Number(values.employee_count) : null,
      annual_revenue: values.annual_revenue ? Number(values.annual_revenue) : null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      country: values.country || null,
      owner_id: user?.id,
    }

    const { error } = company
      ? await supabase.from('companies').update(payload).eq('id', company.id)
      : await supabase.from('companies').insert(payload)

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: company ? 'Company updated' : 'Company created' })
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? 'Edit Company' : 'Add Company'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Company name *</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="website">Website</Label>
              <Input {...register('website')} placeholder="https://..." />
              {errors.website && (
                <p className="text-xs text-destructive">{errors.website.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="industry">Industry</Label>
              <Input {...register('industry')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="employee_count">Employees</Label>
              <Input type="number" {...register('employee_count')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="annual_revenue">Annual revenue ($)</Label>
              <Input type="number" {...register('annual_revenue')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Address</Label>
            <Input {...register('address')} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input {...register('city')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="state">State</Label>
              <Input {...register('state')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="country">Country</Label>
              <Input {...register('country')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {company ? 'Save changes' : 'Create company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
