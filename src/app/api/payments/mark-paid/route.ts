import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  payment_ids: z.array(z.string().uuid()).min(1).max(500),
  /** true = pagado en efectivo/transferencia, false = regresarlo a pendiente. */
  pagado: z.boolean().default(true),
  nota: z.string().max(280).optional(),
});

/**
 * POST /api/payments/mark-paid
 * Registro manual de pagos en efectivo o transferencia. Queda marcado con
 * metodo_pago = 'manual' para que la conciliación contra Mercado Pago cuadre.
 */
export async function POST(req: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof z.ZodError ? e.errors[0]?.message : 'Cuerpo inválido' },
      { status: 400 },
    );
  }

  const patch = body.pagado
    ? {
        status: 'pagado' as const,
        fecha_pago: new Date().toISOString(),
        metodo_pago: 'manual',
        nota_manual: body.nota ?? null,
      }
    : {
        status: 'pendiente' as const,
        fecha_pago: null,
        metodo_pago: null,
        nota_manual: body.nota ?? null,
      };

  // RLS impide tocar pagos de otra escuela aunque manden ids ajenos.
  const { data, error } = await supabase
    .from('payments')
    .update(patch)
    .in('id', body.payment_ids)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ actualizados: data?.length ?? 0 });
}
