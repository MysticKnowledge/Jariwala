import React from 'react';
import { cn } from '@/app/components/ui/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[2px] text-[0.75rem] font-medium',
        {
          'bg-[var(--muted)] text-[var(--foreground)]': variant === 'default',
          'bg-[var(--success)] text-[var(--success-foreground)]': variant === 'success',
          'bg-[var(--warning)] text-[var(--warning-foreground)]': variant === 'warning',
          'bg-[var(--destructive)] text-[var(--destructive-foreground)]': variant === 'destructive',
          'bg-[var(--primary)] text-[var(--primary-foreground)]': variant === 'info',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
