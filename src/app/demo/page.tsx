import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { DemoForm } from './demo-form';

export const metadata: Metadata = { title: 'Solicitar demo' };

export default function DemoPage() {
  return (
    <AuthShell
      titulo="Solicita una demo"
      subtitulo="Te mostramos Kolek con datos parecidos a los de tu escuela, no una presentación genérica."
      pie={
        <>
          ¿Prefieres explorarlo tú mismo?{' '}
          <Link href="/registro" className="font-medium text-brand-600 hover:underline">
            Crea tu cuenta
          </Link>
        </>
      }
    >
      <DemoForm />
    </AuthShell>
  );
}
