'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { LeadScoreBadge } from './LeadScoreBadge'
import { ContactForm } from './ContactForm'
import { ContactDetailPanel } from './ContactDetailPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/lib/hooks/use-toast'
import { formatRelativeDate } from '@/lib/utils'
import { Users, Plus, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trash2, UserCheck } from 'lucide-react'
import type { ContactWithRelations } from '@/lib/types/database.types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const statusColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  prospect: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  customer: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  churned: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

export function ContactsTable() {
  const supabase = createClient()
  const { toast } = useToast()
  const [contacts, setContacts] = useState<ContactWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editContact, setEditContact] = useState<ContactWithRelations | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const pageSize = 50

  const loadContacts = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('contacts')
      .select('*, company:companies(id,name), owner:users(id,full_name,avatar_url)', {
        count: 'exact',
      })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }
    if (statusFilter) query = query.eq('status', statusFilter)
    if (sourceFilter) query = query.eq('lead_source', sourceFilter)

    if (sorting.length > 0) {
      query = query.order(sorting[0].id, { ascending: !sorting[0].desc })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, count, error } = await query
    if (!error) {
      setContacts((data ?? []) as ContactWithRelations[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [supabase, page, search, statusFilter, sourceFilter, sorting])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  async function handleBulkDelete() {
    const ids = Array.from(selected)
    const { error } = await supabase.from('contacts').delete().in('id', ids)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: `Deleted ${ids.length} contact(s)` })
    setSelected(new Set())
    loadContacts()
  }

  async function handleBulkStatus(status: string) {
    const ids = Array.from(selected)
    const { error } = await supabase.from('contacts').update({ status }).in('id', ids)
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: `Updated ${ids.length} contact(s)` })
    setSelected(new Set())
    loadContacts()
  }

  const columns: ColumnDef<ContactWithRelations>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => {
            table.toggleAllPageRowsSelected(!!v)
            if (v) {
              setSelected(new Set(contacts.map((c) => c.id)))
            } else {
              setSelected(new Set())
            }
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selected.has(row.original.id)}
          onCheckedChange={(v) => {
            const next = new Set(selected)
            if (v) next.add(row.original.id)
            else next.delete(row.original.id)
            setSelected(next)
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      accessorKey: 'first_name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.first_name} {row.original.last_name}
        </span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => row.original.company?.name ?? '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[row.original.status] ?? ''}`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'lead_score',
      header: 'Score',
      cell: ({ row }) => <LeadScoreBadge score={row.original.lead_score} />,
    },
    {
      accessorKey: 'last_contacted_at',
      header: 'Last contacted',
      cell: ({ row }) => formatRelativeDate(row.original.last_contacted_at),
    },
    {
      accessorKey: 'owner',
      header: 'Owner',
      cell: ({ row }) => row.original.owner?.full_name ?? '—',
    },
  ]

  const table = useReactTable({
    data: contacts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
  })

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contacts"
        description={`${total} total contacts`}
        actions={
          <Button onClick={() => { setEditContact(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4" /> Add contact
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9 w-56"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v === 'all' ? '' : v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="cold_call">Cold call</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserCheck className="w-4 h-4" /> Change status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {['lead', 'prospect', 'customer', 'churned'].map((s) => (
                  <DropdownMenuItem key={s} onClick={() => handleBulkStatus(s)}>
                    <span className="capitalize">{s}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === 'asc' && (
                          <ChevronUp className="w-3 h-3" />
                        )}
                        {header.column.getIsSorted() === 'desc' && (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      icon={Users}
                      title="No contacts found"
                      description="Add your first contact or adjust your filters."
                      action={{ label: 'Add contact', onClick: () => { setEditContact(null); setFormOpen(true) } }}
                    />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setDetailId(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <span className="text-sm text-muted-foreground">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ContactForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        contact={editContact}
        onSaved={loadContacts}
      />

      <ContactDetailPanel
        contactId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          const c = contacts.find((c) => c.id === detailId)
          if (c) {
            setEditContact(c)
            setDetailId(null)
            setFormOpen(true)
          }
        }}
      />
    </div>
  )
}
