import type { Metadata } from 'next';
import { requireSchool } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { WhatsappLogs } from '@/components/dashboard/whatsapp-logs';
import { Badge } from '@/components/ui/badge';
import { getWaCreds } from '@/lib/whatsapp';
import type { WhatsappLog } from '@/lib/types';

export const metadata: Metadata = { title: 'WhatsApp' };
export const dynamic = 'force-dynamic';

export default async function WhatsappPage() {
  const { school } = await requireSchool();
  const supabase = createClient();

  const { data } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })
    .limit(1000)
    .returns<WhatsappLog[]>();

  const logs = data ?? [];
  const creds = getWaCreds(school);

  const enviados = logs.filter((l) => l.status === 'enviado').length;
  const enCola = logs.filter((l) => l.status === 'en_cola').length;
  const fallados = logs.filter((l) => l.status === 'fallado').length;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-[#111111]/[0.08] bg-white/90 px-6 py-4 backdrop-blur-md lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-ink">WhatsApp</h1>
            <p className="text-[13px] text-muted-foreground">
              Bitácora de todos los links que has mandado a los tutores
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Badge variant="pagado" className="tnum">
              {enviados} enviados
            </Badge>
            <Badge variant="pendiente" className="tnum">
              {enCola} en cola
            </Badge>
            <Badge variant={fallados ? 'atrasado' : 'neutral'} className="tnum">
              {fallados} fallados
            </Badge>
            <Badge variant={creds ? 'brand' : 'neutral'}>
              {creds
                ? creds.fallback
                  ? 'Conectado (plataforma)'
                  : 'Conectado (tu cuenta)'
                : 'Modo manual'}
            </Badge>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 py-6 lg:px-8">
        <WhatsappLogs logs={logs} conectado={!!creds} />
      </div>
    </div>
  );
}
