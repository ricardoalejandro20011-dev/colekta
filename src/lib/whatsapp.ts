import { normalizarWhatsapp } from '@/lib/utils';

const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

export interface WaCreds {
  token: string;
  phoneNumberId: string;
  fallback: boolean;
}

/** Credenciales de WhatsApp de la escuela, con fallback al .env. */
export function getWaCreds(school: {
  whatsapp_token?: string | null;
  whatsapp_phone_number_id?: string | null;
}): WaCreds | null {
  const t = school.whatsapp_token?.trim();
  const p = school.whatsapp_phone_number_id?.trim();
  if (t && p) return { token: t, phoneNumberId: p, fallback: false };

  const et = process.env.WHATSAPP_TOKEN?.trim();
  const ep = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (et && ep) return { token: et, phoneNumberId: ep, fallback: true };

  return null;
}

export interface VarsPlantilla {
  /** {{1}} nombre del tutor */
  tutor: string;
  /** {{2}} concepto — "Colegiatura" */
  concepto: string;
  /** {{3}} ciclo legible — "Agosto 2026" */
  ciclo: string;
  /** {{4}} total con comisión, ya formateado sin símbolo — "1,895.60" */
  monto: string;
  /** {{5}} link de pago */
  link: string;
}

/**
 * Texto exacto del template aprobado en Meta. Es lo que se guarda en
 * whatsapp_logs.message para que, si no hay token, la escuela pueda
 * copiar y pegar el mensaje manualmente sin perder nada.
 */
export function renderMensaje(v: VarsPlantilla): string {
  return `Hola ${v.tutor}, te comparto el link de ${v.concepto} de ${v.ciclo} por $${v.monto}. Paga aquí: ${v.link}`;
}

export interface ResultadoEnvio {
  ok: boolean;
  waMessageId: string | null;
  error: string | null;
}

/**
 * Envía el template aprobado por WhatsApp Cloud API.
 *
 * IMPORTANTE: fuera de la ventana de 24 h Meta solo permite TEMPLATES, no
 * texto libre. Por eso siempre mandamos template. El template debe existir en
 * Meta Business Manager con 5 variables en el body y un botón URL dinámico
 * NO es necesario — el link va como {{5}} en el texto.
 */
export async function enviarTemplate(
  creds: WaCreds,
  telefono: string,
  vars: VarsPlantilla,
): Promise<ResultadoEnvio> {
  const to = normalizarWhatsapp(telefono);
  if (!/^\d{10,15}$/.test(to)) {
    return { ok: false, waMessageId: null, error: `Teléfono inválido: ${telefono}` };
  }

  const nombre = process.env.WHATSAPP_TEMPLATE_NAME || 'kolek_link_pago';
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'es_MX';

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: nombre,
      language: { code: lang },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: vars.tutor },
            { type: 'text', text: vars.concepto },
            { type: 'text', text: vars.ciclo },
            { type: 'text', text: vars.monto },
            { type: 'text', text: vars.link },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${creds.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      },
    );

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        json?.error?.error_user_msg ||
        json?.error?.message ||
        `HTTP ${res.status}`;
      return { ok: false, waMessageId: null, error: String(msg).slice(0, 400) };
    }

    return {
      ok: true,
      waMessageId: json?.messages?.[0]?.id ?? null,
      error: null,
    };
  } catch (e) {
    return {
      ok: false,
      waMessageId: null,
      error: e instanceof Error ? e.message.slice(0, 400) : 'Error de red',
    };
  }
}

/** Link wa.me listo para enviar a mano cuando no hay token configurado. */
export function linkWaMe(telefono: string, mensaje: string): string {
  return `https://wa.me/${normalizarWhatsapp(telefono)}?text=${encodeURIComponent(mensaje)}`;
}
