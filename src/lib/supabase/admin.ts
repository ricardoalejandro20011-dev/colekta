import { createClient } from '@supabase/supabase-js';

/**
 * Cliente con service_role. IGNORA RLS.
 *
 * Úsalo SOLO en:
 *   - webhooks (Mercado Pago / WhatsApp) — no hay usuario autenticado
 *   - la página pública /p/[token] — el tutor no tiene cuenta
 *   - el cron de recordatorios
 *
 * Cada consulta debe filtrar explícitamente por school_id o link_token.
 * Nunca importes este archivo desde un componente 'use client'.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
