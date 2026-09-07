import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegistroForm } from './registro-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function RegistroPage() {
  return (
    <AuthShell
      titulo="Crea tu cuenta"
      subtitulo="En el siguiente paso configuras tu escuela, tus grupos y tus alumnos."
      pie={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Entra aquí
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <RegistroForm />
      </Suspense>
    </AuthShell>
  );
}
