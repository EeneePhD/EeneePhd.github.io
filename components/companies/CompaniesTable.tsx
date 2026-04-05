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
import { Skeleton } from '@/components/ui/skeleton'
import { CompanyForm } from './CompanyForm'
import { CompanyDetailPanel } from './CompanyDetailPanel'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { useToast } from '@/lib/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { CompanyWithOwner } from '@/lib/types/database.types'

export function CompaniesTable() {
  const supabase = createClient()
  const { toast } = useToast()
  const [companies, setCompanies] = useState<CompanyWithOwner[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editCompany, setEditCompany] = useState<CompanyWithOwner | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const pageSize = 50

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('companies')
      .select('*, owner:users(id,full_name,avatar_url)', { count: 'exact' })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (search) query = query.ilike('name', `%${search}%`)
    if (sorting.length > 0) {
      query = query.order(sorting[0].id, { ascending: !sorting[0].desc })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, count, error } = await query
    if (!error) {
      setCompanies((data ?? []) as CompanyWithOwner[])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [supabase, page, search, sorting])

  useEffect(() => { load() }, [load])

  const columns: ColumnDef<CompanyWithOwner>[] = [
    {
      accessorKey: 'name',
      header: 'Company',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: 'industry', header: 'Industry', cell: ({ row }) => row.original.industry ?? '—' },
    {
      accessorKey: 'employee_count',
      header: 'Employees',
      cell: ({ row }) => row.original.employee_count?.toLocaleString() ?? '—',
    },
    {
      accessorKey: 'annual_revenue',
      header: 'Revenue',
      cell: ({ row }) =>
        row.original.annual_revenue ? formatCurrency(row.original.annual_revenue) : '—',
    },
    {
      accessorKey: 'city',
      header: 'Location',
      cell: ({ row }) =>
        [row.original.city, row.original.country].filter(Boolean).join(', ') || '—',
    },
    { accessorKey: 'owner', header: 'Owner', cell: ({ row }) => row.original.owner?.full_name ?? '—' },
    { accessorKey: 'created_at', header: 'Created', cell: ({ row }) => formatDate(row.original.created_at) },
  ]

  const table = useReactTable({
    data: companies,
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
        title="Companies"
        description={`${total} total companies`}
        actions={
          <Button onClick={() => { setEditCompany(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4" /> Add company
          </Button>
        }
      />

      <div className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            className="pl-9 w-56"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
      </div>

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
                        {header.column.getIsSorted() === 'asc' && <ChevronUp className="w-3 h-3" />}
                        {header.column.getIsSorted() === 'desc' && <ChevronDown className="w-3 h-3" />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      icon={Building2}
                      title="No companies found"
                      description="Add your first company to get started."
                      action={{ label: 'Add company', onClick: () => { setEditCompany(null); setFormOpen(true) } }}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
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
      </div>

      <CompanyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        company={editCompany}
        onSaved={load}
      />
      <CompanyDetailPanel
        companyId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={() => {
          const c = companies.find((c) => c.id === detailId)
          if (c) { setEditCompany(c); setDetailId(null); setFormOpen(true) }
        }}
      />
    </div>
  )
}
