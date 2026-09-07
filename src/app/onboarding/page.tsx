import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSesionOpcional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard } from './wizard';
import type { Concept, Group } from '@/lib/types';

export const metadata: Metadata = { title: 'Configura tu escuela' };
export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const sesion = await getSesionOpcional();
  if (!sesion) redirect('/login');

  // Si ya terminó el onboarding, no lo hacemos repetirlo.
  if (sesion.school?.onboarding_completo) redirect('/dashboard');

  let grupos: Group[] = [];
  let conceptos: Concept[] = [];
  let totalAlumnos = 0;

  if (sesion.school) {
    const supabase = createClient();
    const [g, c, a] = await Promise.all([
      supabase.from('groups').select('*').eq('school_id', sesion.school.id).order('orden'),
      supabase.from('concepts').select('*').eq('school_id', sesion.school.id).order('created_at'),
      supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', sesion.school.id),
    ]);
    grupos = (g.data as Group[]) ?? [];
    conceptos = (c.data as Concept[]) ?? [];
    totalAlumnos = a.count ?? 0;
  }

  return (
    <OnboardingWizard
      userId={sesion.userId}
      email={sesion.email}
      school={sesion.school}
      gruposIniciales={grupos}
      conceptosIniciales={conceptos}
      totalAlumnosIniciales={totalAlumnos}
      planSugerido={searchParams.plan ?? null}
    />
  );
}
