'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => {
      bricks: () => {
        create: (
          brick: string,
          contenedor: string,
          config: Record<string, unknown>,
        ) => Promise<unknown>;
      };
    };
  }
}

/**
 * Wallet Brick de Mercado Pago Checkout Bricks.
 * Carga el SDK oficial una sola vez y monta el botón con el preferenceId.
 */
export function CheckoutBrick({
  preferenceId,
  publicKey,
}: {
  preferenceId: string;
  publicKey: string;
}) {
  const montado = useRef(false);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  useEffect(() => {
    if (montado.current) return;
    montado.current = true;

    let cancelado = false;

    async function cargarSdk(): Promise<void> {
      if (window.MercadoPago) return;
      await new Promise<void>((resolve, reject) => {
        const existente = document.querySelector<HTMLScriptElement>(
          'script[data-kolek-mp]',
        );
        if (existente) {
          existente.addEventListener('load', () => resolve());
          existente.addEventListener('error', () => reject(new Error('SDK')));
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://sdk.mercadopago.com/js/v2';
        s.async = true;
        s.dataset.kolekMp = 'true';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
        document.body.appendChild(s);
      });
    }

    (async () => {
      try {
        await cargarSdk();
        if (cancelado || !window.MercadoPago) return;

        const mp = new window.MercadoPago(publicKey, { locale: 'es-MX' });
        await mp.bricks().create('wallet', 'kolek-wallet', {
          initialization: { preferenceId },
          customization: {
            texts: { valueProp: 'security_safety' },
            visual: { buttonBackground: 'default', borderRadius: '10px' },
          },
          callbacks: {
            onError: (error: unknown) => {
              console.error('[mercadopago] Error del Wallet Brick:', error);
              setEstado('error');
            },
            onReady: () => setEstado('listo'),
          },
        });
      } catch (e) {
        console.error('[mercadopago] No se pudo montar el checkout:', e);
        if (!cancelado) setEstado('error');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [preferenceId, publicKey]);

  return (
    <div className="space-y-3">
      <div id="kolek-wallet" className="min-h-[52px]" />

      {estado === 'cargando' && (
        <div className="flex items-center justify-center gap-2 rounded-[10px] border border-[#111111]/[0.09] bg-[#111111]/[0.02] px-4 py-3 text-[13px] text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando el pago seguro…
        </div>
      )}

      {estado === 'error' && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-relaxed text-red-700">
          No pudimos cargar el botón de pago. Recarga la página; si sigue igual, avísale a la
          escuela para que revise su integración de Mercado Pago.
        </div>
      )}

      {estado === 'listo' && (
        <p className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Pago protegido por Mercado Pago. Kolek no guarda datos de tu tarjeta.
        </p>
      )}
    </div>
  );
}
