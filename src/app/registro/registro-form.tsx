'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { APP_URL } from '@/lib/utils';

export function RegistroForm() {
  const router = useRouter();
  const params = useSearchParams();
  const planPreferido = params.get('plan');

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.');
      return;
    }

    setCargando(true);
    const supabase = createClient();

    const destino = planPreferido
      ? `/onboarding?plan=${encodeURIComponent(planPreferido)}`
      : '/onboarding';

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { nombre: nombre.trim() },
        emailRedirectTo: `${APP_URL}${destino}`,
      },
    });

    if (err) {
      setError(
        err.message === 'User already registered'
          ? 'Ese correo ya tiene cuenta. Entra desde el login.'
          : err.message,
      );
      setCargando(false);
      return;
    }

    // Si el proyecto tiene confirmación de correo activada no hay sesión todavía.
    if (!data.session) {
      setConfirmar(true);
      setCargando(false);
      return;
    }

    toast.success('Cuenta creada. Vamos a configurar tu escuela.');
    router.push(destino);
    router.refresh();
  }

  if (confirmar) {
    return (
      <div className="rounded-[12px] border border-[#111111]/[0.09] bg-white p-6 shadow-subtle">
        <MailCheck className="h-6 w-6 text-brand-500" strokeWidth={1.7} />
        <h2 className="mt-4 text-[15px] font-semibold tracking-[-0.01em]">
          Confirma tu correo
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Te mandamos un link a <strong className="text-ink">{email}</strong>. Ábrelo y sigues
          justo en la configuración de tu escuela.
        </p>
        <p className="mt-4 text-[12px] text-muted-foreground">
          ¿No llegó? Revisa spam o promociones. También puedes desactivar la confirmación de
          correo en Supabase &rsaquo; Authentication &rsaquo; Providers &rsaquo; Email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nombre">Tu nombre</Label>
        <Input
          id="nombre"
          required
          autoComplete="name"
          placeholder="Directora, administradora o dueño"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="direccion@tuescuela.mx"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={verPass ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVerPass((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[6px] p-1.5 text-muted-foreground hover:bg-[#111111]/[0.05]"
            aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {verPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="brand" className="w-full" size="lg" loading={cargando}>
        Crear cuenta
      </Button>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Al crear tu cuenta aceptas que usemos tus datos únicamente para operar la cobranza de tu
        escuela.
      </p>
    </form>
  );
}
