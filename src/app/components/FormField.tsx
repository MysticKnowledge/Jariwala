import React from 'react';
import { cn } from '@/app/components/ui/utils';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, error, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-[var(--foreground)]">
        {label}
        {required && <span className="text-[var(--destructive)] ml-1">*</span>}
      </label>
      {children}
      {error && <span className="text-[0.75rem] text-[var(--destructive)]">{error}</span>}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function TextInput({ error, className, ...props }: TextInputProps) {
  return (
    <input
      className={cn(
        'h-9 px-3 bg-[var(--input-background)] border rounded-[4px] outline-none transition-colors',
        error
          ? 'border-[var(--destructive)]'
          : 'border-[var(--input)] hover:border-[var(--input-hover)] focus:border-[var(--input-focus)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function SelectInput({ error, className, children, ...props }: SelectInputProps) {
  return (
    <select
      className={cn(
        'h-9 px-3 bg-[var(--input-background)] border rounded-[4px] outline-none transition-colors',
        error
          ? 'border-[var(--destructive)]'
          : 'border-[var(--input)] hover:border-[var(--input-hover)] focus:border-[var(--input-focus)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function TextArea({ error, className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={cn(
        'min-h-[80px] p-3 bg-[var(--input-background)] border rounded-[4px] outline-none transition-colors resize-vertical',
        error
          ? 'border-[var(--destructive)]'
          : 'border-[var(--input)] hover:border-[var(--input-hover)] focus:border-[var(--input-focus)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  );
}
