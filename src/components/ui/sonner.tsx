'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group rounded-[12px] border border-[#111111]/[0.09] bg-white text-ink shadow-float text-[13px]',
          description: 'text-muted-foreground',
          actionButton: 'bg-ink text-white rounded-[8px]',
          cancelButton: 'bg-[#111111]/[0.06] text-ink rounded-[8px]',
          success: '[&_[data-icon]]:text-emerald-600',
          error: '[&_[data-icon]]:text-red-600',
          warning: '[&_[data-icon]]:text-amber-600',
          info: '[&_[data-icon]]:text-brand-600',
        },
      }}
      {...props}
    />
  );
}
