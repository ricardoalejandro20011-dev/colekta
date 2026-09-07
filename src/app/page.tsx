import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Baby,
  Building2,
  CalendarClock,
  CheckCircle2,
  Dumbbell,
  FileSpreadsheet,
  GraduationCap,
  Languages,
  Link2,
  MessageCircle,
  School,
  Sparkles,
} from 'lucide-react';
import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import { DashboardPreview } from '@/components/marketing/dashboard-preview';
import { PricingCards, PricingMedida, PricingNota } from '@/components/marketing/pricing';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { brand } from '@/config/brand';
import { desglose, formatMXN } from '@/lib/fees';

/* ────────────────────────────────────────────────────────────────────────
   Datos de la landing
   ──────────────────────────────────────────────────────────────────────── */

const TIPOS = [
  { Icon: Baby, label: 'Kínder' },
  { Icon: School, label: 'Primaria' },
  { Icon: Building2, label: 'Secundaria' },
  { Icon: GraduationCap, label: 'Prepa y universidad' },
  { Icon: Languages, label: 'Academias' },
  { Icon: Dumbbell, label: 'Deportivos' },
];

const CASOS = [
  {
    Icon: Baby,
    tipo: 'Estancia infantil',
    alumnos: '40 alumnos',
    grupos: 'Maternal, Preescolar 1, 2 y 3',
    dolor:
      'La directora cobraba por WhatsApp una por una y anotaba en un cuaderno. Dos mamás pagaban el 20.',
    solucion:
      'Un solo botón genera los 40 links del mes y los manda. El cuaderno desapareció.',
    destacado: true,
  },
  {
    Icon: School,
    tipo: 'Primaria',
    alumnos: '180 alumnos',
    grupos: '1ro a 6to, dos grupos por grado',
    dolor: 'Tres personas persiguiendo pagos los primeros 10 días de cada mes.',
    solucion: 'Morosidad visible por grupo. Recordatorios automáticos día 1, 5 y 10.',
  },
  {
    Icon: Languages,
    tipo: 'Academia de inglés',
    alumnos: '60 alumnos',
    grupos: 'Principiantes, Intermedios, Avanzados Lunes',
    dolor:
      'Grupos que no son grados, montos distintos por nivel y alumnos que entran a media inscripción.',
    solucion:
      'Los grupos se llaman como tú quieras y cada alumno puede traer su propio monto.',
  },
  {
    Icon: GraduationCap,
    tipo: 'Universidad pequeña',
    alumnos: '500 alumnos',
    grupos: 'Cuatrimestres por carrera',
    dolor: 'Colegiatura, inscripción, examen extraordinario y titulación, todo por separado.',
    solucion:
      'Conceptos ilimitados, cada uno con su ciclo y su vencimiento. Exportable a contabilidad.',
  },
];

const PASOS = [
  {
    n: '01',
    titulo: 'Carga tu escuela en minutos',
    texto:
      'Creas tus grupos con el nombre que uses de verdad —"1ro A", "Avanzados Lunes", "Cinta Negra"— y subes a los alumnos con un CSV.',
    Icon: FileSpreadsheet,
  },
  {
    n: '02',
    titulo: 'Genera el ciclo completo de un jalón',
    texto: `Eliges concepto, mes y grupos. ${brand.name} crea el pago de cada alumno activo, con su link único de pago y su fecha de vencimiento.`,
    Icon: Link2,
  },
  {
    n: '03',
    titulo: 'Manda por WhatsApp y olvídate',
    texto:
      'Seleccionas 30 filas y las envías con un clic. Cuando el tutor paga, el webhook de Mercado Pago marca el pago en verde solo. Nadie captura nada a mano.',
    Icon: MessageCircle,
  },
];

const FAQS: FaqItem[] = [
  {
    q: '¿Y la comisión de procesamiento? ¿Me la descuentan a mí?',
    a: (
      <>
        <p>
          Cada escuela decide cómo manejar el costo de procesamiento: que lo absorba la escuela,
          el tutor, o que se reparta entre ambos. Hoy, con Mercado Pago como proveedor, la
          fórmula vigente es <strong className="text-ink">monto × 1.0406 + $3.48</strong> a cargo
          del tutor por default — y siempre se muestra el desglose completo antes de pagar.
        </p>
        <p>
          Si la colegiatura es de {formatMXN(2450)}, hoy el tutor pagaría{' '}
          {formatMXN(desglose(2450).total)} y tu escuela recibe {formatMXN(2450)} íntegros. Nadie
          se lleva sorpresas: el costo se ve antes de confirmar el pago.
        </p>
      </>
    ),
  },
  {
    q: `¿El dinero cae a mi cuenta o a la de ${brand.name}?`,
    a: (
      <p>
        Directo a la cuenta de tu escuela con el proveedor de pagos que conectes (hoy Mercado
        Pago). En Configuración pegas tu propio <em>access token</em> y a partir de ahí todos los
        cobros se procesan con tus credenciales. {brand.name} nunca concentra el dinero de las
        escuelas; te cobramos aparte la mensualidad del plan.
      </p>
    ),
  },
  {
    q: 'Mi escuela no es primaria. ¿También sirve?',
    a: (
      <p>
        Sí. Nada está amarrado a “1ro a 6to”. Tú creas los grupos que uses: cuatrimestres,
        niveles de inglés, horarios de karate, cintas, sedes. Si tienes un solo grupo, funciona
        igual que con doce.
      </p>
    ),
  },
  {
    q: '¿Necesito WhatsApp Business API? Suena complicado.',
    a: (
      <>
        <p>
          No es obligatorio para empezar. Si todavía no tienes el token de Meta, {brand.name} deja
          cada mensaje listo en la bandeja de WhatsApp con el texto y el link ya armados, y lo
          mandas desde tu celular con un clic.
        </p>
        <p>
          Cuando quieras automatizarlo, el README trae el paso a paso para sacar el token y el
          phone number ID en developers.facebook.com.
        </p>
      </>
    ),
  },
  {
    q: '¿Puedo registrar pagos en efectivo o transferencia?',
    a: (
      <p>
        Sí. En cualquier fila puedes “Marcar como pagado manual”, con nota de referencia. Queda
        en el historial del alumno con método <em>manual</em>, separado de lo que entró por
        Mercado Pago, para que tu conciliación cuadre.
      </p>
    ),
  },
  {
    q: '¿Qué pasa si un alumno se da de baja a medio año?',
    a: (
      <p>
        Le cambias el estatus a <em>baja</em> y deja de aparecer al generar ciclos nuevos. Sus
        pagos anteriores se conservan íntegros en su historial: no se borra nada.
      </p>
    ),
  },
  {
    q: '¿Mis datos están separados de los de otras escuelas?',
    a: (
      <p>
        Sí, a nivel de base de datos. Cada tabla tiene Row Level Security por{' '}
        <code className="rounded bg-[#111111]/[0.05] px-1 py-0.5 text-[12px]">school_id</code>:
        aunque alguien manipulara la consulta desde el navegador, Postgres no devuelve filas de
        otra escuela.
      </p>
    ),
  },
  {
    q: '¿Hay contrato forzoso?',
    a: (
      <p>
        No. Es mes a mes y cancelas cuando quieras. Puedes exportar tus alumnos y tus pagos en
        CSV antes de irte.
      </p>
    ),
  },
];

/* ────────────────────────────────────────────────────────────────────────
   Página
   ──────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const ejemplo = desglose(2450);

  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <main>
        {/* ── HERO ASIMÉTRICO ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 grid-bg fade-mask-b opacity-70" />
          <div className="relative mx-auto w-full max-w-[1180px] px-6 pb-20 pt-14 md:pt-20">
            <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-8">
              {/* Copy — 5 columnas */}
              <div className="animate-fade-up lg:col-span-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#111111]/10 bg-white px-3 py-1 shadow-subtle">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[12px] text-muted-foreground">{brand.tagline}</span>
                </div>

                <h1 className="mt-6 text-[2.6rem] font-[640] leading-[1.03] tracking-[-0.042em] text-ink sm:text-[3.1rem]">
                  Cobra colegiaturas sin perseguir pagos.
                </h1>

                <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
                  {brand.name} automatiza recordatorios, concilia cada pago y te muestra quién
                  está al corriente, quién está por vencer y quién necesita seguimiento.
                </p>

                <p className="mt-3 max-w-[46ch] text-[13px] leading-relaxed text-ink/70">
                  {brand.positioning}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" variant="brand">
                    <Link href="/demo">
                      Solicitar demo
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/#como">Ver cómo funciona</Link>
                  </Button>
                </div>

                <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
                  ¿Prefieres explorarlo tú mismo?{' '}
                  <Link href="/registro" className="font-medium text-ink underline underline-offset-2">
                    Crea una cuenta gratis
                  </Link>
                </p>

                {/* Trust row */}
                <ul className="mt-10 grid max-w-[46ch] grid-cols-2 gap-x-4 gap-y-2.5">
                  {[
                    'Cobranza preventiva',
                    'Conciliación automática',
                    'Dinero directo a tu escuela',
                    'Hecho para México',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preview — 7 columnas, se sale del margen a la derecha */}
              <div className="animate-fade-up lg:col-span-7 lg:-mr-24 xl:-mr-32">
                <DashboardPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ── TIPOS DE ESCUELA ────────────────────────────────────────── */}
        <section className="border-y border-[#111111]/[0.08] bg-[#111111]/[0.015]">
          <div className="mx-auto w-full max-w-[1180px] px-6 py-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
              <p className="shrink-0 max-w-[22ch] text-[12px] leading-relaxed text-muted-foreground">
                Diseñado para cualquier institución que cobre mensualidades en México
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                {TIPOS.map(({ Icon, label }) => (
                  <div key={label} className="inline-flex items-center gap-2 text-ink/70">
                    <Icon className="h-4 w-4" strokeWidth={1.6} />
                    <span className="text-[13px] font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CASOS ───────────────────────────────────────────────────── */}
        <section id="casos" className="mx-auto w-full max-w-[1180px] scroll-mt-20 px-6 py-24">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">Para todo tipo de escuela</p>
              <h2 className="mt-4 text-display-md text-ink">
                Una primaria y un curso de karate cobran igual de mal.
              </h2>
              <p className="mt-5 max-w-[38ch] text-[15px] leading-relaxed text-muted-foreground">
                Por eso {brand.name} no asume nada sobre tu estructura. No hay grados fijos ni
                niveles obligatorios: tú defines los grupos, los conceptos y los montos.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {CASOS.map((c) => (
                <article
                  key={c.tipo}
                  className={`flex flex-col rounded-[12px] border bg-white p-6 transition-shadow hover:shadow-card ${
                    c.destacado
                      ? 'border-brand-200 shadow-subtle sm:row-span-1'
                      : 'border-[#111111]/[0.09] shadow-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#111111]/[0.08] bg-[#111111]/[0.02]">
                      <c.Icon className="h-4 w-4 text-brand-600" strokeWidth={1.7} />
                    </span>
                    <Badge variant="outline" className="tnum">
                      {c.alumnos}
                    </Badge>
                  </div>

                  <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.012em]">{c.tipo}</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">{c.grupos}</p>

                  <div className="mt-5 space-y-3 border-t border-[#111111]/[0.07] pt-4">
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      <span className="font-medium text-ink/70">Antes · </span>
                      {c.dolor}
                    </p>
                    <p className="text-[13px] leading-relaxed text-ink/85">
                      <span className="font-medium text-brand-600">Con {brand.name} · </span>
                      {c.solucion}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── CÓMO FUNCIONA ───────────────────────────────────────────── */}
        <section
          id="como"
          className="scroll-mt-20 border-y border-[#111111]/[0.08] bg-[#111111]/[0.015]"
        >
          <div className="mx-auto w-full max-w-[1180px] px-6 py-24">
            <div className="max-w-[52ch]">
              <p className="eyebrow">Cómo funciona</p>
              <h2 className="mt-4 text-display-md text-ink">
                Tres pasos, una vez al mes, cinco minutos.
              </h2>
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-[#111111]/[0.08] md:grid-cols-3">
              {PASOS.map((p) => (
                <div key={p.n} className="flex flex-col bg-white p-8">
                  <div className="flex items-center justify-between">
                    <span className="tnum text-[11px] font-semibold tracking-[0.14em] text-brand-600">
                      {p.n}
                    </span>
                    <p.Icon className="h-4 w-4 text-[#111111]/25" strokeWidth={1.6} />
                  </div>
                  <h3 className="mt-8 text-[17px] font-semibold leading-snug tracking-[-0.015em]">
                    {p.titulo}
                  </h3>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                    {p.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMISIÓN ────────────────────────────────────────────────── */}
        <section id="comision" className="mx-auto w-full max-w-[1180px] scroll-mt-20 px-6 py-24">
          <div className="grid items-center gap-14 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="eyebrow">La pregunta que siempre nos hacen</p>
              <h2 className="mt-4 text-display-md text-ink">
                Cada escuela decide cómo manejar los costos de procesamiento.
              </h2>
              <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-muted-foreground">
                La escuela absorbe, el tutor absorbe, o se reparte entre ambos: esa configuración
                por escuela está en construcción. Hoy, con Mercado Pago como único proveedor
                activo, el costo se suma encima del concepto por default y se muestra desglosado
                al tutor antes de pagar. Tu estado de cuenta no se toca.
              </p>

              <dl className="mt-8 space-y-3">
                {[
                  ['Fórmula vigente hoy (Mercado Pago)', 'monto × 1.0406 + $3.48'],
                  [`Lo que reporta ${brand.name} a la escuela`, 'Siempre el monto limpio del concepto'],
                  ['Quién absorbe el costo hoy', 'El tutor, por default — elegirlo por escuela viene en camino'],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex flex-col gap-1 border-b border-[#111111]/[0.07] pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                  >
                    <dt className="text-[13px] text-muted-foreground">{k}</dt>
                    <dd className="text-[13px] font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Recibo de ejemplo */}
            <div className="lg:col-span-6 lg:pl-10">
              <div className="rounded-[12px] border border-[#111111]/[0.09] bg-white p-7 shadow-card">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Lo que ve el tutor</p>
                  <Badge variant="brand">Ejemplo de cálculo</Badge>
                </div>

                <p className="mt-5 text-[13px] text-muted-foreground">
                  Alumno ejemplo · 3ro B
                </p>
                <p className="text-[15px] font-semibold tracking-[-0.01em]">
                  Colegiatura · Agosto 2026
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-muted-foreground">Concepto</span>
                    <span className="tnum text-[14px] text-ink">{formatMXN(ejemplo.concepto)}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] text-muted-foreground">
                      Comisión de procesamiento
                    </span>
                    <span className="tnum text-[14px] text-ink">{formatMXN(ejemplo.comision)}</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-[#111111]/[0.09] pt-3">
                    <span className="text-[13px] font-medium text-ink">Total a pagar</span>
                    <span className="tnum text-[22px] font-semibold tracking-[-0.025em] text-ink">
                      {formatMXN(ejemplo.total)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-[12px] leading-relaxed text-emerald-800">
                    <strong className="font-semibold">La escuela recibe {formatMXN(2450)}.</strong>{' '}
                    Íntegro, sin descuentos, sin conciliar comisiones a mano.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PLANES ──────────────────────────────────────────────────── */}
        <section
          id="planes"
          className="scroll-mt-20 border-y border-[#111111]/[0.08] bg-[#111111]/[0.015]"
        >
          <div className="mx-auto w-full max-w-[1180px] px-6 py-24">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-[46ch]">
                <p className="eyebrow">Planes</p>
                <h2 className="mt-4 text-display-md text-ink">
                  Se paga por número de alumnos, no por nivel educativo.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  Un kínder de 190 y una secundaria de 190 pagan exactamente lo mismo.
                </p>
              </div>
              <Link
                href="/planes"
                className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:underline"
              >
                Ver comparativa completa
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-12">
              <PricingCards />
              <PricingMedida />
              <PricingNota />
            </div>
          </div>
        </section>

        {/* ── EN CAMINO ───────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1180px] px-6 py-20">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">En camino</p>
              <h2 className="mt-4 text-display-sm text-ink">
                Después de cobrar a tiempo, seguimos con más cobranza.
              </h2>
              <p className="mt-3 max-w-[36ch] text-[13px] leading-relaxed text-muted-foreground">
                Sin distracciones: nada de tiendas ni financiamientos. Solo mejor cobranza.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
              {[
                {
                  titulo: 'Transferencia SPEI recomendada',
                  texto:
                    'CLABE referenciada por familia y conciliación automática del depósito, sin comisión de tarjeta.',
                },
                {
                  titulo: 'Vista "Cobranza de hoy"',
                  texto:
                    'Quién vence hoy, quién está atrasado y quién prometió pagar — con un botón para actuar en cada caso.',
                },
              ].map((x) => (
                <div
                  key={x.titulo}
                  className="rounded-[12px] border border-dashed border-[#111111]/15 bg-white p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Sparkles className="h-4 w-4 text-[#111111]/25" strokeWidth={1.6} />
                    <Badge variant="neutral">Próximamente</Badge>
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-[-0.012em]">
                    {x.titulo}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {x.texto}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section
          id="faq"
          className="scroll-mt-20 border-t border-[#111111]/[0.08] bg-[#111111]/[0.015]"
        >
          <div className="mx-auto w-full max-w-[1180px] px-6 py-24">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="eyebrow">Preguntas frecuentes</p>
                <h2 className="mt-4 text-display-sm text-ink">
                  Lo que preguntan las escuelas mexicanas antes de firmar.
                </h2>
                <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
                  ¿Falta la tuya? Escríbenos por WhatsApp y te contestamos el mismo día.
                </p>
              </div>
              <div className="lg:col-span-8">
                <Faq items={FAQS} />
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ───────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-[1180px] px-6 py-24">
          <div className="relative overflow-hidden rounded-[12px] border border-[#111111]/[0.09] bg-ink px-8 py-14 sm:px-14">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/25 blur-3xl"
              aria-hidden
            />
            <div className="relative grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <h2 className="text-[2rem] font-[640] leading-[1.1] tracking-[-0.035em] text-white sm:text-[2.4rem]">
                  El próximo día 5 puede verse muy distinto.
                </h2>
                <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-white/65">
                  Carga tu escuela hoy y genera el ciclo completo antes de que empiece el mes.
                  Si tienes el CSV a la mano, son quince minutos.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
                <Button asChild size="lg" variant="brand">
                  <Link href="/demo">
                    Solicitar demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  <Link href="/planes">
                    <CalendarClock className="h-4 w-4" />
                    Ver planes
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
