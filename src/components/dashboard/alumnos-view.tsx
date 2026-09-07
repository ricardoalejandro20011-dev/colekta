'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Download,
  FileSpreadsheet,
  History,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { EmptyState, IlustraAlumnos, IlustraBusqueda } from '@/components/empty-state';
import { createClient } from '@/lib/supabase/client';
import { CSV_PLANTILLA, descargarTexto, parseAlumnosCsv, type ResultadoCsv } from '@/lib/csv';
import { calcTotalConComision, formatMXN } from '@/lib/fees';
import { cn, formatWhatsapp, normalizarTexto, normalizarWhatsapp, whatsappValido } from '@/lib/utils';
import type { Group, Student, StudentStatus } from '@/lib/types';

type AlumnoConGrupo = Student & { grupo_nombre: string | null };

const ESTADO_BADGE: Record<StudentStatus, 'pagado' | 'neutral' | 'outline'> = {
  activo: 'pagado',
  baja: 'neutral',
  egresado: 'outline',
};

export function AlumnosView({
  schoolId,
  alumnos: alumnosIniciales,
  grupos,
}: {
  schoolId: string;
  alumnos: AlumnoConGrupo[];
  grupos: Group[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [alumnos, setAlumnos] = useState(alumnosIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [fGrupo, setFGrupo] = useState('todos');
  const [fEstado, setFEstado] = useState<'todos' | StudentStatus>('activo');

  const montoDeGrupo = useMemo(
    () => new Map(grupos.map((g) => [g.id, Number(g.monto_default)])),
    [grupos],
  );

  function montoEfectivo(a: AlumnoConGrupo): number {
    if (a.monto_custom != null && Number(a.monto_custom) > 0) return Number(a.monto_custom);
    return a.group_id ? (montoDeGrupo.get(a.group_id) ?? 0) : 0;
  }

  const filtrados = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return alumnos.filter((a) => {
      if (fEstado !== 'todos' && a.status !== fEstado) return false;
      if (fGrupo !== 'todos' && (a.group_id ?? 'sin-grupo') !== fGrupo) return false;
      if (!q) return true;
      return (
        normalizarTexto(a.nombre_alumno).includes(q) ||
        normalizarTexto(a.nombre_tutor).includes(q) ||
        a.whatsapp_tutor.includes(q.replace(/\D/g, ''))
      );
    });
  }, [alumnos, busqueda, fGrupo, fEstado]);

  const hayFiltros = busqueda !== '' || fGrupo !== 'todos' || fEstado !== 'activo';

  /* ── Edición en línea ───────────────────────────────────────────── */
  async function actualizar(id: string, patch: Partial<Student>) {
    setAlumnos((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    const { error } = await supabase.from('students').update(patch).eq('id', id);
    if (error) {
      toast.error(error.message);
      router.refresh();
    }
  }

  async function borrar(a: AlumnoConGrupo) {
    const { error } = await supabase.from('students').delete().eq('id', a.id);
    if (error) return toast.error(error.message);
    setAlumnos((prev) => prev.filter((x) => x.id !== a.id));
    toast.success(`${a.nombre_alumno} eliminado`, {
      description: 'También se borraron sus pagos. Si solo quería dejar de cobrarle, use “Dar de baja”.',
    });
  }

  /* ── Alta manual ────────────────────────────────────────────────── */
  const [dialogoAlta, setDialogoAlta] = useState(false);
  const [nuevo, setNuevo] = useState({
    nombre_alumno: '',
    nombre_tutor: '',
    whatsapp_tutor: '',
    email_tutor: '',
    group_id: '',
    monto_custom: '',
  });
  const [guardando, setGuardando] = useState(false);

  async function crearAlumno() {
    if (!nuevo.nombre_alumno.trim()) return toast.error('Falta el nombre del alumno');
    if (!whatsappValido(nuevo.whatsapp_tutor)) {
      return toast.error('El WhatsApp del tutor debe tener 10 dígitos');
    }

    setGuardando(true);
    const { data, error } = await supabase
      .from('students')
      .insert({
        school_id: schoolId,
        group_id: nuevo.group_id || null,
        nombre_alumno: nuevo.nombre_alumno.trim(),
        nombre_tutor: nuevo.nombre_tutor.trim() || `Tutor de ${nuevo.nombre_alumno.trim()}`,
        whatsapp_tutor: normalizarWhatsapp(nuevo.whatsapp_tutor),
        email_tutor: nuevo.email_tutor.trim() || null,
        monto_custom: nuevo.monto_custom ? Number(nuevo.monto_custom) : null,
        status: 'activo',
      })
      .select()
      .single();
    setGuardando(false);

    if (error) return toast.error(error.message);

    const grupo = grupos.find((g) => g.id === data.group_id);
    setAlumnos((prev) => [{ ...(data as Student), grupo_nombre: grupo?.nombre ?? null }, ...prev]);
    setNuevo({
      nombre_alumno: '',
      nombre_tutor: '',
      whatsapp_tutor: '',
      email_tutor: '',
      group_id: nuevo.group_id,
      monto_custom: '',
    });
    setDialogoAlta(false);
    toast.success('Alumno agregado');
  }

  /* ── Importación CSV ────────────────────────────────────────────── */
  const [dialogoCsv, setDialogoCsv] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<ResultadoCsv | null>(null);
  const [importando, setImportando] = useState(false);

  async function leerArchivo(file: File) {
    const res = parseAlumnosCsv(await file.text());
    setCsv(res);
    if (!res.filas.length) toast.error('No encontré alumnos válidos en ese archivo');
  }

  async function importar() {
    if (!csv?.filas.length) return;
    setImportando(true);
    try {
      // Crear grupos nuevos que aparezcan en el CSV
      const existentes = new Map(grupos.map((g) => [g.nombre.toLowerCase(), g.id]));
      const faltantes = csv.gruposDetectados.filter((n) => !existentes.has(n.toLowerCase()));

      if (faltantes.length) {
        const montos = new Map<string, number>();
        for (const f of csv.filas) {
          if (f.grupo && f.monto && !montos.has(f.grupo)) montos.set(f.grupo, f.monto);
        }
        const { data, error } = await supabase
          .from('groups')
          .insert(
            faltantes.map((nombre, i) => ({
              school_id: schoolId,
              nombre,
              monto_default: montos.get(nombre) ?? 0,
              orden: grupos.length + i,
            })),
          )
          .select();
        if (error) throw error;
        for (const g of (data as Group[]) ?? []) existentes.set(g.nombre.toLowerCase(), g.id);
      }

      const filas = csv.filas.map((f) => ({
        school_id: schoolId,
        group_id: f.grupo ? (existentes.get(f.grupo.toLowerCase()) ?? null) : null,
        nombre_alumno: f.nombre_alumno,
        nombre_tutor: f.nombre_tutor,
        whatsapp_tutor: f.whatsapp_tutor,
        email_tutor: f.email_tutor,
        monto_custom: f.monto,
        status: 'activo' as const,
      }));

      let total = 0;
      for (let i = 0; i < filas.length; i += 200) {
        const { error } = await supabase.from('students').insert(filas.slice(i, i + 200));
        if (error) throw error;
        total += Math.min(200, filas.length - i);
      }

      toast.success(`${total} alumnos importados`);
      setCsv(null);
      setDialogoCsv(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falló la importación');
    } finally {
      setImportando(false);
    }
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar alumno o tutor…"
            className="h-9 pl-9"
          />
        </div>

        <Select value={fGrupo} onValueChange={setFGrupo}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
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

        <Select value={fEstado} onValueChange={(v) => setFEstado(v as typeof fEstado)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="baja">Bajas</SelectItem>
            <SelectItem value="egresado">Egresados</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>

        {hayFiltros && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setBusqueda('');
              setFGrupo('todos');
              setFEstado('activo');
            }}
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDialogoCsv(true)}>
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Importar CSV
          </Button>
          <Button variant="brand" size="sm" onClick={() => setDialogoAlta(true)}>
            <UserPlus className="h-3.5 w-3.5" />
            Agregar alumno
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-subtle">
        {filtrados.length === 0 ? (
          alumnos.length === 0 ? (
            <EmptyState
              icon={<IlustraAlumnos />}
              title="Todavía no tienes alumnos"
              description="Importa tu lista en CSV — es lo más rápido — o agrega el primero a mano."
              action={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDialogoCsv(true)}>
                    <Upload className="h-3.5 w-3.5" />
                    Importar CSV
                  </Button>
                  <Button variant="brand" size="sm" onClick={() => setDialogoAlta(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar alumno
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={<IlustraBusqueda />}
              title="Ningún alumno coincide"
              description="Cambia el grupo, el estatus o limpia la búsqueda."
            />
          )
        ) : (
          <div className="overflow-x-auto thin-scrollbar">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#111111]/[0.08] bg-[#111111]/[0.015] text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Alumno</th>
                  <th className="px-4 py-2.5 font-semibold">Grupo</th>
                  <th className="px-4 py-2.5 font-semibold">Tutor</th>
                  <th className="px-4 py-2.5 font-semibold">WhatsApp</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Monto propio</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Cobra</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Paga el tutor</th>
                  <th className="px-4 py-2.5 font-semibold">Estatus</th>
                  <th className="w-10 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a) => {
                  const monto = montoEfectivo(a);
                  return (
                    <tr
                      key={a.id}
                      className={cn(
                        'border-b border-[#111111]/[0.05] text-[13px] transition-colors hover:bg-[#111111]/[0.02]',
                        a.status !== 'activo' && 'opacity-60',
                      )}
                    >
                      <td className="max-w-[240px] px-4 py-2">
                        <Link
                          href={`/dashboard/alumnos/${a.id}`}
                          className="block truncate font-medium text-ink hover:text-brand-600 hover:underline"
                        >
                          {a.nombre_alumno}
                        </Link>
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          value={a.group_id ?? 'sin-grupo'}
                          onValueChange={(v) =>
                            actualizar(a.id, { group_id: v === 'sin-grupo' ? null : v })
                          }
                        >
                          <SelectTrigger className="h-8 w-[140px] text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin-grupo">Sin grupo</SelectItem>
                            {grupos.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-2 text-muted-foreground">
                        {a.nombre_tutor}
                      </td>
                      <td className="tnum px-4 py-2 text-muted-foreground">
                        {formatWhatsapp(a.whatsapp_tutor)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={a.monto_custom ?? ''}
                          placeholder="del grupo"
                          onBlur={(e) => {
                            const v = e.target.value ? Number(e.target.value) : null;
                            if (v !== (a.monto_custom ?? null)) {
                              actualizar(a.id, { monto_custom: v });
                            }
                          }}
                          className="tnum ml-auto h-8 w-28 text-right text-[12px]"
                        />
                      </td>
                      <td className="tnum px-4 py-2 text-right">
                        {monto > 0 ? (
                          formatMXN(monto)
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <TriangleAlert className="h-3 w-3" />
                            sin monto
                          </span>
                        )}
                      </td>
                      <td className="tnum px-4 py-2 text-right text-muted-foreground">
                        {monto > 0 ? formatMXN(calcTotalConComision(monto)) : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={ESTADO_BADGE[a.status]}>
                          {a.status === 'activo'
                            ? 'Activo'
                            : a.status === 'baja'
                              ? 'Baja'
                              : 'Egresado'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>{a.nombre_alumno}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/alumnos/${a.id}`}>
                                <History />
                                Ver historial de pagos
                              </Link>
                            </DropdownMenuItem>
                            {a.status === 'activo' ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => actualizar(a.id, { status: 'baja' })}
                                >
                                  <UserMinus />
                                  Dar de baja
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => actualizar(a.id, { status: 'egresado' })}
                                >
                                  Marcar como egresado
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => actualizar(a.id, { status: 'activo' })}
                              >
                                <UserPlus />
                                Reactivar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem destructive onClick={() => borrar(a)}>
                              <Trash2 />
                              Eliminar definitivamente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtrados.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#111111]/[0.07] px-4 py-2.5 text-[12px] text-muted-foreground">
            <span className="tnum">
              {filtrados.length} de {alumnos.length} alumnos
            </span>
            <span className="tnum">
              Colegiatura sumada:{' '}
              {formatMXN(filtrados.reduce((acc, a) => acc + montoEfectivo(a), 0))}
            </span>
          </div>
        )}
      </div>

      {/* Diálogo: alta manual */}
      <Dialog open={dialogoAlta} onOpenChange={setDialogoAlta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar alumno</DialogTitle>
            <DialogDescription>
              Si no le pones monto propio, se le cobra el del grupo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="n-alumno">Nombre del alumno</Label>
              <Input
                id="n-alumno"
                value={nuevo.nombre_alumno}
                onChange={(e) => setNuevo({ ...nuevo, nombre_alumno: e.target.value })}
                placeholder="Renata Ibarra Solís"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-grupo">Grupo</Label>
              <Select
                value={nuevo.group_id}
                onValueChange={(v) => setNuevo({ ...nuevo, group_id: v })}
              >
                <SelectTrigger id="n-grupo">
                  <SelectValue placeholder="Sin grupo" />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nombre}
                      {g.monto_default ? ` · ${formatMXN(g.monto_default)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-monto">Monto propio (opcional)</Label>
              <Input
                id="n-monto"
                type="number"
                min={0}
                step="0.01"
                className="tnum"
                value={nuevo.monto_custom}
                onChange={(e) => setNuevo({ ...nuevo, monto_custom: e.target.value })}
                placeholder="Becado o descuento"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-tutor">Nombre del tutor</Label>
              <Input
                id="n-tutor"
                value={nuevo.nombre_tutor}
                onChange={(e) => setNuevo({ ...nuevo, nombre_tutor: e.target.value })}
                placeholder="Mariana Solís"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-wa">WhatsApp del tutor</Label>
              <Input
                id="n-wa"
                inputMode="tel"
                value={nuevo.whatsapp_tutor}
                onChange={(e) => setNuevo({ ...nuevo, whatsapp_tutor: e.target.value })}
                placeholder="55 1234 5678"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="n-email">Correo del tutor (opcional)</Label>
              <Input
                id="n-email"
                type="email"
                value={nuevo.email_tutor}
                onChange={(e) => setNuevo({ ...nuevo, email_tutor: e.target.value })}
                placeholder="mariana@ejemplo.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogoAlta(false)}>
              Cancelar
            </Button>
            <Button variant="brand" onClick={crearAlumno} loading={guardando}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: importar CSV */}
      <Dialog
        open={dialogoCsv}
        onOpenChange={(v) => {
          setDialogoCsv(v);
          if (!v) setCsv(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar alumnos desde CSV</DialogTitle>
            <DialogDescription>
              Columnas: nombre_alumno, grupo, monto, nombre_tutor, whatsapp_tutor y email_tutor
              opcional. Los grupos que no existan se crean solos.
            </DialogDescription>
          </DialogHeader>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void leerArchivo(f);
            }}
            className="rounded-[12px] border border-dashed border-[#111111]/15 bg-[#111111]/[0.015] px-6 py-8 text-center"
          >
            <Upload className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={1.6} />
            <p className="mt-3 text-[13px] font-medium">Arrastra tu archivo aquí</p>
            <input
              ref={inputArchivo}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void leerArchivo(f);
              }}
            />
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => inputArchivo.current?.click()}>
                Seleccionar archivo
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => descargarTexto('plantilla-colekta.csv', CSV_PLANTILLA)}
              >
                <Download className="h-3.5 w-3.5" />
                Plantilla
              </Button>
            </div>
          </div>

          {csv && (
            <div className="rounded-[12px] border border-[#111111]/[0.09]">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#111111]/[0.07] px-4 py-2.5">
                <Badge variant="pagado">{csv.filas.length} válidos</Badge>
                {csv.errores.length > 0 && (
                  <Badge variant="atrasado">{csv.errores.length} con problema</Badge>
                )}
                {csv.gruposDetectados.length > 0 && (
                  <Badge variant="outline">{csv.gruposDetectados.length} grupos</Badge>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto thin-scrollbar px-4 py-2 text-[12px]">
                {csv.filas.slice(0, 40).map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-[#111111]/[0.05] py-1 last:border-0"
                  >
                    <span className="font-medium">{f.nombre_alumno}</span>
                    <span className="text-muted-foreground">
                      {f.grupo || 'sin grupo'} · {f.monto ? formatMXN(f.monto) : 'monto del grupo'}
                    </span>
                  </div>
                ))}
              </div>
              {csv.errores.length > 0 && (
                <div className="border-t border-[#111111]/[0.07] bg-red-50/50 px-4 py-3">
                  <ul className="max-h-24 space-y-1 overflow-y-auto text-[11px] text-red-700">
                    {csv.errores.slice(0, 15).map((e, i) => (
                      <li key={i}>
                        Línea {e.linea}: {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogoCsv(false)}>
              Cancelar
            </Button>
            <Button
              variant="brand"
              onClick={importar}
              loading={importando}
              disabled={!csv?.filas.length}
            >
              Importar {csv?.filas.length ?? 0} alumnos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
