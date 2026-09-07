import { cn } from '@/lib/utils';

/* ── Ilustraciones lineales, stroke 1.5, mismo lenguaje que el logo ────── */

export function IlustraAlumnos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" fill="none" className={cn('h-24 w-auto', className)} aria-hidden>
      <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="12" y="30" width="96" height="54" rx="8" className="text-[#111111]/12" />
        <path d="M12 44h96" className="text-[#111111]/12" />
        <circle cx="60" cy="20" r="9" className="text-brand-500" />
        <path d="M44 34c2-7 8-11 16-11s14 4 16 11" className="text-brand-500" />
        <path d="M28 58h22M28 68h34" className="text-[#111111]/20" />
        <path d="M76 58h16M76 68h10" className="text-[#111111]/12" />
      </g>
    </svg>
  );
}

export function IlustraPagos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" fill="none" className={cn('h-24 w-auto', className)} aria-hidden>
      <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="14" y="22" width="92" height="58" rx="10" className="text-[#111111]/12" />
        <path d="M14 40h92" className="text-[#111111]/12" />
        <path d="M28 56h20" className="text-[#111111]/22" />
        <circle cx="84" cy="60" r="14" className="text-brand-500" />
        <path d="m78 60 4.5 4.5L91 55" className="text-brand-500" />
      </g>
    </svg>
  );
}

export function IlustraGrupos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" fill="none" className={cn('h-24 w-auto', className)} aria-hidden>
      <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="26" width="42" height="26" rx="7" className="text-brand-500" />
        <rect x="62" y="26" width="42" height="26" rx="7" className="text-[#111111]/15" />
        <rect x="10" y="62" width="42" height="24" rx="7" className="text-[#111111]/15" />
        <rect x="62" y="62" width="42" height="24" rx="7" className="text-[#111111]/10" />
        <path d="M20 39h16M72 39h20M20 74h22M72 74h14" className="text-[#111111]/20" />
      </g>
    </svg>
  );
}

export function IlustraWhatsapp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" fill="none" className={cn('h-24 w-auto', className)} aria-hidden>
      <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M22 20h56a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H44l-14 12V62h-8a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8Z"
          className="text-[#111111]/14"
        />
        <path d="M34 34h32M34 46h20" className="text-[#111111]/22" />
        <circle cx="90" cy="66" r="13" className="text-brand-500" />
        <path d="m84.5 66 4 4 7.5-8" className="text-brand-500" />
      </g>
    </svg>
  );
}

export function IlustraBusqueda({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" fill="none" className={cn('h-24 w-auto', className)} aria-hidden>
      <g stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="52" cy="44" r="22" className="text-brand-500" />
        <path d="m68 60 18 18" className="text-brand-500" />
        <path d="M40 40h24M40 50h14" className="text-[#111111]/18" />
      </g>
    </svg>
  );
}

/* ── Contenedor ────────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-3 px-6 py-10' : 'gap-4 px-6 py-16',
        className,
      )}
    >
      {icon ? <div className="text-[#111111]">{icon}</div> : null}
      <div className="max-w-sm space-y-1.5">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {description ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
