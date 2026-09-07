'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUpDown,
  Banknote,
  Copy,
  Download,
  ExternalLink,
  History,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { EmptyState, IlustraBusqueda, IlustraPagos } from '@/components/empty-state';
import { formatMXN } from '@/lib/fees';
import {
  cicloLabel,
  ciclosDisponibles,
  cn,
  formatFecha,
  formatWhatsapp,
  linkDePago,
  normalizarTexto,
} from '@/lib/utils';
import type { Concept, Group, PaymentRow, PaymentStatus } from '@/lib/types';

const ALTO_FILA = 46;

const COLS =
  '36px minmax(180px,1.5fr) 110px 130px 104px minmax(150px,1.1fr) 128px 116px 128px 116px 40px';

const col = createColumnHelper<PaymentRow>();

export function CobranzaView({
  rows,
  grupos,
  conceptos,
  ciclo,
  acciones,
}: {
  rows: PaymentRow[];
  grupos: Group[];
  conceptos: Concept[];
  ciclo: string;
  /** Se pinta arriba a la derecha: el diálogo de generar ciclo. */
  acciones?: React.ReactNode;
}) {
  const router = useRouter();

  const [datos, setDatos] = useState<PaymentRow[]>(rows);
  const [busqueda, setBusqueda] = useState('');
  const [fGrupo, setFGrupo] = useState<string>('todos');
  const [fConcepto, setFConcepto] = useState<string>('todos');
  const [fEstado, setFEstado] = useState<string>('todos');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'nombre_alumno', desc: false }]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [ocupado, setOcupado] = useState<null | 'wa' | 'pago'>(null);

  // Si el server manda datos nuevos (cambio de ciclo, refresh), resincronizamos.
  const rowsRef = useRef(rows);
  if (rowsRef.current !== rows) {
    rowsRef.current = rows;
    setDatos(rows);
    setSeleccion(new Set());
  }

  /* ── Filtrado ──────────────────────────────────────────────────── */
  const filtradas = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return datos.filter((r) => {
      if (fGrupo !== 'todos' && (r.group_id ?? 'sin-grupo') !== fGrupo) return false;
      if (fConcepto !== 'todos' && r.concept_id !== fConcepto) return false;
      if (fEstado !== 'todos' && r.status !== fEstado) return false;
      if (!q) return true;
      return (
        normalizarTexto(r.nombre_alumno).includes(q) ||
        normalizarTexto(r.nombre_tutor).includes(q) ||
        r.whatsapp_tutor.includes(q.replace(/\D/g, ''))
      );
    });
  }, [datos, busqueda, fGrupo, fConcepto, fEstado]);

  const hayFiltros =
    busqueda !== '' || fGrupo !== 'todos' || fConcepto !== 'todos' || fEstado !== 'todos';

  function limpiarFiltros() {
    setBusqueda('');
    setFGrupo('todos');
    setFConcepto('todos');
    setFEstado('todos');
  }

  /* ── Selección ─────────────────────────────────────────────────── */
  const idsVisibles = useMemo(() => filtradas.map((r) => r.id), [filtradas]);
  const todosSeleccionados =
    idsVisibles.length > 0 && idsVisibles.every((id) => seleccion.has(id));
  const algunoSeleccionado = idsVisibles.some((id) => seleccion.has(id));

  const toggleFila = useCallback((id: string) => {
    setSeleccion((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }, []);

  function toggleTodos() {
    setSeleccion((prev) => {
      if (todosSeleccionados) {
        const s = new Set(prev);
        idsVisibles.forEach((id) => s.delete(id));
        return s;
      }
      return new Set([...Array.from(prev), ...idsVisibles]);
    });
  }

  const seleccionadas = useMemo(
    () => filtradas.filter((r) => seleccion.has(r.id)),
    [filtradas, seleccion],
  );

  /* ── Acciones ──────────────────────────────────────────────────── */
  async function copiar(texto: string, mensaje = 'Link copiado') {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(mensaje);
    } catch {
      toast.error('Tu navegador bloqueó el portapapeles');
    }
  }

  async function enviarWhatsapp(ids: string[]) {
    if (!ids.length) return;
    setOcupado('wa');
    try {
      const res = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ids: ids }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? 'No se pudo enviar');
        return;
      }

      if (json.enviados > 0) {
        toast.success(`${json.enviados} mensajes enviados por WhatsApp`, {
          description: json.fallados ? `${json.fallados} fallaron. Revisa la bitácora.` : undefined,
        });
      }
      if (json.en_cola > 0) {
        toast.info(`${json.en_cola} mensajes quedaron en cola`, {
          description:
            'Todavía no conectas WhatsApp Cloud API. Están listos para enviarse a mano desde WhatsApp › Bitácora.',
        });
      }
      if (json.fallados > 0 && !json.enviados) {
        toast.error(`${json.fallados} fallaron`, { description: json.primer_error ?? undefined });
      }
      router.refresh();
    } catch {
      toast.error('Falló la conexión al enviar');
    } finally {
      setOcupado(null);
    }
  }

  async function marcarPagado(ids: string[], pagado: boolean) {
    if (!ids.length) return;
    setOcupado('pago');
    try {
      const res = await fetch('/api/payments/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_ids: ids, pagado }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? 'No se pudo actualizar');
        return;
      }

      const ahora = new Date().toISOString();
      const set = new Set(ids);
      setDatos((prev) =>
        prev.map((r) =>
          set.has(r.id)
            ? {
                ...r,
                status: (pagado ? 'pagado' : 'pendiente') as PaymentStatus,
                fecha_pago: pagado ? ahora : null,
                metodo_pago: pagado ? 'manual' : null,
              }
            : r,
        ),
      );

      toast.success(
        pagado
          ? `${json.actualizados} pagos marcados como pagados`
          : `${json.actualizados} pagos regresados a pendiente`,
      );
      setSeleccion(new Set());
      router.refresh();
    } catch {
      toast.error('Falló la conexión');
    } finally {
      setOcupado(null);
    }
  }

  /* ── Columnas ──────────────────────────────────────────────────── */
  const columnas = useMemo(
    () => [
      col.display({
        id: 'sel',
        header: () => (
          <Checkbox
            checked={todosSeleccionados ? true : algunoSeleccionado ? 'indeterminate' : false}
            onCheckedChange={toggleTodos}
            aria-label="Seleccionar todos los visibles"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={seleccion.has(row.original.id)}
            onCheckedChange={() => toggleFila(row.original.id)}
            aria-label={`Seleccionar ${row.original.nombre_alumno}`}
          />
        ),
      }),
      col.accessor('nombre_alumno', {
        header: 'Alumno',
        cell: ({ getValue, row }) => (
          <Link
            href={`/dashboard/alumnos/${row.original.student_id}`}
            className="block truncate font-medium text-ink hover:text-brand-600 hover:underline"
          >
            {getValue()}
          </Link>
        ),
      }),
      col.accessor('group_nombre', {
        header: 'Grupo',
        cell: ({ getValue }) => (
          <span className="block truncate text-muted-foreground">{getValue()}</span>
        ),
      }),
      col.accessor('concept_nombre', {
        header: 'Concepto',
        cell: ({ getValue }) => (
          <span className="block truncate text-muted-foreground">{getValue()}</span>
        ),
      }),
      col.accessor('ciclo', {
        header: 'Ciclo',
        cell: ({ getValue }) => (
          <span className="block truncate text-muted-foreground">{cicloLabel(getValue())}</span>
        ),
      }),
      col.accessor('nombre_tutor', {
        header: 'Tutor',
        cell: ({ getValue }) => (
          <span className="block truncate text-muted-foreground">{getValue()}</span>
        ),
      }),
      col.accessor('whatsapp_tutor', {
        header: 'WhatsApp',
        cell: ({ getValue }) => (
          <span className="tnum block truncate text-muted-foreground">
            {formatWhatsapp(getValue())}
          </span>
        ),
      }),
      col.accessor('monto_concepto', {
        header: () => <span className="block text-right">Concepto</span>,
        cell: ({ getValue }) => (
          <span className="tnum block text-right text-muted-foreground">
            {formatMXN(getValue())}
          </span>
        ),
      }),
      col.accessor('monto_total_cobrado', {
        header: () => <span className="block text-right">Total tutor</span>,
        cell: ({ getValue }) => (
          <span className="tnum block text-right font-medium text-ink">
            {formatMXN(getValue())}
          </span>
        ),
      }),
      col.accessor('status', {
        header: 'Estado',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.original.status} />
            {row.original.metodo_pago === 'manual' && (
              <span className="text-[10px] text-muted-foreground">manual</span>
            )}
          </div>
        ),
      }),
      col.display({
        id: 'acciones',
        header: '',
        cell: ({ row }) => {
          const r = row.original;
          const link = linkDePago(r.link_token);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label={`Acciones de ${r.nombre_alumno}`}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{r.nombre_alumno}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={link} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    Ver link de pago
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copiar(link)}>
                  <Copy />
                  Copiar link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => enviarWhatsapp([r.id])}>
                  <MessageCircle />
                  Re-enviar por WhatsApp
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {r.status === 'pagado' ? (
                  <DropdownMenuItem onClick={() => marcarPagado([r.id], false)}>
                    <Undo2 />
                    Regresar a pendiente
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => marcarPagado([r.id], true)}>
                    <Banknote />
                    Marcar pagado (efectivo)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/alumnos/${r.student_id}`}>
                    <History />
                    Ver historial del alumno
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seleccion, todosSeleccionados, algunoSeleccionado, idsVisibles],
  );

  const table = useReactTable({
    data: filtradas,
    columns: columnas,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (r) => r.id,
  });

  const filas = table.getRowModel().rows;

  /* ── Virtualización ────────────────────────────────────────────── */
  const contenedor = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: filas.length,
    getScrollElement: () => contenedor.current,
    estimateSize: () => ALTO_FILA,
    overscan: 14,
  });
  const items = virtualizer.getVirtualItems();

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por alumno, tutor o WhatsApp…"
            className="h-9 pl-9"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[6px] p-1 text-muted-foreground hover:bg-[#111111]/[0.05]"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={ciclo}
          onValueChange={(v) => router.push(`/dashboard?ciclo=${v}`)}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ciclosDisponibles(12, 2).map((c) => (
              <SelectItem key={c} value={c}>
                {cicloLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fGrupo} onValueChange={setFGrupo}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los grupos</SelectItem>
            {grupos.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nombre}
              </SelectItem>
            ))}
            <SelectItem value="sin-grupo">Sin grupo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={fConcepto} onValueChange={setFConcepto}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Concepto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los conceptos</SelectItem>
            {conceptos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={fEstado} onValueChange={setFEstado}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="pagado">Pagado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>

        {hayFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/export?ciclo=${ciclo}${
                fEstado !== 'todos' ? `&status=${fEstado}` : ''
              }${fGrupo !== 'todos' && fGrupo !== 'sin-grupo' ? `&group_id=${fGrupo}` : ''}`}
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </a>
          </Button>
          {acciones}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-subtle">
        <div className="overflow-x-auto thin-scrollbar">
          <div className="min-w-[1240px]">
            {/* Encabezado */}
            <div
              className="grid items-center gap-3 border-b border-[#111111]/[0.08] bg-[#111111]/[0.015] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
              style={{ gridTemplateColumns: COLS }}
            >
              {table.getHeaderGroups()[0].headers.map((header) => {
                const puedeOrdenar = header.column.getCanSort() && header.id !== 'sel';
                return (
                  <div key={header.id} className="min-w-0">
                    {puedeOrdenar ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 uppercase tracking-[0.1em] transition-colors hover:text-ink"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown
                          className={cn(
                            'h-2.5 w-2.5',
                            header.column.getIsSorted() ? 'text-brand-600' : 'opacity-40',
                          )}
                        />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cuerpo virtualizado */}
            {filas.length === 0 ? (
              hayFiltros ? (
                <EmptyState
                  icon={<IlustraBusqueda />}
                  title="Ningún pago coincide con esos filtros"
                  description="Prueba con otro ciclo, otro grupo o limpia la búsqueda."
                  action={
                    <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                      Limpiar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<IlustraPagos />}
                  title={`Todavía no hay pagos de ${cicloLabel(ciclo)}`}
                  description="Genera el ciclo y COLEKTA crea el link de cada alumno activo con su monto y su fecha de vencimiento."
                  action={acciones}
                />
              )
            ) : (
              <div
                ref={contenedor}
                className="thin-scrollbar max-h-[calc(100vh-380px)] min-h-[280px] overflow-y-auto"
              >
                <div
                  style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
                >
                  {items.map((item) => {
                    const fila = filas[item.index];
                    const r = fila.original;
                    const activo = seleccion.has(r.id);
                    return (
                      <div
                        key={fila.id}
                        data-index={item.index}
                        ref={virtualizer.measureElement}
                        className={cn(
                          'absolute left-0 top-0 grid w-full items-center gap-3 border-b border-[#111111]/[0.05] px-4 text-[13px] transition-colors',
                          activo ? 'bg-brand-50/60' : 'hover:bg-[#111111]/[0.02]',
                        )}
                        style={{
                          gridTemplateColumns: COLS,
                          height: ALTO_FILA,
                          transform: `translateY(${item.start}px)`,
                        }}
                      >
                        {fila.getVisibleCells().map((cell) => (
                          <div key={cell.id} className="min-w-0">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {filas.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#111111]/[0.07] px-4 py-2.5 text-[12px] text-muted-foreground">
            <span className="tnum">
              {filas.length} {filas.length === 1 ? 'pago' : 'pagos'}
              {hayFiltros ? ` de ${datos.length}` : ''} · {cicloLabel(ciclo)}
            </span>
            <span className="tnum">
              Suma de conceptos:{' '}
              {formatMXN(filtradas.reduce((a, r) => a + Number(r.monto_concepto), 0))}
            </span>
          </div>
        )}
      </div>

      {/* Barra flotante de acciones masivas */}
      {seleccionadas.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-6">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-[12px] border border-[#111111]/10 bg-white px-3 py-2.5 shadow-float">
            <Badge variant="brand" className="tnum">
              {seleccionadas.length} seleccionados
            </Badge>

            <span className="hidden text-[12px] text-muted-foreground sm:inline">
              {formatMXN(seleccionadas.reduce((a, r) => a + Number(r.monto_concepto), 0))} en
              conceptos
            </span>

            <span className="mx-1 h-5 w-px bg-[#111111]/10" />

            <Button
              size="sm"
              variant="brand"
              loading={ocupado === 'wa'}
              onClick={() => enviarWhatsapp(seleccionadas.map((r) => r.id))}
            >
              <Send className="h-3.5 w-3.5" />
              Enviar WhatsApp
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                copiar(
                  seleccionadas.map((r) => `${r.nombre_alumno}: ${linkDePago(r.link_token)}`).join('\n'),
                  `${seleccionadas.length} links copiados`,
                )
              }
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar links
            </Button>

            <Button
              size="sm"
              variant="outline"
              loading={ocupado === 'pago'}
              onClick={() =>
                marcarPagado(
                  seleccionadas.filter((r) => r.status !== 'pagado').map((r) => r.id),
                  true,
                )
              }
            >
              <Banknote className="h-3.5 w-3.5" />
              Marcar pagados
            </Button>

            <Button size="icon-sm" variant="ghost" onClick={() => setSeleccion(new Set())}>
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Quitar selección</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Encabezado con el resumen de vencimiento del ciclo. */
export function ResumenVencimiento({ rows }: { rows: PaymentRow[] }) {
  const venc = rows[0]?.fecha_vencimiento;
  if (!venc) return null;
  return (
    <span className="text-[13px] text-muted-foreground">
      Vence el {formatFecha(venc)}
    </span>
  );
}
