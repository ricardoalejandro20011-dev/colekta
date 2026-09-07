import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calcTotalConComision } from '@/lib/fees';
import { asegurarPreferencia, resolverMonto } from '@/lib/payments';
import { mapLimit, vencimientoDeCiclo } from '@/lib/utils';
import type { Concept, Group, School, Student } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  school_id: z.string().uuid(),
  ciclo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El ciclo debe ser YYYY-MM'),
  concept_id: z.string().uuid(),
  /** Vacío = todos los grupos, incluidos los alumnos sin grupo. */
  group_ids: z.array(z.string().uuid()).optional().default([]),
  /** Opcional: sobreescribe la fecha de vencimiento calculada. */
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /api/payments/generate-cycle
 *
 * Crea los pagos faltantes del ciclo para todos los alumnos ACTIVOS de los
 * grupos indicados, calcula el total con comisión y genera la preference de
 * Mercado Pago de cada uno. Es idempotente: si el pago ya existe, lo salta.
 */
export async function POST(req: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof z.ZodError ? e.errors[0]?.message : 'Cuerpo inválido' },
      { status: 400 },
    );
  }

  // RLS ya limita a la escuela del usuario; esto confirma que el id coincide.
  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', body.school_id)
    .maybeSingle<School>();

  if (!school) {
    return NextResponse.json({ error: 'Escuela no encontrada' }, { status: 403 });
  }

  const { data: concept } = await supabase
    .from('concepts')
    .select('*')
    .eq('id', body.concept_id)
    .eq('school_id', school.id)
    .maybeSingle<Concept>();

  if (!concept) {
    return NextResponse.json({ error: 'Concepto no encontrado' }, { status: 404 });
  }

  // ── Alumnos activos ────────────────────────────────────────────────
  let qStudents = supabase
    .from('students')
    .select('id, group_id, nombre_alumno, nombre_tutor, email_tutor, monto_custom')
    .eq('school_id', school.id)
    .eq('status', 'activo');

  if (body.group_ids.length > 0) {
    qStudents = qStudents.in('group_id', body.group_ids);
  }

  const { data: students, error: errStudents } = await qStudents;
  if (errStudents) {
    return NextResponse.json({ error: errStudents.message }, { status: 500 });
  }
  if (!students?.length) {
    return NextResponse.json(
      { error: 'No hay alumnos activos en esos grupos' },
      { status: 422 },
    );
  }

  const { data: groups } = await supabase
    .from('groups')
    .select('id, monto_default')
    .eq('school_id', school.id);

  const montoGrupo = new Map<string, number>(
    ((groups as Pick<Group, 'id' | 'monto_default'>[]) ?? []).map((g) => [
      g.id,
      Number(g.monto_default),
    ]),
  );

  // ── Qué pagos ya existen para este ciclo/concepto ──────────────────
  const { data: existentes } = await supabase
    .from('payments')
    .select('student_id')
    .eq('school_id', school.id)
    .eq('concept_id', concept.id)
    .eq('ciclo', body.ciclo);

  const yaTienen = new Set((existentes ?? []).map((p) => p.student_id as string));

  const fechaVenc =
    body.fecha_vencimiento ?? vencimientoDeCiclo(body.ciclo, school.dia_vencimiento);

  const sinMonto: string[] = [];
  const nuevos = (students as Pick<
    Student,
    'id' | 'group_id' | 'nombre_alumno' | 'nombre_tutor' | 'email_tutor' | 'monto_custom'
  >[])
    .filter((s) => !yaTienen.has(s.id))
    .map((s) => {
      const monto = resolverMonto({
        conceptoMontoFijo: concept.monto_fijo,
        alumnoMontoCustom: s.monto_custom,
        grupoMontoDefault: s.group_id ? (montoGrupo.get(s.group_id) ?? 0) : 0,
      });
      if (monto <= 0) sinMonto.push(s.nombre_alumno);
      return { student: s, monto };
    })
    .filter((x) => x.monto > 0);

  if (nuevos.length === 0) {
    return NextResponse.json({
      creados: 0,
      omitidos_ya_existian: yaTienen.size,
      sin_monto: sinMonto,
      preferencias_creadas: 0,
      mensaje:
        sinMonto.length > 0
          ? 'Ningún alumno tiene monto asignado. Define el monto del grupo o del alumno.'
          : 'Todos los alumnos ya tenían su pago de este ciclo.',
    });
  }

  // ── Insertar pagos ─────────────────────────────────────────────────
  const filas = nuevos.map(({ student, monto }) => ({
    school_id: school.id,
    student_id: student.id,
    concept_id: concept.id,
    ciclo: body.ciclo,
    monto_concepto: monto,
    monto_total_cobrado: calcTotalConComision(monto),
    fecha_vencimiento: fechaVenc,
    status: 'pendiente' as const,
  }));

  const creados: {
    id: string;
    link_token: string;
    monto_total_cobrado: number;
    mp_preference_id: string | null;
    fecha_vencimiento: string;
    ciclo: string;
    student_id: string;
  }[] = [];

  for (let i = 0; i < filas.length; i += 200) {
    const { data, error } = await supabase
      .from('payments')
      .insert(filas.slice(i, i + 200))
      .select(
        'id, link_token, monto_total_cobrado, mp_preference_id, fecha_vencimiento, ciclo, student_id',
      );
    if (error) {
      return NextResponse.json(
        { error: `No se pudieron crear los pagos: ${error.message}`, creados: creados.length },
        { status: 500 },
      );
    }
    creados.push(...(data as typeof creados));
  }

  // ── Preferences de Mercado Pago (concurrencia limitada) ────────────
  const porAlumno = new Map(nuevos.map(({ student }) => [student.id, student]));
  let preferenciasCreadas = 0;
  let errorMp: string | null = null;

  const resultados = await mapLimit(creados, 6, async (p) => {
    const s = porAlumno.get(p.student_id);
    return asegurarPreferencia(supabase, p, school, {
      conceptoNombre: concept.nombre,
      alumnoNombre: s?.nombre_alumno ?? 'Alumno',
      tutorNombre: s?.nombre_tutor,
      tutorEmail: s?.email_tutor,
    });
  });

  for (const r of resultados) {
    if (r.preferenceId) preferenciasCreadas++;
    else if (!errorMp && r.error) errorMp = r.error;
  }

  return NextResponse.json({
    creados: creados.length,
    omitidos_ya_existian: yaTienen.size,
    sin_monto: sinMonto,
    preferencias_creadas: preferenciasCreadas,
    // Los links funcionan aunque MP falle: /p/[token] reintenta al abrirse.
    aviso_mp: preferenciasCreadas < creados.length ? errorMp : null,
  });
}
