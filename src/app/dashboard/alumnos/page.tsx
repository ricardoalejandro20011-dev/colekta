import type { Metadata } from 'next';
import { requireSchool } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AlumnosView } from '@/components/dashboard/alumnos-view';
import type { Group, Student } from '@/lib/types';

export const metadata: Metadata = { title: 'Alumnos' };
export const dynamic = 'force-dynamic';

type FilaAlumno = Student & { groups: { nombre: string } | null };

export default async function AlumnosPage() {
  const { school } = await requireSchool();
  const supabase = createClient();

  const [alumnosRes, gruposRes] = await Promise.all([
    supabase
      .from('students')
      .select('*, groups ( nombre )')
      .eq('school_id', school.id)
      .order('nombre_alumno')
      .limit(5000)
      .returns<FilaAlumno[]>(),
    supabase
      .from('groups')
      .select('*')
      .eq('school_id', school.id)
      .order('orden')
      .returns<Group[]>(),
  ]);

  const alumnos = (alumnosRes.data ?? []).map(({ groups, ...a }) => ({
    ...a,
    grupo_nombre: groups?.nombre ?? null,
  }));

  const activos = alumnos.filter((a) => a.status === 'activo').length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[#111111]/[0.08] bg-white/90 px-6 py-4 backdrop-blur-md lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-ink">Alumnos</h1>
        <p className="text-[13px] text-muted-foreground">
          {activos} activos de {alumnos.length} registrados · {gruposRes.data?.length ?? 0} grupos
        </p>
      </header>

      <div className="flex-1 px-6 py-6 lg:px-8">
        <AlumnosView schoolId={school.id} alumnos={alumnos} grupos={gruposRes.data ?? []} />
      </div>
    </div>
  );
}
