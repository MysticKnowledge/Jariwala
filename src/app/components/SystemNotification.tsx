import React from 'react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface SystemNotificationProps {
  type: NotificationType;
  title: string;
  message: string;
  onDismiss?: () => void;
  stats?: {
    label: string;
    value: string | number;
  }[];
}

export function SystemNotification({ type, title, message, onDismiss, stats }: SystemNotificationProps) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertCircle,
  };

  const colors = {
    success: {
      bg: 'bg-[var(--success)]/10',
      border: 'border-[var(--success)]',
      text: 'text-[var(--success)]',
      icon: 'text-[var(--success)]',
    },
    error: {
      bg: 'bg-[var(--destructive)]/10',
      border: 'border-[var(--destructive)]',
      text: 'text-[var(--destructive)]',
      icon: 'text-[var(--destructive)]',
    },
    info: {
      bg: 'bg-[var(--primary)]/10',
      border: 'border-[var(--primary)]',
      text: 'text-[var(--primary)]',
      icon: 'text-[var(--primary)]',
    },
    warning: {
      bg: 'bg-[var(--warning)]/10',
      border: 'border-[var(--warning)]',
      text: 'text-[var(--warning)]',
      icon: 'text-[var(--warning)]',
    },
  };

  const Icon = icons[type];
  const colorScheme = colors[type];

  return (
    <div
      className={`
        fixed top-4 right-4 z-50
        w-96 p-4 rounded-lg border-2
        ${colorScheme.bg} ${colorScheme.border}
        backdrop-blur-md
        shadow-xl
        animate-in slide-in-from-right-5 fade-in
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${colorScheme.icon}`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold ${colorScheme.text}`}>{title}</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <p className="text-[0.875rem] text-[var(--foreground)] mb-3">
            {message}
          </p>

          {stats && stats.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white/50 rounded px-2 py-1.5">
                  <div className="text-[0.625rem] text-[var(--muted-foreground)] uppercase font-semibold">
                    {stat.label}
                  </div>
                  <div className="text-sm font-bold tabular-nums">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
