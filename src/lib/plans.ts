import type { SchoolPlan } from '@/lib/types';

export interface Plan {
  id: SchoolPlan;
  nombre: string;
  precio: number;
  limite: number;
  gancho: string;
  ideal: string;
  popular?: boolean;
  features: string[];
  /**
   * Funciones que la escuela verá anunciadas para este plan pero que TODAVÍA
   * no están construidas (roles avanzados, SPEI, becas, API...). Se muestran
   * con badge "Próximamente" — nunca como si ya funcionaran. Ver auditoría
   * entregada para el estado real de cada una.
   */
  proximamente?: string[];
}

/**
 * Planes por VOLUMEN DE ALUMNOS, nunca por nivel educativo.
 * Un kínder de 190 y una primaria de 190 pagan lo mismo.
 *
 * NOTA: los `id` (inicio/crecimiento/pro) son el valor guardado en
 * schools.plan (enum de Postgres) y NO cambian aunque el nombre comercial
 * sí — así no hace falta migrar la base de datos por un rebranding de
 * planes. "nombre" es lo único que ve la escuela.
 */
export const PLANES: Plan[] = [
  {
    id: 'inicio',
    nombre: 'Mini',
    precio: 790,
    limite: 80,
    gancho: 'Hasta 80 alumnos',
    ideal: 'Kínder, estancias infantiles o academias chicas.',
    features: [
      'Links de pago ilimitados',
      'Envío por WhatsApp',
      'Dashboard de cobranza en vivo',
      'Grupos y conceptos configurables',
      'Importación por CSV',
      'Marcar pagos en efectivo o transferencia',
      '1 usuario',
    ],
  },
  {
    id: 'crecimiento',
    nombre: 'Escuela',
    precio: 1490,
    limite: 300,
    gancho: 'Hasta 300 alumnos',
    ideal: 'Primaria o secundaria completa con varios grupos por grado.',
    popular: true,
    features: [
      'Todo lo de Mini',
      'Recordatorios automáticos programables',
      'Reportes por grupo',
      'Exportación contable (CSV / Excel)',
      'Conceptos ilimitados',
      '3 usuarios',
      'Soporte prioritario por WhatsApp',
    ],
    proximamente: [
      'Transferencia SPEI como método recomendado',
      'Becas y descuentos configurables',
      'Pagos parciales',
      'Estado de cuenta por familia',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 2490,
    limite: 700,
    gancho: 'Hasta 700 alumnos',
    ideal: 'Prepa, universidad pequeña o instituto con varias sedes.',
    features: [
      'Todo lo de Escuela',
      'Multi-sede (varios planteles en una cuenta)',
      'CRM: historial completo por alumno',
      'Usuarios ilimitados',
    ],
    proximamente: [
      'Roles y permisos por usuario',
      'API y webhooks',
      'Reportes avanzados',
      'Auditoría de cambios',
    ],
  },
];

export const PLAN_POR_ID: Record<SchoolPlan, Plan> = PLANES.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<SchoolPlan, Plan>,
);

/** Recomienda plan a partir del número aproximado de alumnos del onboarding. */
export function planRecomendado(alumnos: number): SchoolPlan | 'medida' {
  if (alumnos <= 80) return 'inicio';
  if (alumnos <= 300) return 'crecimiento';
  if (alumnos <= 700) return 'pro';
  return 'medida';
}

/** Comparativa de la tabla de /planes. Solo funciones ya construidas. */
export const COMPARATIVA: { feature: string; inicio: string | boolean; crecimiento: string | boolean; pro: string | boolean }[] = [
  { feature: 'Alumnos incluidos', inicio: 'Hasta 80', crecimiento: 'Hasta 300', pro: 'Hasta 700' },
  { feature: 'Links de pago', inicio: 'Ilimitados', crecimiento: 'Ilimitados', pro: 'Ilimitados' },
  { feature: 'Envío por WhatsApp', inicio: true, crecimiento: true, pro: true },
  { feature: 'Envío masivo (seleccionar y mandar)', inicio: true, crecimiento: true, pro: true },
  { feature: 'Dashboard y morosidad en vivo', inicio: true, crecimiento: true, pro: true },
  { feature: 'Importación CSV', inicio: true, crecimiento: true, pro: true },
  { feature: 'Conceptos', inicio: 'Hasta 5', crecimiento: 'Ilimitados', pro: 'Ilimitados' },
  { feature: 'Recordatorios automáticos', inicio: false, crecimiento: true, pro: true },
  { feature: 'Reportes por grupo', inicio: false, crecimiento: true, pro: true },
  { feature: 'Exportación contable', inicio: false, crecimiento: true, pro: true },
  { feature: 'Usuarios del equipo', inicio: '1', crecimiento: '3', pro: 'Ilimitados' },
  { feature: 'Multi-sede', inicio: false, crecimiento: false, pro: true },
  { feature: 'CRM historial por alumno', inicio: false, crecimiento: false, pro: true },
];
