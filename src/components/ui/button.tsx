import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.985]',
  {
    variants: {
      variant: {
        default:
          'bg-ink text-white shadow-subtle hover:bg-ink/90',
        brand:
          'bg-brand-500 text-white shadow-[0_1px_2px_rgba(14,165,233,0.35)] hover:bg-brand-600',
        outline:
          'border border-[#111111]/12 bg-white text-ink shadow-subtle hover:bg-[#111111]/[0.03]',
        secondary:
          'bg-[#111111]/[0.05] text-ink hover:bg-[#111111]/[0.08]',
        ghost: 'text-ink hover:bg-[#111111]/[0.05]',
        destructive:
          'bg-destructive text-white shadow-subtle hover:bg-destructive/90',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-[8px] px-3 text-[13px]',
        xs: 'h-7 rounded-[7px] px-2 text-xs [&_svg]:size-3.5',
        lg: 'h-12 rounded-[12px] px-6 text-[15px]',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 rounded-[7px] [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
