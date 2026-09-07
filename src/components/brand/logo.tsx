import { cn } from '@/lib/utils';

/**
 * Marca COLEKTA: una C que se convierte en palomita de "pagado",
 * trazada en una sola línea continua. Hereda currentColor.
 */
export function LogoMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6 text-brand-500', className)}
      {...props}
    >
      <path
        d="M27.46 9.35 A13 13 0 1 0 23.36 32.56 L34.5 17.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  showWordmark = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={cn('h-[22px] w-[22px]', markClassName)} />
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
          COLEKTA
        </span>
      )}
    </span>
  );
}
