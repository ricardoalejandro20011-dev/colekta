import Papa from 'papaparse';
import { normalizarTexto, normalizarWhatsapp, whatsappValido } from '@/lib/utils';

export interface FilaAlumnoCsv {
  nombre_alumno: string;
  grupo: string;
  monto: number | null;
  nombre_tutor: string;
  whatsapp_tutor: string;
  email_tutor: string | null;
}

export interface ResultadoCsv {
  filas: FilaAlumnoCsv[];
  errores: { linea: number; motivo: string }[];
  gruposDetectados: string[];
  totalLeidas: number;
}

/** Encabezados aceptados por columna, tolerante a acentos y variantes. */
const ALIAS: Record<keyof FilaAlumnoCsv, string[]> = {
  nombre_alumno: ['nombre_alumno', 'alumno', 'nombre del alumno', 'nombre', 'estudiante'],
  grupo: ['grupo', 'grado', 'nivel', 'clase', 'salon', 'salón'],
  monto: ['monto', 'colegiatura', 'mensualidad', 'importe', 'monto_custom'],
  nombre_tutor: ['nombre_tutor', 'tutor', 'padre', 'madre', 'papa', 'papá', 'mama', 'mamá', 'responsable'],
  whatsapp_tutor: ['whatsapp_tutor', 'whatsapp', 'telefono', 'teléfono', 'celular', 'tel'],
  email_tutor: ['email_tutor', 'email', 'correo', 'correo_tutor', 'mail'],
};

function mapearEncabezados(headers: string[]): Partial<Record<keyof FilaAlumnoCsv, string>> {
  const mapa: Partial<Record<keyof FilaAlumnoCsv, string>> = {};
  for (const h of headers) {
    const limpio = normalizarTexto(h).replace(/\s+/g, ' ');
    for (const [campo, alias] of Object.entries(ALIAS) as [keyof FilaAlumnoCsv, string[]][]) {
      if (mapa[campo]) continue;
      if (alias.some((a) => normalizarTexto(a) === limpio)) {
        mapa[campo] = h;
        break;
      }
    }
  }
  return mapa;
}

function aNumero(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[$,\s]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

/**
 * Lee el CSV de alumnos.
 * Formato esperado: nombre_alumno,grupo,monto,nombre_tutor,whatsapp_tutor
 * (email_tutor es opcional y los encabezados aceptan variantes en español).
 */
export function parseAlumnosCsv(texto: string): ResultadoCsv {
  const parsed = Papa.parse<Record<string, string>>(texto.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const mapa = mapearEncabezados(headers);

  const filas: FilaAlumnoCsv[] = [];
  const errores: { linea: number; motivo: string }[] = [];
  const grupos = new Set<string>();

  if (!mapa.nombre_alumno) {
    return {
      filas: [],
      errores: [
        {
          linea: 1,
          motivo:
            'No encontré la columna del nombre del alumno. El encabezado debe incluir "nombre_alumno".',
        },
      ],
      gruposDetectados: [],
      totalLeidas: 0,
    };
  }

  parsed.data.forEach((row, i) => {
    const linea = i + 2; // +1 encabezado, +1 base 1
    const get = (campo: keyof FilaAlumnoCsv) => {
      const key = mapa[campo];
      return key ? (row[key] ?? '').toString().trim() : '';
    };

    const nombre_alumno = get('nombre_alumno');
    if (!nombre_alumno) return; // fila vacía, se ignora en silencio

    const nombre_tutor = get('nombre_tutor');
    const whatsappRaw = get('whatsapp_tutor');
    const whatsapp_tutor = normalizarWhatsapp(whatsappRaw);

    if (whatsappRaw && !whatsappValido(whatsappRaw)) {
      errores.push({
        linea,
        motivo: `"${nombre_alumno}": el WhatsApp "${whatsappRaw}" no parece un número mexicano de 10 dígitos.`,
      });
      return;
    }

    if (!whatsappRaw) {
      errores.push({
        linea,
        motivo: `"${nombre_alumno}": falta el WhatsApp del tutor. Sin él no se le puede mandar el link.`,
      });
      return;
    }

    const grupo = get('grupo');
    if (grupo) grupos.add(grupo);

    filas.push({
      nombre_alumno,
      grupo,
      monto: aNumero(get('monto')),
      nombre_tutor: nombre_tutor || `Tutor de ${nombre_alumno}`,
      whatsapp_tutor,
      email_tutor: get('email_tutor') || null,
    });
  });

  return {
    filas,
    errores,
    gruposDetectados: Array.from(grupos).sort((a, b) => a.localeCompare(b, 'es')),
    totalLeidas: parsed.data.length,
  };
}

export const CSV_PLANTILLA = `nombre_alumno,grupo,monto,nombre_tutor,whatsapp_tutor,email_tutor
Renata Ibarra Solís,3ro B,2450,Mariana Solís,5512345678,mariana@ejemplo.com
Emiliano Cárdenas Ruiz,1ro A,2450,Jorge Cárdenas,5598765432,
Ximena Ruvalcaba Peña,5to A,1960,Paola Ruvalcaba,3312345678,
Santiago Ledezma Toro,Avanzados Lunes,1200,Alma Ledezma,8112345678,
`;

/** Descarga un archivo de texto desde el navegador. */
export function descargarTexto(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
