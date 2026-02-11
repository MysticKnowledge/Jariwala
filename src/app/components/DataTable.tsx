import React, { useState } from 'react';
import { cn } from '@/app/components/ui/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  zebra?: boolean;
  hover?: boolean;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  zebra = true,
  hover = true,
  className,
  onRowClick,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  return (
    <div className={cn('w-full overflow-auto border border-[var(--border)] rounded-[4px]', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={cn(
                  'px-4 py-2.5 text-left text-[var(--foreground)] border-r border-[var(--border-light)] last:border-r-0',
                  column.sortable && 'cursor-pointer select-none hover:bg-[var(--secondary)]'
                )}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.header}
                  {column.sortable && (
                    <div className="flex flex-col">
                      <ChevronUp
                        className={cn(
                          'w-3 h-3 -mb-1',
                          sortConfig?.key === column.key && sortConfig.direction === 'asc'
                            ? 'text-[var(--primary)]'
                            : 'text-[var(--muted-foreground)]'
                        )}
                      />
                      <ChevronDown
                        className={cn(
                          'w-3 h-3',
                          sortConfig?.key === column.key && sortConfig.direction === 'desc'
                            ? 'text-[var(--primary)]'
                            : 'text-[var(--muted-foreground)]'
                        )}
                      />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                'border-b border-[var(--border-light)] last:border-b-0',
                zebra && rowIndex % 2 === 1 && 'bg-[var(--background-alt)]',
                hover && 'hover:bg-[var(--secondary)] transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-2.5 border-r border-[var(--border-light)] last:border-r-0">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
