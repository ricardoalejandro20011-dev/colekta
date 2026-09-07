import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLAN_POR_ID } from '@/lib/plans';
import type { Profile, School } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email(),
  nombre: z.string().min(1).max(120),
  role: z.enum(['admin', 'staff']).default('staff'),
});

/** Límite de usuarios por plan. Pro es ilimitado. */
const LIMITE_USUARIOS: Record<string, number> = {
  inicio: 1,
  crecimiento: 3,
  pro: Number.POSITIVE_INFINITY,
};

/**
 * POST /api/team/invite
 * Crea la cuenta del compañero de trabajo y lo liga a la escuela del que
 * invita. Devuelve una contraseña temporal que se muestra UNA sola vez.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: yo } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  if (!yo?.school_id) {
    return NextResponse.json({ error: 'No perteneces a ninguna escuela' }, { status: 403 });
  }
  if (yo.role === 'staff') {
    return NextResponse.json(
      { error: 'Solo el dueño o un administrador puede invitar usuarios' },
      { status: 403 },
    );
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

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', yo.school_id)
    .maybeSingle<School>();
  if (!school) return NextResponse.json({ error: 'Escuela no encontrada' }, { status: 404 });

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', school.id);

  const limite = LIMITE_USUARIOS[school.plan] ?? 1;
  if ((count ?? 0) >= limite) {
    const plan = PLAN_POR_ID[school.plan];
    return NextResponse.json(
      {
        error: `Tu plan ${plan?.nombre ?? school.plan} incluye ${limite} usuario${
          limite === 1 ? '' : 's'
        }. Sube de plan para agregar más.`,
      },
      { status: 402 },
    );
  }

  const admin = createAdminClient();
  // Contraseña temporal legible pero fuerte; el usuario la cambia al entrar.
  const passwordTemporal = `Colekta-${crypto.randomBytes(6).toString('base64url')}`;

  const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
    email: body.email.trim().toLowerCase(),
    password: passwordTemporal,
    email_confirm: true,
    user_metadata: { nombre: body.nombre.trim() },
  });

  if (errCrear || !creado?.user) {
    const msg = errCrear?.message ?? 'No se pudo crear el usuario';
    return NextResponse.json(
      {
        error: msg.includes('already registered')
          ? 'Ese correo ya tiene cuenta en COLEKTA. Pídele que entre y contáctanos para moverlo de escuela.'
          : msg,
      },
      { status: 400 },
    );
  }

  // El trigger de auth.users ya creó el profile; lo ligamos a la escuela.
  const { error: errPerfil } = await admin
    .from('profiles')
    .upsert({
      id: creado.user.id,
      school_id: school.id,
      nombre: body.nombre.trim(),
      email: body.email.trim().toLowerCase(),
      role: body.role,
    });

  if (errPerfil) {
    return NextResponse.json({ error: errPerfil.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    email: body.email.trim().toLowerCase(),
    password_temporal: passwordTemporal,
  });
}

const BodyDelete = z.object({ profile_id: z.string().uuid() });

/** DELETE /api/team/invite — saca a un usuario de la escuela (no borra su cuenta). */
export async function DELETE(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: yo } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  if (!yo?.school_id || yo.role === 'staff') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  let body: z.infer<typeof BodyDelete>;
  try {
    body = BodyDelete.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  if (body.profile_id === yo.id) {
    return NextResponse.json({ error: 'No puedes quitarte a ti mismo' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ school_id: null, role: 'staff' })
    .eq('id', body.profile_id)
    .eq('school_id', yo.school_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
