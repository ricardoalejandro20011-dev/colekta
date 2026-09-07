import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, School } from '@/lib/types';

export interface Sesion {
  userId: string;
  email: string;
  profile: Profile;
  school: School;
}

/**
 * Sesión + escuela. Si no hay usuario manda a /login; si el usuario todavía
 * no tiene escuela, manda al onboarding.
 */
export async function requireSchool(): Promise<Sesion> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  if (!profile?.school_id) redirect('/onboarding');

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('id', profile.school_id)
    .maybeSingle<School>();

  if (!school) redirect('/onboarding');

  return { userId: user.id, email: user.email ?? '', profile, school };
}

/** Igual que requireSchool pero sin redirigir — para el propio onboarding. */
export async function getSesionOpcional(): Promise<{
  userId: string;
  email: string;
  profile: Profile | null;
  school: School | null;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  let school: School | null = null;
  if (profile?.school_id) {
    const { data } = await supabase
      .from('schools')
      .select('*')
      .eq('id', profile.school_id)
      .maybeSingle<School>();
    school = data ?? null;
  }

  return { userId: user.id, email: user.email ?? '', profile: profile ?? null, school };
}
