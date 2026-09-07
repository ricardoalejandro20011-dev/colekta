'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarPlus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cicloLabel, ciclosDisponibles, formatFecha, vencimientoDeCiclo } from '@/lib/utils';
import { formatMXN } from '@/lib/fees';
import type { Concept, Group } from '@/lib/types';

export function GenerateCycleDialog({
  schoolId,
  grupos,
  conceptos,
  cicloActualSel,
  diaVencimiento,
  alumnosPorGrupo,
}: {
  schoolId: string;
  grupos: Group[];
  conceptos: Concept[];
  cicloActualSel: string;
  diaVencimiento: number;
  alumnosPorGrupo: Record<string, number>;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [ciclo, setCiclo] = useState(cicloActualSel);
  const [conceptId, setConceptId] = useState(conceptos[0]?.id ?? '');
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);

  const todos = seleccion.length === 0;
  const concepto = conceptos.find((c) => c.id === conceptId);

  const alumnosAfectados = todos
    ? Object.values(alumnosPorGrupo).reduce((a, b) => a + b, 0)
    : seleccion.reduce((acc, id) => acc + (alumnosPorGrupo[id] ?? 0), 0);

  function toggle(id: string) {
    setSeleccion((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function generar() {
    if (!conceptId) return toast.error('Elige un concepto');
    setCargando(true);

    try {
      const res = await fetch('/api/payments/generate-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          ciclo,
          concept_id: conceptId,
          group_ids: seleccion,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? 'No se pudo generar el ciclo');
        return;
      }

      if (json.creados === 0) {
        toast.info(json.mensaje ?? 'No había pagos nuevos que crear');
      } else {
        toast.success(`${json.creados} pagos generados para ${cicloLabel(ciclo)}`, {
          description:
            json.preferencias_creadas < json.creados
              ? `${json.preferencias_creadas} links de Mercado Pago listos. El resto se crea al abrirse.`
              : 'Todos los links de pago están listos para enviarse.',
        });
      }

      if (json.sin_monto?.length) {
        toast.warning(`${json.sin_monto.length} alumnos sin monto asignado`, {
          description: `No se les generó pago: ${json.sin_monto.slice(0, 3).join(', ')}${
            json.sin_monto.length > 3 ? '…' : ''
          }. Ponles monto en su grupo o en su ficha.`,
        });
      }

      if (json.aviso_mp) toast.warning('Mercado Pago', { description: json.aviso_mp });

      setAbierto(false);
      router.refresh();
    } catch {
      toast.error('Falló la conexión al generar el ciclo');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm">
          <CalendarPlus className="h-4 w-4" />
          Generar ciclo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generar pagos del ciclo</DialogTitle>
          <DialogDescription>
            Crea el pago de cada alumno activo con su link único de Mercado Pago. Si un alumno ya
            tiene ese cobro en ese ciclo, se salta: puedes correrlo las veces que quieras.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ciclo</Label>
              <Select value={ciclo} onValueChange={setCiclo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ciclosDisponibles(12, 3).map((c) => (
                    <SelectItem key={c} value={c}>
                      {cicloLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Concepto</Label>
              <Select value={conceptId} onValueChange={setConceptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un concepto" />
                </SelectTrigger>
                <SelectContent>
                  {conceptos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                      {c.monto_fijo ? ` · ${formatMXN(c.monto_fijo)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Grupos</Label>
              <button
                type="button"
                onClick={() => setSeleccion([])}
                className="text-[12px] font-medium text-brand-600 hover:underline"
              >
                Todos los grupos
              </button>
            </div>

            <div className="max-h-52 space-y-0.5 overflow-y-auto thin-scrollbar rounded-[10px] border border-[#111111]/[0.09] p-1.5">
              {grupos.length === 0 ? (
                <p className="px-2 py-3 text-[13px] text-muted-foreground">
                  Todavía no tienes grupos. Se generará para todos los alumnos activos.
                </p>
              ) : (
                grupos.map((g) => (
                  <label
                    key={g.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2 py-1.5 hover:bg-[#111111]/[0.03]"
                  >
                    <Checkbox
                      checked={seleccion.includes(g.id)}
                      onCheckedChange={() => toggle(g.id)}
                    />
                    <span className="flex-1 text-[13px]">{g.nombre}</span>
                    <span className="tnum text-[12px] text-muted-foreground">
                      {alumnosPorGrupo[g.id] ?? 0} alumnos
                    </span>
                    <span className="tnum w-20 text-right text-[12px] text-muted-foreground">
                      {g.monto_default ? formatMXN(g.monto_default) : 'sin monto'}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">
              {todos
                ? 'Sin selección se generan todos los grupos, incluidos los alumnos sin grupo.'
                : `${seleccion.length} grupos seleccionados.`}
            </p>
          </div>

          <div className="flex items-start gap-2.5 rounded-[10px] border border-[#111111]/[0.09] bg-[#111111]/[0.02] px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-[12px] leading-relaxed text-muted-foreground">
              Se generarán hasta{' '}
              <strong className="text-ink">{alumnosAfectados} pagos</strong> de{' '}
              <strong className="text-ink">{concepto?.nombre ?? 'el concepto'}</strong> para{' '}
              {cicloLabel(ciclo)}, con vencimiento el{' '}
              <strong className="text-ink">
                {formatFecha(vencimientoDeCiclo(ciclo, diaVencimiento))}
              </strong>
              . La comisión de Mercado Pago se le suma al tutor.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button variant="brand" onClick={generar} loading={cargando} disabled={!conceptId}>
            Generar pagos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
