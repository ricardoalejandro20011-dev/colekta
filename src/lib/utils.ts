import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Colegio Nueva Era, A.C." -> "colegio-nueva-era-ac" */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Normaliza un teléfono mexicano a formato E.164 sin '+' (lo que pide
 * WhatsApp Cloud API): 10 dígitos -> 52XXXXXXXXXX.
 * Acepta "55 1234 5678", "(81) 8123-4567", "+52 33 1234 5678", "521..."
 */
export function normalizarWhatsapp(raw: string | null | undefined): string {
  if (!raw) return '';
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10) return `52${d}`;
  // 521XXXXXXXXXX es el formato viejo de móviles; Cloud API prefiere 52XXXXXXXXXX
  if (d.length === 13 && d.startsWith('521')) return `52${d.slice(3)}`;
  if (d.length === 12 && d.startsWith('52')) return d;
  return d;
}

export function whatsappValido(raw: string | null | undefined): boolean {
  return /^52\d{10}$/.test(normalizarWhatsapp(raw));
}

/** 5215512345678 -> "55 1234 5678" */
export function formatWhatsapp(raw: string | null | undefined): string {
  const d = normalizarWhatsapp(raw);
  if (!/^52\d{10}$/.test(d)) return raw ?? '';
  const n = d.slice(2);
  return `${n.slice(0, 2)} ${n.slice(2, 6)} ${n.slice(6)}`;
}

/** '2026-08' */
export function cicloActual(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** '2026-08' -> 'Agosto 2026' */
export function cicloLabel(ciclo: string): string {
  const [y, m] = ciclo.split('-').map(Number);
  if (!y || !m) return ciclo;
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${meses[m - 1]} ${y}`;
}

/** Lista de ciclos alrededor de hoy, del más nuevo al más viejo. */
export function ciclosDisponibles(atras = 12, adelante = 3): string[] {
  const out: string[] = [];
  const hoy = new Date();
  for (let i = adelante; i >= -atras; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    out.push(cicloActual(d));
  }
  return out;
}

/** Fecha de vencimiento del ciclo: día `dia` del mes del ciclo, en 'YYYY-MM-DD'. */
export function vencimientoDeCiclo(ciclo: string, dia: number): string {
  const [y, m] = ciclo.split('-').map(Number);
  const ultimoDia = new Date(y, m, 0).getDate();
  const d = Math.min(Math.max(dia || 5, 1), ultimoDia);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** '2026-08-05' -> '5 ago 2026' */
export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Quita acentos y baja a minúsculas — para buscar sin pelearse con la ñ. */
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Corre `worker` sobre `items` con concurrencia limitada. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/$/, '');

export function linkDePago(token: string): string {
  return `${APP_URL}/p/${token}`;
}
