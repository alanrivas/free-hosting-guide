---
sidebar_position: 6
---

# 💳 Proyecto 5: SaaS con Pagos (Modo Test)

:::info
**Dificultad:** ⭐⭐⭐⭐ Avanzado | **Tiempo:** 6-8 horas | **Servicios:** Next.js, Supabase, Stripe
:::

:::warning
Este proyecto usa Stripe en **modo test** — no se cobra dinero real. Stripe tiene plan gratuito ilimitado en modo test, lo que lo hace perfecto para aprender sin riesgo.
:::

## Qué vas a construir

Un SaaS mínimo pero funcional:

- 🏠 **Landing page** con planes de precios
- 👤 **Registro/login** con Supabase Auth
- 🆓 **Plan gratuito** con features limitados
- 💳 **Plan Pro ($9.99/mes)** con Stripe Checkout en modo test
- 🔔 **Webhooks** que actualizan el plan en la base de datos
- 🔒 **Features protegidos** solo accesibles para usuarios Pro

```
Arquitectura:

Next.js (Vercel)
    ├── Supabase Auth ──→ Login / Registro
    ├── Supabase DB ──→ Perfiles + planes
    └── Stripe ──→ Checkout / Webhooks
            ↓
    Webhook actualiza plan en DB
            ↓
    Features desbloqueados/bloqueados según plan
```

## Lo que vas a aprender

- **Stripe Checkout** — el flujo de pago hosted de Stripe
- **Webhooks** — cómo Stripe notifica eventos a tu servidor
- **Gestión de suscripciones** — activar y cancelar planes
- **Proteger rutas por plan** — autorización basada en datos
- **Integración Supabase Auth + Stripe** — vincular usuarios con clientes de Stripe

## Paso 1: Instalar dependencias

```bash
npx create-next-app@latest mi-saas --typescript --tailwind --app
cd mi-saas
npm install @supabase/supabase-js @supabase/ssr stripe
```

## Paso 2: Schema de base de datos

En el **SQL Editor de Supabase**, crea las tablas:

```sql
-- Extender la tabla de usuarios con datos de suscripción
create table perfiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  stripe_customer_id text,
  plan text default 'free' check (plan in ('free', 'pro')),
  stripe_subscription_id text,
  subscription_end_date timestamptz,
  created_at timestamptz default now()
);

-- Crear perfil automáticamente al registrarse
create function public.crear_perfil()
returns trigger as $$
begin
  insert into public.perfiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- RLS
alter table perfiles enable row level security;
create policy "Usuarios ven su propio perfil" on perfiles
  for select using (auth.uid() = id);
create policy "Usuarios actualizan su propio perfil" on perfiles
  for update using (auth.uid() = id);
```

:::info
El trigger `on_auth_user_created` crea automáticamente un perfil en la tabla `perfiles` cada vez que un usuario se registra. No necesitas hacerlo manualmente en el código de tu app.
:::

## Paso 3: Configurar Stripe

1. Ve a [dashboard.stripe.com](https://dashboard.stripe.com) en **modo test** (toggle en la esquina superior derecha)
2. En **Products → Add product**, crea:
   - **Nombre:** Plan Pro
   - **Precio:** $9.99 / mes (recurring)
3. Copia el **Price ID** (empieza con `price_...`)
4. En **Developers → API keys**, copia tu **Secret key** de test (empieza con `sk_test_...`)

Crea `lib/stripe.ts`:

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO!
```

## Paso 4: Crear sesión de pago

Crea `app/actions/stripe.ts` como Server Action:

```typescript
'use server'
import { redirect } from 'next/navigation'
import { stripe, PRICE_ID_PRO } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function crearSesionPago() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  // Obtener perfil del usuario
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  
  let stripeCustomerId = perfil?.stripe_customer_id
  
  // Crear cliente de Stripe si no existe
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    })
    stripeCustomerId = customer.id
    
    await supabase
      .from('perfiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id)
  }
  
  // Crear sesión de Checkout
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_ID_PRO, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/precios`,
  })
  
  redirect(session.url!)
}
```

:::tip
Stripe Checkout es el flujo de pago "hosted" — Stripe se encarga de toda la UI del pago, validación de tarjetas, y cumplimiento PCI. No necesitas manejar datos de tarjetas directamente en tu app.
:::

## Paso 5: Webhook de Stripe

Crea `app/api/webhooks/stripe/route.ts`:

```typescript
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

// Cliente de Supabase con service role (para actualizar sin RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')!
  
  let event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Webhook error: firma inválida', { status: 400 })
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const customerId = session.customer as string
      const subscriptionId = session.subscription as string
      
      await supabase
        .from('perfiles')
        .update({
          plan: 'pro',
          stripe_subscription_id: subscriptionId,
        })
        .eq('stripe_customer_id', customerId)
      
      console.log(`✅ Usuario actualizado a Pro: ${customerId}`)
      break
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      
      await supabase
        .from('perfiles')
        .update({
          plan: 'free',
          stripe_subscription_id: null,
        })
        .eq('stripe_customer_id', subscription.customer as string)
      
      console.log(`⬇️ Usuario revertido a Free: ${subscription.customer}`)
      break
    }

    case 'invoice.payment_failed': {
      // Opcional: notificar al usuario que su pago falló
      console.log(`❌ Pago fallido para: ${event.data.object.customer}`)
      break
    }
  }
  
  return new Response('OK', { status: 200 })
}
```

:::warning
En el webhook, usa el cliente de Supabase con `SUPABASE_SERVICE_ROLE_KEY` (service role), no el cliente normal. Las actualizaciones de plan vienen de Stripe, no del usuario autenticado, por lo que necesitan saltarse las políticas RLS.
:::

## Paso 6: Proteger features por plan

Crea `lib/plan.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function obtenerPlan(): Promise<'free' | 'pro'> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'
  
  const { data } = await supabase
    .from('perfiles')
    .select('plan')
    .eq('id', user.id)
    .single()
  
  return (data?.plan as 'free' | 'pro') || 'free'
}

export async function requirePro() {
  const plan = await obtenerPlan()
  if (plan !== 'pro') {
    redirect('/precios?error=requiere-pro')
  }
}
```

Úsalo en Server Components para proteger páginas:

```typescript
// app/dashboard/analytics/page.tsx
import { requirePro } from '@/lib/plan'

export default async function AnalyticsPage() {
  // Redirige a /precios si el usuario no es Pro
  await requirePro()

  return (
    <div>
      <h1>📊 Analytics Avanzados</h1>
      <p>Esta página solo es visible para usuarios Pro.</p>
    </div>
  )
}
```

### Comparación de features por plan

| Feature | Free | Pro |
|---|---|---|
| Proyectos | Hasta 3 | Ilimitados |
| Analytics | ❌ | ✅ |
| Exportar datos | ❌ | ✅ |
| Soporte prioritario | ❌ | ✅ |
| API access | ❌ | ✅ |

## Paso 7: Probar webhooks localmente

```bash
# Instalar Stripe CLI
# Windows: winget install Stripe.StripeCLI
# macOS: brew install stripe/stripe-cli/stripe
# Linux: ver https://stripe.com/docs/stripe-cli

# Login con tu cuenta de Stripe
stripe login

# Escuchar webhooks y reenviarlos a tu servidor local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Output: Ready! Your webhook signing secret is whsec_xxx...
# (copia este secreto para STRIPE_WEBHOOK_SECRET en .env.local)

# En otra terminal: simular un pago completado
stripe trigger checkout.session.completed

# O simular una cancelación de suscripción
stripe trigger customer.subscription.deleted
```

:::tip
El comando `stripe listen` te da un `whsec_...` diferente al de producción. Úsalo en `.env.local` para desarrollo local. En Vercel, configura el webhook real desde el dashboard de Stripe con la URL de producción.
:::

## Variables de entorno

Crea `.env.local` con todas las variables necesarias:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_URL=http://localhost:3000
```

:::warning
`SUPABASE_SERVICE_ROLE_KEY` tiene acceso total a tu base de datos sin restricciones de RLS. **Nunca la expongas al cliente** (no uses `NEXT_PUBLIC_` prefix). Solo úsala en Server Actions, Route Handlers, y Server Components.
:::

### Variables a configurar en Vercel para producción

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (secreta) |
| `STRIPE_SECRET_KEY` | Secret key de Stripe (usa `sk_live_...` en producción) |
| `STRIPE_PRICE_ID_PRO` | ID del precio mensual Pro |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook de producción en Stripe |
| `NEXT_PUBLIC_URL` | URL de tu app en Vercel |

## ✅ Checklist de verificación

- [ ] Usuario se registra y el perfil se crea automáticamente en la tabla `perfiles`
- [ ] Stripe Checkout abre correctamente al hacer click en "Upgrade"
- [ ] Pago de prueba con tarjeta `4242 4242 4242 4242` (cualquier fecha/CVC) funciona
- [ ] Webhook recibe el evento `checkout.session.completed` y actualiza el plan a `'pro'`
- [ ] Las páginas protegidas con `requirePro()` redirigen a usuarios Free
- [ ] Simular `customer.subscription.deleted` revierte el plan a `'free'`
- [ ] Deploy en Vercel funcionando con todas las variables de entorno
- [ ] Webhook de producción configurado en el dashboard de Stripe con la URL de Vercel
