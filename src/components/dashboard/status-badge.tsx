import { Check, Clock, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PaymentStatus } from '@/lib/types';

const MAPA = {
  pagado: { label: 'Pagado', Icon: Check },
  pendiente: { label: 'Pendiente', Icon: Clock },
  atrasado: { label: 'Atrasado', Icon: TriangleAlert },
} as const;

export function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, Icon } = MAPA[status];
  return (
    <Badge variant={status}>
      <Icon className="h-2.5 w-2.5" strokeWidth={2.6} />
      {label}
    </Badge>
  );
}
