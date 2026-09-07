'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Banknote, Copy, ExternalLink, MessageCircle, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { EmptyState, IlustraPagos } from '@/components/empty-state';
import { formatMXN } from '@/lib/fees';
import { cicloLabel, formatFecha, formatFechaHora, linkDePago } from '@/lib/utils';
import type { PaymentRow } from '@/lib/types';

export function HistorialAlumno({ pagos }: { pagos: PaymentRow[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);

  if (!pagos.length) {
    return (
      <EmptyState
        icon={<IlustraPagos />}
        title="Este alumno todavía no tiene pagos"
        description="Genera el ciclo desde Cobranza y aquí va a aparecer todo su historial."
      />
    );
  }

  async function copiar(token: string) {
    try {
      await navigator.clipboard.writeText(linkDePago(token));
      toast.success('Link copiado');
    } catch {
      toast.error('Tu navegador bloqueó el portapapeles');
    }
  }

  async function accion(url: string, body: unknown, id: string, exito: string) {
    setOcupado(id);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'No se pudo completar');
        return;
      }
      if (json.en_cola > 0) {
        toast.info('Mensaje en cola', {
          description: 'Sin WhatsApp Cloud API conectado. Queda listo en la bitácora.',
        });
      } else {
        toast.success(exito);
      }
      router.refresh();
    } catch {
      toast.error('Falló la conexión');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <ul className="divide-y divide-[#111111]/[0.06]">
      {pagos.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
          <div className="min-w-[150px] flex-1">
            <p className="text-[13px] font-medium text-ink">
              {p.concept_nombre} · {cicloLabel(p.ciclo)}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Vence el {formatFecha(p.fecha_vencimiento)}
              {p.fecha_pago ? ` · Pagado el ${formatFechaHora(p.fecha_pago)}` : ''}
              {p.metodo_pago === 'manual' ? ' · registro manual' : ''}
              {p.mp_payment_id ? ` · MP ${p.mp_payment_id}` : ''}
            </p>
          </div>

          <div className="text-right">
            <p className="tnum text-[13px] font-medium text-ink">
              {formatMXN(p.monto_concepto)}
            </p>
            <p className="tnum text-[11px] text-muted-foreground">
              tutor paga {formatMXN(p.monto_total_cobrado)}
            </p>
          </div>

          <StatusBadge status={p.status} />

          <div className="flex items-center gap-1">
            <Button size="icon-sm" variant="ghost" asChild aria-label="Abrir link de pago">
              <a href={linkDePago(p.link_token)} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => copiar(p.link_token)}
              aria-label="Copiar link"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              loading={ocupado === `wa-${p.id}`}
              onClick={() =>
                accion('/api/whatsapp/send-bulk', { payment_ids: [p.id] }, `wa-${p.id}`, 'Mensaje enviado')
              }
              aria-label="Re-enviar por WhatsApp"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            {p.status === 'pagado' ? (
              <Button
                size="icon-sm"
                variant="ghost"
                loading={ocupado === `mp-${p.id}`}
                onClick={() =>
                  accion(
                    '/api/payments/mark-paid',
                    { payment_ids: [p.id], pagado: false },
                    `mp-${p.id}`,
                    'Regresado a pendiente',
                  )
                }
                aria-label="Regresar a pendiente"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon-sm"
                variant="ghost"
                loading={ocupado === `mp-${p.id}`}
                onClick={() =>
                  accion(
                    '/api/payments/mark-paid',
                    { payment_ids: [p.id], pagado: true },
                    `mp-${p.id}`,
                    'Marcado como pagado',
                  )
                }
                aria-label="Marcar como pagado"
              >
                <Banknote className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
