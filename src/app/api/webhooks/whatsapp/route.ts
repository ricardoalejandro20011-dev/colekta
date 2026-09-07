import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/webhooks/whatsapp
 * Verificación del webhook en developers.facebook.com. Meta pega una vez con
 * hub.mode=subscribe y espera que le devuelvas hub.challenge en texto plano.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const esperado = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === 'subscribe' && esperado && token === esperado && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[whatsapp] Verificación rechazada. Revisa WHATSAPP_VERIFY_TOKEN.');
  return new Response('Forbidden', { status: 403 });
}

/** Valida X-Hub-Signature-256 contra el App Secret de Meta. */
function firmaValida(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return true; // sin app secret configurado no se valida
  if (!header?.startsWith('sha256=')) return false;

  const esperado =
    'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(header));
  } catch {
    return false;
  }
}

interface WaStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  recipient_id?: string;
  errors?: { code?: number; title?: string; message?: string }[];
}

interface WaMessage {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string };
}

/**
 * POST /api/webhooks/whatsapp
 *
 * Recibe dos cosas de Meta:
 *  1. Estados de entrega de los templates que mandamos → actualiza whatsapp_logs.
 *  2. Respuestas de los tutores → se guardan como log entrante para que la
 *     escuela las vea (por ejemplo "ya pagué" o "no me llegó el link").
 */
export async function POST(req: Request) {
  const raw = await req.text();

  if (!firmaValida(raw, req.headers.get('x-hub-signature-256'))) {
    console.warn('[whatsapp] Firma X-Hub-Signature-256 inválida');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const db = createAdminClient();
  let estadosProcesados = 0;
  let entrantesGuardados = 0;

  for (const entry of body?.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};

      // ── 1. Estados de entrega ────────────────────────────────────
      for (const st of (value.statuses ?? []) as WaStatus[]) {
        const patch: Record<string, unknown> = {};

        if (st.status === 'failed') {
          patch.status = 'fallado';
          patch.error =
            st.errors?.[0]?.message ||
            st.errors?.[0]?.title ||
            'Meta reportó el mensaje como fallado';
        } else {
          patch.status = 'enviado';
          patch.sent_at = new Date().toISOString();
        }

        const { data } = await db
          .from('whatsapp_logs')
          .update(patch)
          .eq('wa_message_id', st.id)
          .select('id');

        if (data?.length) estadosProcesados++;
        else console.info('[whatsapp] Estado de un mensaje que no generamos:', st.id);
      }

      // ── 2. Mensajes entrantes de los tutores ─────────────────────
      for (const msg of (value.messages ?? []) as WaMessage[]) {
        const texto =
          msg.text?.body || msg.button?.text || `[mensaje de tipo ${msg.type}]`;

        // Ligamos la respuesta a la escuela dueña del último link que le mandamos.
        const { data: previo } = await db
          .from('whatsapp_logs')
          .select('school_id, payment_id')
          .eq('to', msg.from)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!previo?.school_id) {
          console.info('[whatsapp] Mensaje de un número desconocido:', msg.from);
          continue;
        }

        const { error } = await db.from('whatsapp_logs').insert({
          school_id: previo.school_id,
          payment_id: previo.payment_id,
          to: msg.from,
          message: `↩ Respuesta del tutor: ${texto}`,
          wa_message_id: msg.id,
          status: 'enviado',
          sent_at: new Date().toISOString(),
        });

        if (!error) entrantesGuardados++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    estados_procesados: estadosProcesados,
    entrantes_guardados: entrantesGuardados,
  });
}
