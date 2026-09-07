# COLEKTA

**Toda escuela cobra a tiempo.**

SaaS B2B de cobranza educativa para México. Genera el link de pago de cada alumno, lo manda por
WhatsApp y concilia solo cuando el tutor paga. Sirve igual para una estancia infantil de 40
alumnos que para una universidad de 800: **nada está hardcodeado a "1ro a 6to"**, todos los
grupos, conceptos y montos son configurables.

---

## Índice

1. [Regla de negocio crítica: la comisión](#1-regla-de-negocio-crítica-la-comisión)
2. [Stack](#2-stack)
3. [Arranque rápido](#3-arranque-rápido)
4. [Supabase: base de datos y RLS](#4-supabase-base-de-datos-y-rls)
5. [Mercado Pago en México: cómo sacar el access token](#5-mercado-pago-en-méxico-cómo-sacar-el-access-token)
6. [WhatsApp Cloud API: app de Meta, token y phone number ID](#6-whatsapp-cloud-api-app-de-meta-token-y-phone-number-id)
7. [Resend (emails, opcional)](#7-resend-emails-opcional)
8. [Deploy en Vercel](#8-deploy-en-vercel)
9. [Mapa del código](#9-mapa-del-código)
10. [API interna](#10-api-interna)
11. [Cómo probar el flujo completo](#11-cómo-probar-el-flujo-completo)
12. [Planes y límites](#12-planes-y-límites)

---

## 1. Regla de negocio crítica: la comisión

**El papá o tutor paga la comisión de Mercado Pago. La escuela nunca la absorbe.**

```
total_a_cobrar = monto_concepto * 1.0406 + 3.48
```

| Concepto de la escuela | Comisión | Paga el tutor | Recibe la escuela |
| ---------------------- | -------- | ------------- | ----------------- |
| $1,200.00              | $53.35   | $1,253.35     | **$1,200.00**     |
| $2,450.00              | $102.95  | $2,552.95     | **$2,450.00**     |
| $4,800.00              | $198.37  | $4,998.37     | **$4,800.00**     |

- `payments.monto_concepto` → **lo que se le reporta a la escuela**. Todos los KPIs del dashboard
  y la exportación contable se calculan sobre esta columna.
- `payments.monto_total_cobrado` → lo que se le cobra al tutor y lo que va como `unit_price` en la
  preference de Mercado Pago.
- El desglose se muestra íntegro en la página pública `/p/[token]` antes de pagar.

La fórmula vive en un solo lugar: [`src/lib/fees.ts`](src/lib/fees.ts). Si Mercado Pago cambia sus
tarifas, se ajusta ahí y todo el sistema queda consistente.

---

## 2. Stack

| Pieza      | Tecnología                                             |
| ---------- | ------------------------------------------------------ |
| Framework  | Next.js 14 (App Router) + TypeScript                   |
| UI         | Tailwind CSS + shadcn/ui + Radix + lucide-react         |
| Tablas     | @tanstack/react-table + @tanstack/react-virtual         |
| Backend    | Supabase (Postgres + Auth + Storage) con RLS multi-tenant |
| Pagos      | Mercado Pago Checkout Bricks (Wallet Brick) + webhooks  |
| Mensajería | WhatsApp Cloud API (Meta)                               |
| Emails     | Resend (opcional)                                       |
| Toasts     | sonner                                                  |
| Deploy     | Vercel                                                  |

---

## 3. Arranque rápido

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local     # en Windows: copy .env.example .env.local

# 3. Base de datos: pega supabase/schema.sql en el SQL Editor de Supabase y córrelo

# 4. Arrancar
npm run dev
```

Abre <http://localhost:3000>, crea tu cuenta en `/registro` y sigue el onboarding de 3 pasos.

Lo mínimo indispensable para que arranque son las tres variables de Supabase. Sin Mercado Pago
puedes cargar alumnos y generar pagos; sin WhatsApp los mensajes quedan en cola listos para
enviarse a mano.

---

## 4. Supabase: base de datos y RLS

### 4.1 Crear el proyecto

1. Entra a <https://supabase.com/dashboard> y crea un proyecto.
   Elige la región **East US (North Virginia)** o **West US**: son las más cercanas a México.
2. Ve a **Project Settings › API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` **(secreta, nunca la expongas al cliente)**

### 4.2 Correr el esquema

Abre **SQL Editor › New query**, pega el contenido completo de
[`supabase/schema.sql`](supabase/schema.sql) y ejecútalo. Es idempotente: lo puedes correr varias
veces. Crea:

- Los 7 tipos enum y las 7 tablas (`schools`, `profiles`, `groups`, `students`, `concepts`,
  `payments`, `whatsapp_logs`).
- El trigger que crea el `profile` automáticamente al registrarse un usuario.
- **Row Level Security en todas las tablas, aislada por `school_id`.**
- La vista `v_payment_rows` que alimenta el dashboard.
- La función `marcar_atrasados()` que usa el cron.
- El bucket público `logos` para los logotipos de las escuelas.

### 4.3 Cómo funciona el aislamiento multi-tenant

```sql
create or replace function public.current_school_id()
returns uuid language sql stable security definer as $$
  select school_id from public.profiles where id = auth.uid()
$$;
```

Cada tabla hija tiene cuatro políticas (select / insert / update / delete) con la misma condición:

```sql
using (school_id = public.current_school_id())
```

Esto significa que **aunque alguien manipule la consulta desde el navegador con la anon key,
Postgres no devuelve ni una fila de otra escuela.** No dependemos de filtrar en el código.

**La página pública `/p/[token]`** es la excepción de diseño: el tutor no tiene cuenta. En vez de
abrir una política para `anon` (que permitiría enumerar pagos), esa página se renderiza en el
servidor con la `service_role` key filtrando por `link_token`, que es un UUID v4 no adivinable.
RLS sigue 100 % cerrado para usuarios anónimos.

### 4.4 Autenticación

En **Authentication › Providers › Email**:

- Deja **Enable Email provider** activado.
- Para desarrollo, apaga **Confirm email** y entras directo tras registrarte.
- Para producción, déjalo prendido y configura tu SMTP en **Authentication › Emails**.

En **Authentication › URL Configuration** pon tu `Site URL`
(`http://localhost:3000` o tu dominio de Vercel) y agrégalo a **Redirect URLs**.

---

## 5. Mercado Pago en México: cómo sacar el access token

COLEKTA soporta dos modos y el de la escuela siempre gana sobre el del `.env`:

- **Credenciales de plataforma** (`.env`) → útil para probar y para escuelas que aún no tienen
  cuenta propia.
- **Credenciales por escuela** (Configuración › Integraciones) → **el dinero cae directo a la
  cuenta de la escuela**. Es lo recomendado en producción.

### 5.1 Paso a paso

1. Entra a <https://www.mercadopago.com.mx/developers/panel> con la cuenta de Mercado Pago **de la
   escuela** (la misma donde quieren recibir el dinero).
2. Clic en **Tus integraciones › Crear aplicación**.
   - Nombre: `COLEKTA <nombre de la escuela>`
   - Producto: **Pagos online**
   - Modelo de integración: **Checkout Pro / Bricks**
   - Plataforma: **No, estoy usando una solución propia**
3. Entra a la aplicación recién creada y ve a **Credenciales de prueba**:
   - `Public Key` (empieza con `TEST-`) → `NEXT_PUBLIC_MP_PUBLIC_KEY`
   - `Access Token` (empieza con `TEST-`) → `MP_ACCESS_TOKEN`
4. Cuando ya vayas a cobrar de verdad, repite con **Credenciales de producción**
   (`APP_USR-...`). Mercado Pago te va a pedir completar los datos fiscales de la escuela.
5. Pega esas credenciales en **COLEKTA › Configuración › Integraciones › Mercado Pago**.

### 5.2 Webhook de pagos

El `notification_url` se registra automáticamente en cada preference que crea COLEKTA:

```
https://TU-DOMINIO/api/webhooks/mercadopago?school=<school_id>
```

El `school_id` viaja en la URL para que el webhook sepa con qué access token consultar el pago —
esencial cuando cada escuela usa su propia cuenta de Mercado Pago.

No necesitas configurar nada más en el panel de MP. Si quieres **validar la firma** del webhook:

1. Panel de MP › tu aplicación › **Webhooks › Configurar notificaciones**.
2. Copia la **clave secreta** y ponla en `MP_WEBHOOK_SECRET`.

COLEKTA valida el header `x-signature` con HMAC-SHA256 sobre el manifest
`id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Si dejas la variable vacía no se valida firma,
pero de todas formas **el pago se consulta contra la API de Mercado Pago**, que es la única
fuente de verdad: nunca confiamos en el cuerpo del webhook.

### 5.3 Tarjetas de prueba (México)

| Tarjeta    | Número              | CVV | Vence | Titular para probar        |
| ---------- | ------------------- | --- | ----- | -------------------------- |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/30 | `APRO` = aprobado          |
| Visa       | 4075 5957 1648 3764 | 123 | 11/30 | `OTHE` = rechazado general |
| Amex       | 3743 781877 55283   | 1234| 11/30 | `CONT` = pendiente         |

Usa cualquier correo y como número de documento `12345678`.

---

## 6. WhatsApp Cloud API: app de Meta, token y phone number ID

> **No es obligatorio para empezar.** Sin token, `POST /api/whatsapp/send-bulk` guarda cada
> mensaje en `whatsapp_logs` con status `en_cola` y el texto completo ya armado. Desde
> **Dashboard › WhatsApp** lo abres en WhatsApp Web con un clic, lo mandas y lo marcas como
> enviado. Nada se pierde y no hay `console.log` vacíos.

### 6.1 Crear la app

1. Entra a <https://developers.facebook.com> y haz login con tu cuenta de Facebook.
2. **Mis apps › Crear app**.
   - Caso de uso: **Otro**
   - Tipo: **Negocios**
   - Vincúlala a tu **cuenta de Meta Business** (si no tienes, créala; te va a pedir verificar la
     empresa para salir de modo prueba).
3. En el panel de la app: **Agregar productos › WhatsApp › Configurar**.

### 6.2 Sacar el phone number ID y el token de prueba

En **WhatsApp › Configuración de la API** vas a ver:

- **Identificador del número de teléfono** (`Phone number ID`) → `WHATSAPP_PHONE_NUMBER_ID`.
  ⚠️ Es un número largo tipo `123456789012345`, **no** es el número telefónico.
- **Token de acceso temporal** → `WHATSAPP_TOKEN`. Sirve 24 horas, solo para probar.

En esa misma pantalla agrega tu celular en **Números de teléfono del destinatario** para poder
recibir mensajes de prueba.

### 6.3 Token permanente (producción)

El token temporal expira cada 24 h. Para producción necesitas un **usuario del sistema**:

1. <https://business.facebook.com/settings> › **Usuarios › Usuarios del sistema › Agregar**.
   - Nombre: `colekta-api`, Rol: **Administrador**.
2. Clic en **Agregar activos** → selecciona tu **app de WhatsApp** y tu **cuenta de WhatsApp
   Business (WABA)** con control total.
3. Clic en **Generar nuevo token**:
   - App: la que creaste
   - Caducidad: **Nunca**
   - Permisos: `whatsapp_business_messaging` y `whatsapp_business_management`
4. Copia el token → `WHATSAPP_TOKEN` (o pégalo en **Configuración › Integraciones › WhatsApp**
   para que aplique solo a esa escuela).

### 6.4 Registrar el webhook

1. En la app: **WhatsApp › Configuración › Webhooks › Editar**.
2. **URL de devolución de llamada**: `https://TU-DOMINIO/api/webhooks/whatsapp`
3. **Token de verificación**: el mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN`.
4. Clic en **Verificar y guardar**. COLEKTA responde el `hub.challenge` automáticamente.
5. En **Campos del webhook** suscríbete a **`messages`** (trae estados de entrega y respuestas de
   los tutores).
6. Opcional pero recomendado: copia el **App Secret** (Configuración de la app › Básica) a
   `WHATSAPP_APP_SECRET` para que se valide la firma `X-Hub-Signature-256`.

> En local, Meta necesita una URL pública. Usa `npx localtunnel --port 3000` o
> `ngrok http 3000` y registra esa URL temporal.

### 6.5 Crear el template aprobado

Fuera de la ventana de 24 horas, Meta **solo permite plantillas**. Crea la tuya en
<https://business.facebook.com/wa/manage/message-templates>:

- **Nombre**: `colekta_link_pago` (el valor de `WHATSAPP_TEMPLATE_NAME`)
- **Categoría**: `Utility` / Utilidad
- **Idioma**: `Español (MX)` → código `es_MX` (el valor de `WHATSAPP_TEMPLATE_LANG`)
- **Cuerpo**, exactamente con 5 variables:

```
Hola {{1}}, te comparto el link de {{2}} de {{3}} por ${{4}}. Paga aquí: {{5}}
```

- **Ejemplos** (Meta los exige para aprobar):
  `Mariana Solís` · `Colegiatura` · `Agosto 2026` · `2,552.95` ·
  `https://colekta.mx/p/9f1c2b7e-...`

La aprobación suele tardar de minutos a un par de horas. Mientras tanto, COLEKTA sigue en modo
cola sin perder ningún envío.

---

## 7. Resend (emails, opcional)

1. Crea cuenta en <https://resend.com> y verifica tu dominio en **Domains**.
2. **API Keys › Create** → copia a `RESEND_API_KEY`.
3. Pon el remitente verificado en `RESEND_FROM`, por ejemplo `COLEKTA <pagos@tuescuela.mx>`.

Si la variable está vacía, COLEKTA simplemente no manda correos. WhatsApp sigue siendo el canal
principal porque es el que de verdad leen los papás en México.

---

## 8. Deploy en Vercel

1. Sube el repo a GitHub y en <https://vercel.com/new> impórtalo. Vercel detecta Next.js solo.
2. En **Settings › Environment Variables** pega **todas** las variables de `.env.example`
   (Production y Preview).
3. Después del primer deploy, actualiza `NEXT_PUBLIC_APP_URL` con tu dominio real y vuelve a
   desplegar: esa variable arma los links de pago y los `notification_url` de Mercado Pago.
4. Agrega el dominio de Vercel en Supabase → **Authentication › URL Configuration › Redirect URLs**.
5. Los **recordatorios automáticos** ya están declarados en [`vercel.json`](vercel.json):
   `/api/cron/reminders` corre todos los días a las 15:00 UTC (9:00 a.m. hora del centro de
   México). Vercel manda el header `Authorization: Bearer $CRON_SECRET`, así que define
   `CRON_SECRET` con un valor largo y aleatorio.

---

## 9. Mapa del código

```
src/
├── app/
│   ├── page.tsx                        Landing editorial (hero asimétrico + preview real)
│   ├── planes/page.tsx                 Precios y comparativa completa
│   ├── login/ · registro/              Autenticación (layout partido, no tarjeta centrada)
│   ├── onboarding/                     Wizard de 3 pasos: escuela → grupos y alumnos → conceptos
│   ├── dashboard/
│   │   ├── layout.tsx                  Sidebar + guardia de sesión
│   │   ├── page.tsx                    KPIs + tabla virtualizada de pagos
│   │   ├── alumnos/                    Padrón + ficha e historial por alumno
│   │   ├── whatsapp/                   Bitácora de envíos
│   │   └── settings/                   Escuela, grupos, conceptos, integraciones, equipo, plan
│   ├── p/[token]/                      Página pública de pago (Checkout Bricks)
│   └── api/
│       ├── payments/generate-cycle     Genera los pagos del ciclo + preferences de MP
│       ├── payments/mark-paid          Registro manual de efectivo/transferencia
│       ├── whatsapp/send-bulk          Envío masivo (o encolado si no hay token)
│       ├── webhooks/mercadopago        Concilia pagos contra la API de MP
│       ├── webhooks/whatsapp           Verificación + estados de entrega + respuestas
│       ├── cron/reminders              Marca atrasados y reenvía recordatorios
│       ├── team/invite                 Alta y baja de usuarios del equipo
│       └── export                      Exportación contable en CSV
├── components/
│   ├── ui/                             Primitivos shadcn/ui
│   ├── brand/                          Logo (C + palomita, una sola línea)
│   ├── marketing/                      Nav, footer, pricing, FAQ, preview del dashboard
│   ├── dashboard/                      Sidebar, KPIs, tabla, diálogos, settings
│   ├── pago/                           Wallet Brick de Mercado Pago
│   └── empty-state.tsx                 Ilustraciones lineales + contenedor
├── lib/
│   ├── fees.ts                         ⚠️ La fórmula de comisión vive aquí
│   ├── mercadopago.ts                  Preferences, consulta de pagos, mapeo de estados
│   ├── whatsapp.ts                     Cloud API, render del template, links wa.me
│   ├── payments.ts                     Resolución de monto y preference perezosa
│   ├── csv.ts                          Parser tolerante de la lista de alumnos
│   ├── plans.ts                        Planes por volumen + comparativa
│   ├── supabase/                       client · server · admin (service_role)
│   └── utils.ts                        Ciclos, fechas, teléfonos MX, helpers
└── middleware.ts                       Refresco de sesión y protección de rutas
```

### Cómo se resuelve el monto de un alumno

Prioridad, en [`src/lib/payments.ts`](src/lib/payments.ts):

1. `concepts.monto_fijo` — igual para todos (inscripción, uniforme, examen).
2. `students.monto_custom` — becados, descuento por hermano.
3. `groups.monto_default` — el caso normal.

Si el resultado es 0, el alumno se omite al generar el ciclo y se reporta por nombre en la
respuesta y en un toast, para que nadie se quede sin cobrar en silencio.

---

## 10. API interna

| Método   | Ruta                          | Qué hace                                                |
| -------- | ----------------------------- | ------------------------------------------------------- |
| `POST`   | `/api/payments/generate-cycle`| Crea los pagos faltantes del ciclo + preferences de MP  |
| `POST`   | `/api/payments/mark-paid`     | Marca pagos como pagados/pendientes (efectivo)          |
| `POST`   | `/api/whatsapp/send-bulk`     | Envía o encola hasta 500 mensajes                       |
| `POST`   | `/api/webhooks/mercadopago`   | Concilia el pago consultando la API de MP               |
| `GET`    | `/api/webhooks/whatsapp`      | Verificación `hub.challenge` de Meta                    |
| `POST`   | `/api/webhooks/whatsapp`      | Estados de entrega y respuestas de tutores              |
| `GET`    | `/api/cron/reminders`         | Marca atrasados y reenvía recordatorios                 |
| `POST`   | `/api/team/invite`            | Crea la cuenta de un compañero y la liga a la escuela   |
| `DELETE` | `/api/team/invite`            | Quita el acceso de un usuario                           |
| `GET`    | `/api/export`                 | CSV contable filtrable por ciclo, estado y grupo        |

Ejemplo:

```bash
curl -X POST http://localhost:3000/api/payments/generate-cycle \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <tus cookies de sesión>' \
  -d '{
    "school_id": "uuid-de-la-escuela",
    "ciclo": "2026-08",
    "concept_id": "uuid-del-concepto",
    "group_ids": []
  }'
```

Respuesta:

```json
{
  "creados": 214,
  "omitidos_ya_existian": 0,
  "sin_monto": [],
  "preferencias_creadas": 214,
  "aviso_mp": null
}
```

---

## 11. Cómo probar el flujo completo

1. **Registro** → `/registro`, crea tu cuenta.
2. **Onboarding paso 1** → nombre, nivel educativo, WhatsApp, número aproximado de alumnos.
   Fíjate cómo cambia el plan recomendado al mover la cifra.
3. **Paso 2** → crea grupos (o usa los sugeridos de tu nivel) e importa alumnos. Descarga la
   plantilla CSV desde el mismo panel; el parser acepta encabezados en español con o sin acentos.
4. **Paso 3** → conceptos. Deja `Colegiatura` recurrente y agrega `Inscripción` como cobro único.
5. **Dashboard › Generar ciclo** → elige mes, concepto y grupos. Se crean los pagos y sus links.
6. Abre el menú de una fila › **Ver link de pago** → se abre `/p/[token]` con el desglose.
7. Paga con la tarjeta de prueba `5031 7557 3453 0604`, titular `APRO`.
8. El webhook de Mercado Pago marca el pago en verde. Recarga el dashboard y revisa los KPIs.
9. Selecciona 30 filas → **Enviar WhatsApp**. Si no tienes token, ve a **Dashboard › WhatsApp**:
   los mensajes están en cola, listos para mandarse con un clic.
10. **Exportar** → descarga el CSV contable con el monto limpio y el monto cobrado por separado.

### Probar el webhook en local

```bash
npx localtunnel --port 3000
# Pon la URL resultante en NEXT_PUBLIC_APP_URL y reinicia el dev server,
# para que las preferences nuevas apunten ahí.
```

---

## 12. Planes y límites

Se cobra **por volumen de alumnos activos, nunca por nivel educativo**: un kínder de 190 y una
secundaria de 190 pagan lo mismo.

| Plan            | Precio MXN/mes | Alumnos    | Incluye                                                                     |
| --------------- | -------------- | ---------- | --------------------------------------------------------------------------- |
| **Inicio**      | $999           | Hasta 200  | Links ilimitados, WhatsApp, dashboard, CSV, 1 usuario                        |
| **Crecimiento** | $1,899         | Hasta 450  | + Recordatorios día 1/5/10, reportes por grupo, exportación contable, 3 usuarios |
| **Pro**         | $3,499         | Hasta 800  | + Multi-sede, CRM por alumno, API, roles y permisos, usuarios ilimitados     |
| **A la medida** | Cotizado       | 800+       | Precio por alumno y onboarding asistido                                     |

En el roadmap, marcado como **Próximamente** en la UI: financiamiento a papás a meses y tienda de
uniformes.

Los alumnos con estatus `baja` o `egresado` **no cuentan** para el límite del plan.

---

## Licencia

Código propietario de COLEKTA. Todos los derechos reservados.
