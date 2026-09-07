import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'COLEKTA — Toda escuela cobra a tiempo',
    template: '%s · COLEKTA',
  },
  description:
    'Cobranza automatizada para escuelas de México. Genera links de pago, cóbralos por WhatsApp y mira en vivo quién ya pagó. Kínder, primaria, secundaria, prepa, universidad y academias.',
  keywords: [
    'cobranza escolar',
    'colegiaturas',
    'pagos escolares México',
    'Mercado Pago escuelas',
    'software para escuelas',
  ],
  openGraph: {
    title: 'COLEKTA — Toda escuela cobra a tiempo',
    description:
      'Las escuelas pierden $42,000 al mes por cobrar por WhatsApp a mano. COLEKTA lo automatiza.',
    type: 'website',
    locale: 'es_MX',
    siteName: 'COLEKTA',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-ink">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
