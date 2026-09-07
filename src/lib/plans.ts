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
  proximamente?: string[];
}

/**
 * Planes por VOLUMEN DE ALUMNOS, nunca por nivel educativo.
 * Un kínder de 190 y una primaria de 190 pagan lo mismo.
 */
export const PLANES: Plan[] = [
  {
    id: 'inicio',
    nombre: 'Inicio',
    precio: 999,
    limite: 200,
    gancho: 'Hasta 200 alumnos',
    ideal: 'Kínder, academias, primaria chica (6 grupos × 30 = 180).',
    features: [
      'Links de pago ilimitados',
      'Envío por WhatsApp',
      'Dashboard de cobranza en vivo',
      'Grupos y conceptos configurables',
      'Importación por CSV',
      'Marcar pagos en efectivo',
      '1 usuario',
    ],
  },
  {
    id: 'crecimiento',
    nombre: 'Crecimiento',
    precio: 1899,
    limite: 450,
    gancho: 'Hasta 450 alumnos',
    ideal: 'Primaria completa con 2 grupos por grado (360) o secundaria.',
    popular: true,
    features: [
      'Todo lo de Inicio',
      'Recordatorios automáticos programables (día 1, 5, 10)',
      'Reportes por grupo',
      'Exportación contable (CSV / Excel)',
      'Conceptos ilimitados',
      '3 usuarios',
      'Soporte prioritario por WhatsApp',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 3499,
    limite: 800,
    gancho: 'Hasta 800 alumnos',
    ideal: 'Prepa, universidad pequeña o instituto con varias sedes.',
    features: [
      'Todo lo de Crecimiento',
      'Multi-sede (varios planteles en una cuenta)',
      'CRM: historial completo por alumno',
      'API y webhooks',
      'Roles y permisos por usuario',
      'Usuarios ilimitados',
    ],
    proximamente: ['Financiamiento a papás a meses', 'Tienda de uniformes'],
  },
];

export const PLAN_POR_ID: Record<SchoolPlan, Plan> = PLANES.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<SchoolPlan, Plan>,
);

/** Recomienda plan a partir del número aproximado de alumnos del onboarding. */
export function planRecomendado(alumnos: number): SchoolPlan | 'medida' {
  if (alumnos <= 200) return 'inicio';
  if (alumnos <= 450) return 'crecimiento';
  if (alumnos <= 800) return 'pro';
  return 'medida';
}

/** Comparativa de la tabla de /planes. */
export const COMPARATIVA: { feature: string; inicio: string | boolean; crecimiento: string | boolean; pro: string | boolean }[] = [
  { feature: 'Alumnos incluidos', inicio: 'Hasta 200', crecimiento: 'Hasta 450', pro: 'Hasta 800' },
  { feature: 'Links de pago', inicio: 'Ilimitados', crecimiento: 'Ilimitados', pro: 'Ilimitados' },
  { feature: 'Envío por WhatsApp', inicio: true, crecimiento: true, pro: true },
  { feature: 'Envío masivo (seleccionar y mandar)', inicio: true, crecimiento: true, pro: true },
  { feature: 'Dashboard y morosidad en vivo', inicio: true, crecimiento: true, pro: true },
  { feature: 'Importación CSV', inicio: true, crecimiento: true, pro: true },
  { feature: 'Conceptos', inicio: 'Hasta 5', crecimiento: 'Ilimitados', pro: 'Ilimitados' },
  { feature: 'Recordatorios automáticos', inicio: false, crecimiento: 'Día 1, 5 y 10', pro: 'Programables' },
  { feature: 'Reportes por grupo', inicio: false, crecimiento: true, pro: true },
  { feature: 'Exportación contable', inicio: false, crecimiento: true, pro: true },
  { feature: 'Usuarios del equipo', inicio: '1', crecimiento: '3', pro: 'Ilimitados' },
  { feature: 'Multi-sede', inicio: false, crecimiento: false, pro: true },
  { feature: 'CRM historial por alumno', inicio: false, crecimiento: false, pro: true },
  { feature: 'API y webhooks', inicio: false, crecimiento: false, pro: true },
  { feature: 'Roles y permisos', inicio: false, crecimiento: false, pro: true },
];
