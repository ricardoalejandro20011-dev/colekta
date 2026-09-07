import Link from 'next/link';
import { Check } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { brand } from '@/config/brand';
import { formatMXN, desglose } from '@/lib/fees';

/**
 * Layout partido asimétrico para login/registro: formulario a la izquierda,
 * argumento de venta a la derecha. Nada de tarjeta centrada.
 */
export function AuthShell({
  titulo,
  subtitulo,
  children,
  pie,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  pie?: React.ReactNode;
}) {
  const ej = desglose(2450);

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
      {/* Formulario */}
      <div className="flex flex-col px-6 py-10 sm:px-12 lg:px-16">
        <Link href="/" className="inline-flex w-fit" aria-label={`${brand.name} — inicio`}>
          <Logo />
        </Link>

        <div className="flex flex-1 items-center">
          <div className="w-full max-w-[400px] py-12">
            <h1 className="text-display-sm text-ink">{titulo}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{subtitulo}</p>
            <div className="mt-8">{children}</div>
            {pie ? <div className="mt-6 text-[13px] text-muted-foreground">{pie}</div> : null}
          </div>
        </div>

        <p className="text-[12px] text-muted-foreground">
          © {new Date().getFullYear()} {brand.name} · {brand.tagline}.
        </p>
      </div>

      {/* Panel lateral */}
      <aside className="relative hidden overflow-hidden border-l border-[#111111]/[0.08] bg-[#111111]/[0.015] lg:block">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <p className="eyebrow">Cómo se reparte el costo de procesar el pago</p>
          <h2 className="mt-4 max-w-[22ch] text-display-sm text-ink">
            Cada escuela decide cómo manejar los costos de procesamiento.
          </h2>

          <div className="mt-8 max-w-[360px] rounded-[12px] border border-[#111111]/[0.09] bg-white p-6 shadow-card">
            <p className="text-[12px] text-muted-foreground">Colegiatura · Agosto</p>
            <div className="mt-4 space-y-2.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Concepto</span>
                <span className="tnum">{formatMXN(ej.concepto)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-muted-foreground">Comisión</span>
                <span className="tnum">{formatMXN(ej.comision)}</span>
              </div>
              <div className="flex justify-between border-t border-[#111111]/[0.09] pt-2.5">
                <span className="text-[13px] font-medium">Paga el tutor</span>
                <span className="tnum text-[16px] font-semibold tracking-[-0.02em]">
                  {formatMXN(ej.total)}
                </span>
              </div>
            </div>
            <p className="mt-4 rounded-[10px] bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
              La escuela recibe {formatMXN(ej.concepto)} limpios.
            </p>
          </div>

          <ul className="mt-10 space-y-3">
            {[
              'Kínder, primaria, prepa, universidad o academia',
              'Grupos y conceptos 100 % configurables',
              'Envío masivo por WhatsApp en un clic',
              'Datos aislados por escuela con RLS',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[13px] text-ink/80">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" strokeWidth={2.6} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
