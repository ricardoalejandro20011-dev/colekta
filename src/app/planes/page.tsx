import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteNav } from '@/components/marketing/site-nav';
import { SiteFooter } from '@/components/marketing/site-footer';
import {
  PricingCards,
  PricingComparativa,
  PricingMedida,
} from '@/components/marketing/pricing';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { Button } from '@/components/ui/button';
import { desglose, formatMXN } from '@/lib/fees';

export const metadata: Metadata = {
  title: 'Planes y precios',
  description:
    'COLEKTA cobra por número de alumnos, no por nivel educativo. Inicio $999, Crecimiento $1,899 y Pro $3,499 al mes.',
};

const FAQS_PLANES: FaqItem[] = [
  {
    q: '¿Por qué cobran por alumnos y no por nivel educativo?',
    a: (
      <p>
        Porque el trabajo que hace COLEKTA es el mismo: generar un link, mandarlo y conciliar el
        pago. Da igual si el alumno tiene 4 o 22 años. Cobrar por nivel castigaría a las
        primarias grandes y regalaría el servicio a las universidades.
      </p>
    ),
  },
  {
    q: '¿Qué pasa si me paso del límite de alumnos a media suscripción?',
    a: (
      <p>
        Te avisamos dentro del dashboard y puedes subir de plan cuando quieras. No cortamos los
        cobros en curso ni bloqueamos links ya generados: eso dejaría a tu escuela sin cobrar,
        que es justo lo contrario de lo que vendemos.
      </p>
    ),
  },
  {
    q: '¿La mensualidad incluye la comisión de Mercado Pago?',
    a: (
      <p>
        Son cosas distintas. La mensualidad del plan es lo que le pagas a COLEKTA. La comisión
        de Mercado Pago la paga el tutor encima del concepto ({formatMXN(2450)} de colegiatura →{' '}
        {formatMXN(desglose(2450).total)} para el papá) y a tu escuela le llega el monto limpio.
      </p>
    ),
  },
  {
    q: '¿Cuentan a los alumnos dados de baja?',
    a: (
      <p>
        No. El límite del plan cuenta únicamente alumnos con estatus <em>activo</em>. Bajas y
        egresados se conservan en el historial sin ocupar lugar.
      </p>
    ),
  },
  {
    q: '¿Puedo pagar anual?',
    a: (
      <p>
        Sí, con dos meses de descuento sobre el precio de lista. Escríbenos al crear tu cuenta y
        te mandamos el link de pago anual con factura.
      </p>
    ),
  },
];

export default function PlanesPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />

      <main>
        <section className="relative overflow-hidden border-b border-[#111111]/[0.08]">
          <div className="pointer-events-none absolute inset-0 grid-bg fade-mask-b opacity-60" />
          <div className="relative mx-auto w-full max-w-[1180px] px-6 py-20">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <p className="eyebrow">Planes</p>
                <h1 className="mt-4 text-display-lg text-ink">
                  Por volumen de alumnos.
                  <br />
                  <span className="text-muted-foreground">Nunca por nivel educativo.</span>
                </h1>
              </div>
              <div className="lg:col-span-5">
                <p className="max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
                  Un kínder de 190 alumnos y una secundaria de 190 alumnos pagan lo mismo. Todos
                  los planes incluyen links ilimitados, envío por WhatsApp y el dashboard de
                  cobranza completo.
                </p>
                <p className="mt-4 text-[12px] text-muted-foreground">
                  Precios en pesos mexicanos, más IVA. Sin contrato forzoso.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1180px] px-6 py-16">
          <PricingCards />
          <PricingMedida />
        </section>

        <section className="border-y border-[#111111]/[0.08] bg-[#111111]/[0.015]">
          <div className="mx-auto w-full max-w-[1180px] px-6 py-20">
            <div className="max-w-[46ch]">
              <p className="eyebrow">Comparativa</p>
              <h2 className="mt-4 text-display-sm text-ink">Qué incluye exactamente cada plan.</h2>
            </div>
            <div className="mt-10 rounded-[12px] border border-[#111111]/[0.09] bg-white p-6 shadow-subtle">
              <PricingComparativa />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1180px] px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow">Sobre los planes</p>
              <h2 className="mt-4 text-display-sm text-ink">Dudas de cobranza, no de software.</h2>
            </div>
            <div className="lg:col-span-8">
              <Faq items={FAQS_PLANES} />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1180px] px-6 pb-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[12px] border border-[#111111]/[0.09] bg-white p-8 shadow-subtle sm:flex-row sm:items-center">
            <div>
              <h2 className="text-[19px] font-semibold tracking-[-0.02em]">
                ¿No sabes qué plan te toca?
              </h2>
              <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-muted-foreground">
                Al crear tu cuenta te preguntamos cuántos alumnos tienes y te recomendamos el
                plan solo. Puedes cambiarlo después sin perder nada.
              </p>
            </div>
            <Button asChild size="lg" variant="brand" className="shrink-0">
              <Link href="/registro">
                Crear cuenta gratis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
