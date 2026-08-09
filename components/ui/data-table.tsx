'use client'

import * as React from 'react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type SortDir = 'asc' | 'desc'

export interface DataTableColumn<T> {
  key: string
  header: string
  cell?: (row: T, index: number) => React.ReactNode
  sortable?: boolean
  headerClassName?: string
  cellClassName?: string
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: DataTableColumn<T>[]
  data: T[]
  totalCount: number
  page: number
  pageSize?: number
  loading?: boolean
  sort?: { key: string; dir: SortDir } | null
  onPageChange: (page: number) => void
  onSortChange?: (key: string, dir: SortDir) => void
  emptyState?: React.ReactNode
  className?: string
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  totalCount,
  page,
  pageSize = 20,
  loading = false,
  sort,
  onPageChange,
  onSortChange,
  emptyState,
  className,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const startRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const endRow = Math.min(page * pageSize, totalCount)
  const isEmpty = !loading && data.length === 0

  function handleSort(key: string) {
    if (!onSortChange) return
    if (sort?.key === key) {
      onSortChange(key, sort.dir === 'asc' ? 'desc' : 'asc')
    } else {
      onSortChange(key, 'asc')
    }
  }

  return (
    <div data-slot="data-table" className={cn('flex flex-col', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  col.headerClassName,
                  col.sortable && onSortChange && 'cursor-pointer select-none',
                )}
                onClick={col.sortable && onSortChange ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.header}
                  {col.sortable && (
                    <span className="inline-flex flex-col items-center">
                      {sort?.key === col.key ? (
                        sort.dir === 'asc' ? (
                          <CaretUp className="size-3 text-primary" />
                        ) : (
                          <CaretDown className="size-3 text-primary" />
                        )
                      ) : (
                        <span className="flex flex-col opacity-30">
                          <CaretUp className="size-2.5 -mb-px" />
                          <CaretDown className="size-2.5" />
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <TableRow key={i} className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.cellClassName}>
                    <Skeleton className="h-4 w-full max-w-[180px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : isEmpty ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="p-0">
                {emptyState ?? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    No results found
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.cellClassName}>
                    {col.cell
                      ? col.cell(row, i)
                      : (() => {
                          const val = (row as Record<string, unknown>)[col.key]
                          return <>{val != null ? String(val) : '—'}</>
                        })()}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination footer — only shown when there's data or we're loading */}
      {(totalCount > 0 || loading) && (
        <div className="flex items-center justify-between border-t border-base-300 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {loading
              ? 'Loading…'
              : `${startRow}–${endRow} of ${totalCount.toLocaleString()}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="min-w-[80px] text-center text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { DataTable }
export type { DataTableProps }
