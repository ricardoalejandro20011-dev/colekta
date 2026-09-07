'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FaqItem {
  q: string;
  a: React.ReactNode;
}

export function Faq({ items }: { items: FaqItem[] }) {
  const [abierto, setAbierto] = useState<number | null>(0);

  return (
    <div className="divide-y divide-[#111111]/[0.08] border-y border-[#111111]/[0.08]">
      {items.map((item, i) => {
        const activo = abierto === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              onClick={() => setAbierto(activo ? null : i)}
              aria-expanded={activo}
              className="flex w-full items-start justify-between gap-6 py-5 text-left transition-colors hover:text-brand-600"
            >
              <span className="text-[15px] font-medium tracking-[-0.01em] text-ink">
                {item.q}
              </span>
              <Plus
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                  activo && 'rotate-45',
                )}
              />
            </button>
            <div
              className={cn(
                'grid transition-all duration-300 ease-out',
                activo ? 'grid-rows-[1fr] pb-6 opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="max-w-[62ch] space-y-3 pr-10 text-[14px] leading-relaxed text-muted-foreground">
                  {item.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
