"use client";
import type { ReactNode } from "react";
import { SkeletonLoader } from "@/components/composite/SkeletonLoader";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Pagination } from "@/components/patterns/Pagination";

// Sprint 6B — generic admin list table, reused across every management
// screen (Products/Orders/Customers/Reviews/Coupons/Audit Log) so
// sorting/pagination/empty/loading states are implemented once, not
// per-page.
export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  isLoading,
  emptyMessage = "No results found.",
  page,
  totalPages,
  onPageChange,
  selectable,
  selectedIds,
  onToggleSelect,
}: {
  columns: Column<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState heading="Nothing here yet" body={emptyMessage} />;
  }

  return (
    <div className="overflow-x-auto rounded-md bg-white shadow-rest">
      <table className="w-full text-left text-[15px]">
        <thead>
          <tr className="border-b border-fog text-[12px] uppercase tracking-wide text-stone">
            {selectable && <th className="w-10 px-4 py-3" scope="col" />}
            {columns.map((col) => (
              <th key={col.header} scope="col" className="px-4 py-3 font-semibold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-fog last:border-0 hover:bg-paper">
              {selectable && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select row ${row.id}`}
                    checked={selectedIds?.has(row.id) ?? false}
                    onChange={() => onToggleSelect?.(row.id)}
                    className="h-4 w-4"
                  />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-3 text-charcoal">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {page !== undefined && totalPages !== undefined && onPageChange && (
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}
