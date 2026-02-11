import React from 'react';
import { cn } from '@/app/components/ui/utils';

interface ToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'h-12 px-4 bg-white border-b border-[var(--border)] flex items-center gap-2',
        '[box-shadow:var(--shadow-sm)]',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ToolbarButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary';
}

export function ToolbarButton({ children, variant = 'default', className, ...props }: ToolbarButtonProps) {
  return (
    <button
      className={cn(
        'h-8 px-3 rounded-[4px] border transition-colors inline-flex items-center gap-2',
        variant === 'primary'
          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]'
          : 'bg-white text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--secondary)] hover:border-[var(--border-strong)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ToolbarSeparator() {
  return <div className="w-px h-6 bg-[var(--border)]" />;
}
