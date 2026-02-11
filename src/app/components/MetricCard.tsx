import React from 'react';
import { cn } from '@/app/components/ui/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel = 'vs yesterday',
  icon,
  className,
  variant = 'default'
}: MetricCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;

  return (
    <div
      className={cn(
        'bg-white border border-[var(--card-border)] rounded-[4px] p-4',
        '[box-shadow:var(--shadow-md)]',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-[0.75rem] text-[var(--muted-foreground)] uppercase tracking-wide">
          {title}
        </div>
        {icon && (
          <div className={cn(
            'w-8 h-8 rounded-[4px] flex items-center justify-center',
            variant === 'primary' && 'bg-[var(--primary)]/10 text-[var(--primary)]',
            variant === 'success' && 'bg-[var(--success)]/10 text-[var(--success)]',
            variant === 'warning' && 'bg-[var(--warning)]/10 text-[var(--warning)]',
            variant === 'default' && 'bg-[var(--muted)] text-[var(--foreground)]'
          )}>
            {icon}
          </div>
        )}
      </div>

      <div className="mb-2">
        <div className="text-2xl font-semibold text-[var(--foreground)] tabular-nums">
          {value}
        </div>
      </div>

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {isPositive && <TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />}
          {isNegative && <TrendingDown className="w-3.5 h-3.5 text-[var(--destructive)]" />}
          <span
            className={cn(
              'text-[0.75rem] font-medium tabular-nums',
              isPositive && 'text-[var(--success)]',
              isNegative && 'text-[var(--destructive)]',
              !isPositive && !isNegative && 'text-[var(--muted-foreground)]'
            )}
          >
            {change > 0 && '+'}
            {change}%
          </span>
          <span className="text-[0.75rem] text-[var(--muted-foreground)]">
            {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
