import React from 'react';
import { cn } from '@/app/components/ui/utils';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  glass?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
}

export function Panel({ children, title, glass = false, className, headerAction }: PanelProps) {
  return (
    <div
      className={cn(
        'rounded-[4px] border',
        glass
          ? 'bg-white/70 backdrop-blur-[12px] border-white/30'
          : 'bg-white border-[var(--card-border)]',
        '[box-shadow:var(--shadow-md)]',
        className
      )}
    >
      {title && (
        <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
          <h3 className="m-0">{title}</h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
