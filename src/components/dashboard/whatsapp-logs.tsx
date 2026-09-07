'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState, IlustraWhatsapp } from '@/components/empty-state';
import { createClient } from '@/lib/supabase/client';
import { formatFechaHora, formatWhatsapp, normalizarTexto, normalizarWhatsapp } from '@/lib/utils';
import type { WaLogStatus, WhatsappLog } from '@/lib/types';

const BADGE: Record<WaLogStatus, { v: 'pagado' | 'pendiente' | 'atrasado'; t: string }> = {
  enviado: { v: 'pagado', t: 'Enviado' },
  en_cola: { v: 'pendiente', t: 'En cola' },
  fallado: { v: 'atrasado', t: 'Falló' },
};

export function WhatsappLogs({
  logs: logsIniciales,
  conectado,
}: {
  logs: WhatsappLog[];
  conectado: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [logs, setLogs] = useState(logsIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | WaLogStatus>('todos');

  const filtrados = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return logs.filter((l) => {
      if (filtro !== 'todos' && l.status !== filtro) return false;
      if (!q) return true;
      return normalizarTexto(l.message).includes(q) || l.to.includes(q.replace(/\D/g, ''));
    });
  }, [logs, busqueda, filtro]);

  const enCola = logs.filter((l) => l.status === 'en_cola').length;

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Mensaje copiado');
    } catch {
      toast.error('Tu navegador bloqueó el portapapeles');
    }
  }

  async function marcarEnviado(l: WhatsappLog) {
    const { error } = await supabase
      .from('whatsapp_logs')
      .update({ status: 'enviado', sent_at: new Date().toISOString(), error: null })
      .eq('id', l.id);
    if (error) return toast.error(error.message);

    setLogs((prev) =>
      prev.map((x) =>
        x.id === l.id
          ? { ...x, status: 'enviado' as WaLogStatus, sent_at: new Date().toISOString(), error: null }
          : x,
      ),
    );
    toast.success('Marcado como enviado');
  }

  function abrirWaMe(l: WhatsappLog) {
    const url = `https://wa.me/${normalizarWhatsapp(l.to)}?text=${encodeURIComponent(l.message)}`;
    window.open(url, '_blank', 'noopener');
  }

  return (
    <div className="space-y-4">
      {!conectado && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[13px] font-medium text-amber-900">
            WhatsApp Cloud API no está conectado — modo manual activo
          </p>
          <p className="mt-1 max-w-[80ch] text-[12px] leading-relaxed text-amber-900/80">
            Cada envío queda aquí con el texto y el link ya armados. Abre el mensaje en WhatsApp
            Web con un clic, mándalo y márcalo como enviado. Nada se pierde. Cuando conectes el
            token de Meta en Configuración, los envíos se vuelven automáticos.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número o texto del mensaje…"
            className="h-9 pl-9"
          />
        </div>

        <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="en_cola">En cola ({enCola})</SelectItem>
            <SelectItem value="enviado">Enviados</SelectItem>
            <SelectItem value="fallado">Fallados</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </Button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-white shadow-subtle">
        {filtrados.length === 0 ? (
          <EmptyState
            icon={<IlustraWhatsapp />}
            title={logs.length === 0 ? 'Sin mensajes todavía' : 'Nada con esos filtros'}
            description={
              logs.length === 0
                ? 'En cuanto mandes links desde Cobranza, cada mensaje aparece aquí con su estado de entrega.'
                : 'Prueba con otro estado o limpia la búsqueda.'
            }
          />
        ) : (
          <ul className="divide-y divide-[#111111]/[0.06]">
            {filtrados.map((l) => {
              const b = BADGE[l.status];
              return (
                <li key={l.id} className="flex flex-wrap items-start gap-4 px-5 py-3.5">
                  <Badge variant={b.v} className="mt-0.5 shrink-0">
                    {b.t}
                  </Badge>

                  <div className="min-w-[220px] flex-1">
                    <p className="tnum text-[12px] font-medium text-ink">
                      {formatWhatsapp(l.to)}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                      {l.message}
                    </p>
                    {l.error ? (
                      <p className="mt-1 text-[11px] text-red-600">{l.error}</p>
                    ) : null}
                  </div>

                  <span className="tnum shrink-0 text-[11px] text-muted-foreground">
                    {formatFechaHora(l.sent_at ?? l.created_at)}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => copiar(l.message)}
                      aria-label="Copiar mensaje"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => abrirWaMe(l)}
                      aria-label="Abrir en WhatsApp"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    {l.status !== 'enviado' && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => marcarEnviado(l)}
                        aria-label="Marcar como enviado"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filtrados.length > 0 && (
          <div className="border-t border-[#111111]/[0.07] px-5 py-2.5 text-[12px] text-muted-foreground">
            <span className="tnum">
              {filtrados.length} de {logs.length} mensajes
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
