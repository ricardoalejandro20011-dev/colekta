import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[#111111]/[0.08] px-6 py-5">
        <Link href="/" aria-label="COLEKTA">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center px-6">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow">Error 404</p>
            <h1 className="mt-4 text-display-md text-ink">Esta página no existe.</h1>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-muted-foreground">
              Puede que el enlace esté mal escrito o que la hayamos movido. Desde aquí puedes
              volver al inicio o entrar a tu dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="brand">
                <Link href="/">Ir al inicio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Ir al dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
