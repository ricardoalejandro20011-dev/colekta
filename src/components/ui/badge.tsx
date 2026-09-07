import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#111111]/[0.06] text-ink',
        outline: 'border-[#111111]/12 text-ink',
        brand: 'border-brand-200 bg-brand-50 text-brand-700',
        /* Estados de pago */
        pagado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
        atrasado: 'border-red-200 bg-red-50 text-red-700',
        neutral: 'border-[#111111]/10 bg-[#111111]/[0.03] text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
