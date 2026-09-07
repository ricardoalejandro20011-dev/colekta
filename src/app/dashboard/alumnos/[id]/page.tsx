import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { requireSchool } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { HistorialAlumno } from '@/components/dashboard/historial-alumno';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMXN } from '@/lib/fees';
import { formatFechaHora, formatWhatsapp, initials } from '@/lib/utils';
import type { PaymentRow, Student, WhatsappLog } from '@/lib/types';

export const metadata: Metadata = { title: 'Historial del alumno' };
export const dynamic = 'force-dynamic';

type FilaAlumno = Student & { groups: { nombre: string; monto_default: number } | null };

export default async function AlumnoPage({ params }: { params: { id: string } }) {
  const { school } = await requireSchool();
  const supabase = createClient();

  const { data: alumno } = await supabase
    .from('students')
    .select('*, groups ( nombre, monto_default )')
    .eq('id', params.id)
    .eq('school_id', school.id)
    .maybeSingle<FilaAlumno>();

  if (!alumno) notFound();

  const [pagosRes, logsRes] = await Promise.all([
    supabase
      .from('v_payment_rows')
      .select('*')
      .eq('student_id', alumno.id)
      .order('ciclo', { ascending: false })
      .returns<PaymentRow[]>(),
    supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('to', alumno.whatsapp_tutor)
      .order('created_at', { ascending: false })
      .limit(15)
      .returns<WhatsappLog[]>(),
  ]);

  const pagos = pagosRes.data ?? [];
  const logs = logsRes.data ?? [];

  const pagado = pagos
    .filter((p) => p.status === 'pagado')
    .reduce((a, p) => a + Number(p.monto_concepto), 0);
  const adeudo = pagos
    .filter((p) => p.status !== 'pagado')
    .reduce((a, p) => a + Number(p.monto_concepto), 0);
  const atrasados = pagos.filter((p) => p.status === 'atrasado').length;

  const montoEfectivo =
    alumno.monto_custom != null && Number(alumno.monto_custom) > 0
      ? Number(alumno.monto_custom)
      : Number(alumno.groups?.monto_default ?? 0);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[#111111]/[0.08] bg-white/90 px-6 py-4 backdrop-blur-md lg:px-8">
        <Link
          href="/dashboard/alumnos"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Alumnos
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">
            {initials(alumno.nombre_alumno)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[20px] font-semibold tracking-[-0.025em] text-ink">
              {alumno.nombre_alumno}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              {alumno.groups?.nombre ?? 'Sin grupo'} · Tutor {alumno.nombre_tutor} ·{' '}
              <span className="tnum">{formatWhatsapp(alumno.whatsapp_tutor)}</span>
            </p>
          </div>
          <Badge
            variant={alumno.status === 'activo' ? 'pagado' : 'neutral'}
            className="ml-auto"
          >
            {alumno.status === 'activo'
              ? 'Activo'
              : alumno.status === 'baja'
                ? 'Baja'
                : 'Egresado'}
          </Badge>
        </div>
      </header>

      <div className="flex-1 space-y-5 px-6 py-6 lg:px-8">
        {/* Resumen */}
        <div className="flex flex-wrap divide-x divide-[#111111]/[0.07] rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-subtle">
          {[
            { l: 'Colegiatura vigente', v: montoEfectivo > 0 ? formatMXN(montoEfectivo) : 'Sin monto' },
            { l: 'Total pagado', v: formatMXN(pagado) },
            { l: 'Adeudo', v: formatMXN(adeudo) },
            { l: 'Pagos vencidos', v: String(atrasados) },
            { l: 'Pagos registrados', v: String(pagos.length) },
          ].map((k) => (
            <div key={k.l} className="min-w-0 flex-1 px-5 py-4">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {k.l}
              </p>
              <p className="tnum mt-1.5 text-[20px] font-semibold tracking-[-0.025em] text-ink">
                {k.v}
              </p>
            </div>
          ))}
        </div>

        {/* Historial */}
        <section className="overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-subtle">
          <div className="flex items-center justify-between border-b border-[#111111]/[0.07] px-5 py-3.5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Historial de pagos</h2>
            <span className="text-[12px] text-muted-foreground">
              Del más reciente al más antiguo
            </span>
          </div>
          <HistorialAlumno pagos={pagos} />
        </section>

        {/* Bitácora WhatsApp */}
        <section className="overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-subtle">
          <div className="flex items-center justify-between border-b border-[#111111]/[0.07] px-5 py-3.5">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
              Mensajes al tutor
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/whatsapp">
                <MessageCircle className="h-3.5 w-3.5" />
                Ver bitácora completa
              </Link>
            </Button>
          </div>

          {logs.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">
              Todavía no le mandas ningún mensaje a este tutor.
            </p>
          ) : (
            <ul className="divide-y divide-[#111111]/[0.06]">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start gap-4 px-5 py-3">
                  <Badge
                    variant={
                      l.status === 'enviado'
                        ? 'pagado'
                        : l.status === 'en_cola'
                          ? 'pendiente'
                          : 'atrasado'
                    }
                  >
                    {l.status === 'enviado' ? 'Enviado' : l.status === 'en_cola' ? 'En cola' : 'Falló'}
                  </Badge>
                  <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-muted-foreground">
                    {l.message}
                    {l.error ? (
                      <span className="mt-1 block text-red-600">{l.error}</span>
                    ) : null}
                  </p>
                  <span className="tnum shrink-0 text-[11px] text-muted-foreground">
                    {formatFechaHora(l.sent_at ?? l.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
