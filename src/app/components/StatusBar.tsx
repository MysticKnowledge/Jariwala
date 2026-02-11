import React from 'react';
import { cn } from '@/app/components/ui/utils';

interface StatusBarProps {
  children: React.ReactNode;
  className?: string;
}

export function StatusBar({ children, className }: StatusBarProps) {
  return (
    <div
      className={cn(
        'h-7 px-4 bg-[var(--muted)] border-t border-[var(--border)] flex items-center gap-4 text-[0.75rem] text-[var(--muted-foreground)]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface StatusBarItemProps {
  label?: string;
  value: React.ReactNode;
  className?: string;
}

export function StatusBarItem({ label, value, className }: StatusBarItemProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {label && <span className="opacity-80">{label}:</span>}
      <span className="text-[var(--foreground)]">{value}</span>
    </div>
  );
}

export function StatusBarSeparator() {
  return <div className="w-px h-4 bg-[var(--border)]" />;
}
