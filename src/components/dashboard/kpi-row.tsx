import { cn } from '@/lib/utils';
import { formatMXNCompact } from '@/lib/fees';
import type { PaymentRow } from '@/lib/types';

export interface Kpis {
  porCobrar: number;
  cobrado: number;
  pendiente: number;
  morosidad: number;
  alumnosActivos: number;
  totalPagos: number;
  pagosPagados: number;
  pagosAtrasados: number;
}

/** Todo se calcula sobre monto_concepto: la escuela nunca ve la comisión. */
export function calcularKpis(rows: PaymentRow[], alumnosActivos: number): Kpis {
  let porCobrar = 0;
  let cobrado = 0;
  let pendiente = 0;
  let pagados = 0;
  let atrasados = 0;

  for (const r of rows) {
    const m = Number(r.monto_concepto) || 0;
    porCobrar += m;
    if (r.status === 'pagado') {
      cobrado += m;
      pagados++;
    } else {
      pendiente += m;
      if (r.status === 'atrasado') atrasados++;
    }
  }

  return {
    porCobrar,
    cobrado,
    pendiente,
    morosidad: rows.length ? (atrasados / rows.length) * 100 : 0,
    alumnosActivos,
    totalPagos: rows.length,
    pagosPagados: pagados,
    pagosAtrasados: atrasados,
  };
}

function Tile({
  label,
  value,
  sub,
  tono = 'neutral',
  barra,
}: {
  label: string;
  value: string;
  sub?: string;
  tono?: 'neutral' | 'ok' | 'alerta' | 'malo';
  barra?: number;
}) {
  return (
    <div className="min-w-0 flex-1 px-5 py-4">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'tnum mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.03em]',
          tono === 'ok' && 'text-emerald-600',
          tono === 'alerta' && 'text-amber-600',
          tono === 'malo' && 'text-red-600',
          tono === 'neutral' && 'text-ink',
        )}
      >
        {value}
      </p>
      {sub ? <p className="tnum mt-1.5 text-[11px] text-muted-foreground">{sub}</p> : null}
      {typeof barra === 'number' ? (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[#111111]/[0.07]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              tono === 'malo' ? 'bg-red-500' : tono === 'alerta' ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${Math.min(100, Math.max(0, barra))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function KpiRow({ kpis }: { kpis: Kpis }) {
  const avance = kpis.porCobrar > 0 ? (kpis.cobrado / kpis.porCobrar) * 100 : 0;

  return (
    <div className="flex flex-wrap divide-x divide-[#111111]/[0.07] rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-subtle">
      <Tile
        label="Por cobrar este ciclo"
        value={formatMXNCompact(kpis.porCobrar)}
        sub={`${kpis.totalPagos} pagos generados`}
      />
      <Tile
        label="Cobrado"
        value={formatMXNCompact(kpis.cobrado)}
        sub={`${avance.toFixed(1)}% del ciclo · ${kpis.pagosPagados} pagos`}
        tono="ok"
        barra={avance}
      />
      <Tile
        label="Pendiente"
        value={formatMXNCompact(kpis.pendiente)}
        sub={`${kpis.totalPagos - kpis.pagosPagados} sin pagar`}
        tono={kpis.pendiente > 0 ? 'alerta' : 'neutral'}
      />
      <Tile
        label="Tasa de morosidad"
        value={`${kpis.morosidad.toFixed(1)}%`}
        sub={`${kpis.pagosAtrasados} pagos vencidos`}
        tono={kpis.morosidad >= 10 ? 'malo' : kpis.morosidad > 0 ? 'alerta' : 'ok'}
      />
      <Tile
        label="Alumnos activos"
        value={String(kpis.alumnosActivos)}
        sub="Cuentan para tu plan"
      />
    </div>
  );
}
