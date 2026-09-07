import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMpCreds, mapEstadoMp, obtenerPago } from '@/lib/mercadopago';
import type { School } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Valida la firma de Mercado Pago.
 * Header:  x-signature: ts=1704908010,v1=<hmac>
 * Manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * Si no configuraste MP_WEBHOOK_SECRET no se valida firma, pero igual
 * consultamos el pago contra la API de MP, que es la fuente de verdad.
 */
function firmaValida(req: Request, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id') ?? '';
  if (!xSignature) return false;

  const partes = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [k, ...v] = p.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
  );

  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const esperado = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/mercadopago?school=<uuid>
 *
 * Mercado Pago manda solo el id del pago; nosotros lo consultamos contra su
 * API con el token de la escuela dueña de la preference (el school_id viaja en
 * la notification_url) y conciliamos el registro en `payments` por
 * external_reference.
 *
 * Siempre respondemos 200 salvo error nuestro: un 4xx hace que MP reintente
 * durante días por algo que nunca se va a arreglar solo.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const tipo =
    (payload.type as string) ||
    (payload.topic as string) ||
    url.searchParams.get('type') ||
    url.searchParams.get('topic') ||
    '';

  const dataId =
    ((payload.data as { id?: string | number } | undefined)?.id ?? '').toString() ||
    url.searchParams.get('data.id') ||
    url.searchParams.get('id') ||
    '';

  // MP también manda 'merchant_order' y pruebas de conexión: los ignoramos.
  if (!tipo.includes('payment') || !dataId) {
    return NextResponse.json({ ignorado: true, tipo }, { status: 200 });
  }

  if (!firmaValida(req, dataId)) {
    console.warn('[mercadopago] Firma inválida para el pago', dataId);
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  const db = createAdminClient();
  const schoolId = url.searchParams.get('school');

  let school: Pick<School, 'id' | 'mp_access_token' | 'mp_public_key'> | null = null;
  if (schoolId) {
    const { data } = await db
      .from('schools')
      .select('id, mp_access_token, mp_public_key')
      .eq('id', schoolId)
      .maybeSingle();
    school = data;
  }

  const creds = getMpCreds(school ?? {});
  if (!creds) {
    console.error('[mercadopago] Sin access token para consultar el pago', dataId);
    return NextResponse.json({ error: 'Sin credenciales de Mercado Pago' }, { status: 200 });
  }

  const pagoMp = await obtenerPago(creds.accessToken, dataId);
  if (!pagoMp) {
    console.error('[mercadopago] No pude consultar el pago', dataId);
    return NextResponse.json({ error: 'Pago no consultable' }, { status: 200 });
  }

  const paymentId = pagoMp.external_reference;
  if (!paymentId) {
    console.warn('[mercadopago] Pago sin external_reference', dataId);
    return NextResponse.json({ ignorado: true }, { status: 200 });
  }

  const nuevoStatus = mapEstadoMp(pagoMp.status);

  const patch: Record<string, unknown> = {
    mp_payment_id: String(pagoMp.id),
    mp_status: pagoMp.status,
    status: nuevoStatus,
    metodo_pago: 'mercado_pago',
  };

  if (nuevoStatus === 'pagado') {
    patch.fecha_pago = pagoMp.date_approved ?? new Date().toISOString();
  }

  const { data: actualizado, error } = await db
    .from('payments')
    .update(patch)
    .eq('id', paymentId)
    .select('id, status, ciclo, school_id')
    .maybeSingle();

  if (error) {
    console.error('[mercadopago] Error al conciliar', paymentId, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!actualizado) {
    console.warn('[mercadopago] external_reference sin pago local:', paymentId);
    return NextResponse.json({ ignorado: true }, { status: 200 });
  }

  console.info(
    `[mercadopago] Pago ${paymentId} → ${pagoMp.status} (${nuevoStatus}) por $${pagoMp.transaction_amount}`,
  );

  return NextResponse.json({ ok: true, payment_id: paymentId, status: nuevoStatus });
}

/** MP a veces pega un GET para verificar que la URL responde. */
export async function GET() {
  return NextResponse.json({ ok: true, servicio: 'colekta-mercadopago-webhook' });
}
