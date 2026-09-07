import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearPreferencia, getMpCreds } from '@/lib/mercadopago';
import { cicloLabel } from '@/lib/utils';
import type { Payment, School } from '@/lib/types';

/**
 * Monto limpio que le toca a un alumno para un concepto.
 * Prioridad: monto fijo del concepto > monto propio del alumno > monto del grupo.
 */
export function resolverMonto(args: {
  conceptoMontoFijo: number | null;
  alumnoMontoCustom: number | null;
  grupoMontoDefault: number | null;
}): number {
  if (args.conceptoMontoFijo != null && args.conceptoMontoFijo > 0) {
    return Number(args.conceptoMontoFijo);
  }
  if (args.alumnoMontoCustom != null && args.alumnoMontoCustom > 0) {
    return Number(args.alumnoMontoCustom);
  }
  return Number(args.grupoMontoDefault ?? 0);
}

/**
 * Devuelve el preference_id del pago, creándolo en Mercado Pago si hace falta.
 * Se llama tanto al generar el ciclo como al abrir /p/[token] (perezoso), para
 * que un fallo de MP al generar 400 links no deje pagos sin forma de cobrarse.
 */
export async function asegurarPreferencia(
  db: SupabaseClient,
  payment: Pick<
    Payment,
    'id' | 'link_token' | 'monto_total_cobrado' | 'mp_preference_id' | 'fecha_vencimiento' | 'ciclo'
  >,
  school: Pick<School, 'id' | 'name' | 'mp_access_token' | 'mp_public_key'>,
  contexto: {
    conceptoNombre: string;
    alumnoNombre: string;
    tutorNombre?: string | null;
    tutorEmail?: string | null;
  },
): Promise<{ preferenceId: string | null; error: string | null }> {
  if (payment.mp_preference_id) {
    return { preferenceId: payment.mp_preference_id, error: null };
  }

  const creds = getMpCreds(school);
  if (!creds) {
    return {
      preferenceId: null,
      error:
        'La escuela todavía no conecta Mercado Pago. Configúralo en Ajustes > Integraciones.',
    };
  }

  try {
    const pref = await crearPreferencia({
      accessToken: creds.accessToken,
      paymentId: payment.id,
      linkToken: payment.link_token,
      schoolId: school.id,
      titulo: `${contexto.conceptoNombre} ${cicloLabel(payment.ciclo)} — ${contexto.alumnoNombre}`,
      total: Number(payment.monto_total_cobrado),
      nombreTutor: contexto.tutorNombre,
      emailTutor: contexto.tutorEmail,
      fechaVencimiento: payment.fecha_vencimiento,
    });

    await db
      .from('payments')
      .update({ mp_preference_id: pref.id, mp_init_point: pref.init_point })
      .eq('id', payment.id);

    return { preferenceId: pref.id, error: null };
  } catch (e) {
    return {
      preferenceId: null,
      error: e instanceof Error ? e.message : 'Mercado Pago no respondió',
    };
  }
}
