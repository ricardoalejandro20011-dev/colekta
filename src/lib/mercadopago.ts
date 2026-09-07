import { APP_URL } from '@/lib/utils';

const MP_API = 'https://api.mercadopago.com';

export interface MpCreds {
  accessToken: string;
  publicKey: string | null;
  /** true si vienen del .env de la plataforma en vez de la escuela. */
  fallback: boolean;
}

/**
 * Credenciales de Mercado Pago de la escuela, con fallback a las de
 * plataforma. Cada escuela puede conectar su propia cuenta en /dashboard/settings
 * para que el dinero le caiga directo a ella.
 */
export function getMpCreds(school: {
  mp_access_token?: string | null;
  mp_public_key?: string | null;
}): MpCreds | null {
  const propio = school.mp_access_token?.trim();
  if (propio) {
    return {
      accessToken: propio,
      publicKey: school.mp_public_key?.trim() || null,
      fallback: false,
    };
  }
  const env = process.env.MP_ACCESS_TOKEN?.trim();
  if (env) {
    return {
      accessToken: env,
      publicKey: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim() || null,
      fallback: true,
    };
  }
  return null;
}

export interface CrearPreferenciaInput {
  accessToken: string;
  paymentId: string;
  linkToken: string;
  /** Viaja en la notification_url para que el webhook sepa con qué token consultar. */
  schoolId: string;
  titulo: string;
  /** Total CON comisión: es lo que el tutor paga. */
  total: number;
  emailTutor?: string | null;
  nombreTutor?: string | null;
  /** 'YYYY-MM-DD' */
  fechaVencimiento?: string | null;
}

export interface PreferenciaCreada {
  id: string;
  init_point: string;
  sandbox_init_point: string | null;
}

/**
 * Crea una preference de Checkout. El `id` alimenta el Wallet Brick en
 * /p/[token] y `external_reference` es el payment.id para que el webhook
 * sepa exactamente qué pago conciliar.
 */
export async function crearPreferencia(
  input: CrearPreferenciaInput,
): Promise<PreferenciaCreada> {
  const body: Record<string, unknown> = {
    items: [
      {
        id: input.paymentId,
        title: input.titulo.slice(0, 250),
        quantity: 1,
        currency_id: 'MXN',
        unit_price: Number(input.total.toFixed(2)),
      },
    ],
    external_reference: input.paymentId,
    statement_descriptor: 'COLEKTA',
    binary_mode: true, // sin estado "in_process": o se aprueba o se rechaza
    back_urls: {
      success: `${APP_URL}/p/${input.linkToken}?estado=success`,
      pending: `${APP_URL}/p/${input.linkToken}?estado=pending`,
      failure: `${APP_URL}/p/${input.linkToken}?estado=failure`,
    },
    auto_return: 'approved',
    notification_url: `${APP_URL}/api/webhooks/mercadopago?school=${input.schoolId}`,
    metadata: { payment_id: input.paymentId, origen: 'colekta' },
  };

  if (input.emailTutor || input.nombreTutor) {
    body.payer = {
      ...(input.nombreTutor ? { name: input.nombreTutor.slice(0, 100) } : {}),
      ...(input.emailTutor ? { email: input.emailTutor } : {}),
    };
  }

  if (input.fechaVencimiento) {
    body.expires = true;
    // Vence al final del día de vencimiento, hora del centro de México.
    body.expiration_date_to = `${input.fechaVencimiento}T23:59:59.000-06:00`;
  }

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/json',
      // Evita preferences duplicadas si reintentamos el mismo pago.
      'X-Idempotency-Key': `colekta-pref-${input.paymentId}`,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `Mercado Pago rechazó la preferencia (${res.status}): ${
        json?.message || json?.error || 'error desconocido'
      }`,
    );
  }

  return {
    id: json.id,
    init_point: json.init_point,
    sandbox_init_point: json.sandbox_init_point ?? null,
  };
}

export interface MpPayment {
  id: number;
  status: string;
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  date_approved: string | null;
  payment_method_id: string | null;
  payment_type_id: string | null;
}

/** Consulta un pago en MP. El webhook solo trae el id: la verdad está aquí. */
export async function obtenerPago(
  accessToken: string,
  mpPaymentId: string | number,
): Promise<MpPayment | null> {
  const res = await fetch(`${MP_API}/v1/payments/${mpPaymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as MpPayment;
}

/** Traduce el status de MP al status interno de COLEKTA. */
export function mapEstadoMp(status: string): 'pagado' | 'pendiente' | 'atrasado' {
  if (status === 'approved') return 'pagado';
  if (['rejected', 'cancelled', 'refunded', 'charged_back'].includes(status)) {
    return 'pendiente';
  }
  return 'pendiente'; // in_process, authorized, pending
}

/** ¿La credencial es de sandbox? Sirve para pintar el aviso "modo prueba". */
export function esModoPrueba(accessToken: string | null | undefined): boolean {
  return !!accessToken?.startsWith('TEST-');
}
