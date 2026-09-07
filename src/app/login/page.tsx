import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from './login-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <AuthShell
      titulo="Entra a tu escuela"
      subtitulo="Revisa quién ya pagó y manda los links del ciclo."
      pie={
        <>
          ¿Todavía no tienes cuenta?{' '}
          <Link href="/registro" className="font-medium text-brand-600 hover:underline">
            Crea una gratis
          </Link>
        </>
      }
    >
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
