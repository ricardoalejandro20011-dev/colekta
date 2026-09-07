import { Check, Clock, Search, TriangleAlert } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { brand } from '@/config/brand';
import { calcTotalConComision, formatMXN, formatMXNCompact } from '@/lib/fees';
import { cn } from '@/lib/utils';

/**
 * Preview del dashboard real: mismos componentes, mismo cálculo de comisión,
 * mismos estados. No es una imagen ni un mockup pintado — pero los datos
 * (escuela, alumnos, montos) son 100% simulados. Nunca deben leerse como un
 * caso real o un colegio verdadero: por eso lleva "Escuela Demo" y la
 * etiqueta de simulación visibles.
 */

const FILAS = [
  { alumno: 'Renata Ibarra Solís', grupo: '3ro B', tutor: 'Mariana Solís', monto: 2450, estado: 'pagado' },
  { alumno: 'Emiliano Cárdenas', grupo: '1ro A', tutor: 'Jorge Cárdenas', monto: 2450, estado: 'pagado' },
  { alumno: 'Ximena Ruvalcaba', grupo: '5to A', tutor: 'Paola Ruvalcaba', monto: 2450, estado: 'pendiente' },
  { alumno: 'Santiago Ledezma', grupo: '2do A', tutor: 'Alma Ledezma', monto: 1960, estado: 'atrasado' },
  { alumno: 'Valentina Ochoa', grupo: '6to B', tutor: 'Rubén Ochoa', monto: 2450, estado: 'pagado' },
  { alumno: 'Diego Zermeño', grupo: '4to A', tutor: 'Lucía Zermeño', monto: 2450, estado: 'pendiente' },
  { alumno: 'Isabella Fuentes', grupo: '1ro B', tutor: 'Andrea Fuentes', monto: 2450, estado: 'pagado' },
  { alumno: 'Matías Barrera', grupo: '3ro A', tutor: 'Óscar Barrera', monto: 2450, estado: 'atrasado' },
] as const;

const ESTADO_UI = {
  pagado: { label: 'Pagado', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: Check },
  pendiente: { label: 'Pendiente', cls: 'border-amber-200 bg-amber-50 text-amber-700', Icon: Clock },
  atrasado: { label: 'Atrasado', cls: 'border-red-200 bg-red-50 text-red-700', Icon: TriangleAlert },
} as const;

function Kpi({
  label,
  value,
  delta,
  acento,
}: {
  label: string;
  value: string;
  delta?: string;
  acento?: boolean;
}) {
  return (
    <div className="min-w-0 flex-1 px-4 py-3">
      <p className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'tnum mt-1 text-[19px] font-semibold tracking-[-0.02em]',
          acento ? 'text-brand-600' : 'text-ink',
        )}
      >
        {value}
      </p>
      {delta ? <p className="tnum mt-0.5 text-[11px] text-emerald-600">{delta}</p> : null}
    </div>
  );
}

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-float',
        className,
      )}
      aria-label={`Vista previa del dashboard de ${brand.name} — simulación con datos demostrativos`}
    >
      {/* Aviso de simulación */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-amber-800">
          Simulación · Datos demostrativos
        </span>
      </div>

      {/* Barra superior */}
      <div className="flex items-center gap-3 border-b border-[#111111]/[0.07] px-4 py-2.5">
        <LogoMark className="h-4 w-4" />
        <span className="text-[12px] font-semibold tracking-[-0.01em]">Escuela Demo</span>
        <span className="rounded-full border border-[#111111]/10 px-2 py-0.5 text-[10px] text-muted-foreground">
          Primaria · 214 alumnos
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-6 w-40 items-center gap-1.5 rounded-[7px] border border-[#111111]/10 px-2 text-[10px] text-muted-foreground">
            <Search className="h-3 w-3" />
            Buscar alumno o tutor
          </div>
          <span className="rounded-[7px] bg-brand-500 px-2 py-1 text-[10px] font-medium text-white">
            Generar ciclo
          </span>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex divide-x divide-[#111111]/[0.07] border-b border-[#111111]/[0.07]">
        <Kpi label="Por cobrar" value={formatMXNCompact(524300)} />
        <Kpi label="Cobrado" value={formatMXNCompact(451820)} delta="86.2% del ciclo" acento />
        <Kpi label="Pendiente" value={formatMXNCompact(72480)} />
        <Kpi label="Morosidad" value="7.4%" />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#111111]/[0.07] bg-[#111111]/[0.015] px-4 py-2">
        {['Agosto 2026', 'Colegiatura', 'Todos los grupos'].map((f) => (
          <span
            key={f}
            className="rounded-[7px] border border-[#111111]/10 bg-white px-2 py-1 text-[10px] font-medium text-ink"
          >
            {f}
          </span>
        ))}
        <span className="ml-auto rounded-[7px] bg-ink px-2 py-1 text-[10px] font-medium text-white">
          3 seleccionados · Enviar WhatsApp
        </span>
      </div>

      {/* Tabla */}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#111111]/[0.07] text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            <th className="w-7 py-2 pl-4 font-medium" />
            <th className="py-2 font-medium">Alumno</th>
            <th className="py-2 font-medium">Grupo</th>
            <th className="hidden py-2 font-medium sm:table-cell">Tutor</th>
            <th className="py-2 text-right font-medium">Concepto</th>
            <th className="py-2 text-right font-medium">Total tutor</th>
            <th className="py-2 pr-4 text-right font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {FILAS.map((f, i) => {
            const ui = ESTADO_UI[f.estado];
            const marcado = i < 3 && f.estado !== 'pagado';
            return (
              <tr
                key={f.alumno}
                className="border-b border-[#111111]/[0.05] text-[11px] last:border-0"
              >
                <td className="py-2 pl-4">
                  <span
                    className={cn(
                      'flex h-3 w-3 items-center justify-center rounded-[4px] border',
                      marcado
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-[#111111]/20',
                    )}
                  >
                    {marcado ? <Check className="h-2 w-2" strokeWidth={4} /> : null}
                  </span>
                </td>
                <td className="max-w-0 truncate py-2 pr-3 font-medium text-ink">{f.alumno}</td>
                <td className="py-2 pr-3 text-muted-foreground">{f.grupo}</td>
                <td className="hidden max-w-0 truncate py-2 pr-3 text-muted-foreground sm:table-cell">
                  {f.tutor}
                </td>
                <td className="tnum py-2 pr-3 text-right text-muted-foreground">
                  {formatMXN(f.monto)}
                </td>
                <td className="tnum py-2 pr-3 text-right font-medium text-ink">
                  {formatMXN(calcTotalConComision(f.monto))}
                </td>
                <td className="py-2 pr-4 text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                      ui.cls,
                    )}
                  >
                    <ui.Icon className="h-2.5 w-2.5" strokeWidth={2.5} />
                    {ui.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-[#111111]/[0.07] px-4 py-2 text-[10px] text-muted-foreground">
        <span>Mostrando 8 de 214 pagos del ciclo</span>
        <span className="tnum">Actualizado hace 12 s</span>
      </div>
    </div>
  );
}
