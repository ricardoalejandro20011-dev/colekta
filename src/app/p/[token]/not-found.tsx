import Link from 'next/link';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function LinkNoEncontrado() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#111111]/[0.015] px-6">
      <div className="w-full max-w-[440px] rounded-[12px] border border-[#111111]/[0.09] bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] border border-[#111111]/[0.09]">
          <LogoMark className="h-5 w-5" />
        </div>

        <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.02em] text-ink">
          Este link de pago no existe
        </h1>
        <p className="mx-auto mt-2 max-w-[38ch] text-[13px] leading-relaxed text-muted-foreground">
          Puede que se haya escrito mal, que la escuela lo haya cancelado o que el alumno haya
          sido dado de baja. Pídele a tu escuela que te reenvíe el link por WhatsApp.
        </p>

        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Conocer COLEKTA</Link>
        </Button>
      </div>
    </div>
  );
}
