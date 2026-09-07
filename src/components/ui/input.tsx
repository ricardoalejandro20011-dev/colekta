import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-[10px] border border-[#111111]/12 bg-white px-3 py-2 text-sm shadow-subtle',
        'placeholder:text-muted-foreground/70',
        'focus-visible:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-500/20',
        'disabled:cursor-not-allowed disabled:bg-[#111111]/[0.03] disabled:opacity-70',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'transition-colors',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
