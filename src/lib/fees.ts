/**
 * COLEKTA — Motor de comisión.
 *
 * REGLA DE NEGOCIO INVIOLABLE:
 * El papá/tutor paga la comisión de Mercado Pago. La escuela SIEMPRE recibe
 * el monto limpio del concepto. COLEKTA nunca absorbe la comisión.
 *
 *     total_a_cobrar = monto_concepto * 1.0406 + 3.48
 *
 * 1.0406  → 4.06% variable de MP (incluye IVA sobre la comisión)
 * 3.48    → cargo fijo por operación (incluye IVA)
 */

export const MP_RATE = 1.0406;
export const MP_FIXED = 3.48;

/** Redondeo a 2 decimales sin errores de punto flotante (0.1+0.2 === 0.3). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Total que se le cobra al tutor para que a la escuela le llegue
 * `montoConcepto` limpio.
 */
export function calcTotalConComision(montoConcepto: number): number {
  const monto = Number(montoConcepto) || 0;
  if (monto <= 0) return 0;
  return round2(monto * MP_RATE + MP_FIXED);
}

/** Solo la parte de comisión, para mostrar el desglose al tutor. */
export function calcComision(montoConcepto: number): number {
  const monto = Number(montoConcepto) || 0;
  if (monto <= 0) return 0;
  return round2(calcTotalConComision(monto) - monto);
}

/** Desglose completo listo para pintar en la página pública de pago. */
export function desglose(montoConcepto: number) {
  const concepto = round2(Number(montoConcepto) || 0);
  const total = calcTotalConComision(concepto);
  return {
    concepto,
    comision: round2(total - concepto),
    total,
  };
}

const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

/** $1,234.56 */
export function formatMXN(n: number | string | null | undefined): string {
  const value = Number(n ?? 0);
  return MXN.format(Number.isFinite(value) ? value : 0);
}

/** $1,235 — para KPIs grandes donde los centavos son ruido. */
export function formatMXNCompact(n: number | string | null | undefined): string {
  const value = Number(n ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
