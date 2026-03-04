---
sidebar_position: 2
---

# 💬 Proyecto 1: Chat en Tiempo Real

:::info
**Dificultad:** ⭐⭐ Media | **Tiempo:** 3-4 horas | **Servicios:** Next.js, Supabase, Vercel
:::

## Qué vas a construir

Una aplicación de chat en tiempo real con salas, donde los usuarios pueden autenticarse con magic link (sin contraseña), unirse a salas de chat y enviar mensajes que aparecen instantáneamente en todos los navegadores conectados.

```
Arquitectura:

Browser A ──┐
            ├──→ Next.js (Vercel) ──→ Supabase
Browser B ──┘                          ├── Auth (magic link)
                                       ├── PostgreSQL (mensajes)
                                       └── Realtime (WebSockets)
```

## Lo que vas a aprender

- **Supabase Auth** con magic link (sin contraseñas)
- **Row Level Security (RLS)** para proteger datos a nivel de base de datos
- **Supabase Realtime** — suscripciones a cambios en tiempo real vía WebSockets
- **Next.js Server Components + Client Components** — cuándo usar cada uno
- **Deploy en Vercel** con variables de entorno correctamente configuradas

## Paso 1: Crear el proyecto Next.js

```bash
npx create-next-app@latest chat-realtime --typescript --tailwind --app
cd chat-realtime
npm install @supabase/supabase-js @supabase/ssr
```

## Paso 2: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. En el **SQL Editor**, ejecuta el siguiente schema:

```sql
-- Tabla de salas
create table salas (
  id uuid default gen_random_uuid() primary key,
  nombre text not null unique,
  created_at timestamptz default now()
);

-- Tabla de mensajes
create table mensajes (
  id uuid default gen_random_uuid() primary key,
  sala_id uuid references salas(id) on delete cascade,
  user_id uuid references auth.users(id),
  contenido text not null,
  created_at timestamptz default now()
);

-- Habilitar Realtime en mensajes
alter publication supabase_realtime add table mensajes;

-- Row Level Security
alter table salas enable row level security;
alter table mensajes enable row level security;

create policy "Todos pueden leer salas" on salas for select using (true);
create policy "Usuarios autenticados pueden leer mensajes" on mensajes for select using (auth.uid() is not null);
create policy "Usuarios autenticados pueden enviar mensajes" on mensajes for insert with check (auth.uid() = user_id);
```

3. Inserta algunas salas de ejemplo:

```sql
insert into salas (nombre) values ('general'), ('random'), ('tech');
```

:::tip
Las políticas RLS son tu primera línea de defensa. Aunque el cliente tenga acceso a la `anon key`, no podrá leer ni escribir datos sin pasar las políticas definidas.
:::

## Paso 3: Configurar el cliente Supabase

Crea el archivo `lib/supabase/client.ts` para uso en componentes cliente:

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Y el archivo `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Encuentra estas claves en tu dashboard de Supabase: **Settings → API**.

## Paso 4: Componente de chat con Realtime

Crea `components/ChatRoom.tsx` — este es el componente principal del chat:

```typescript
'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Mensaje {
  id: string
  contenido: string
  user_id: string
  created_at: string
}

interface Props {
  salaId: string
  userId: string
}

export default function ChatRoom({ salaId, userId }: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Cargar mensajes iniciales
  useEffect(() => {
    const cargarMensajes = async () => {
      const { data } = await supabase
        .from('mensajes')
        .select('*')
        .eq('sala_id', salaId)
        .order('created_at', { ascending: true })
        .limit(50)
      if (data) setMensajes(data)
    }
    cargarMensajes()

    // Suscripción Realtime
    const channel = supabase
      .channel(`sala-${salaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `sala_id=eq.${salaId}`,
        },
        (payload) => {
          setMensajes((prev) => [...prev, payload.new as Mensaje])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [salaId])

  // Scroll automático al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevoMensaje.trim()) return

    await supabase.from('mensajes').insert({
      sala_id: salaId,
      user_id: userId,
      contenido: nuevoMensaje.trim(),
    })
    setNuevoMensaje('')
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg max-w-xs ${
              msg.user_id === userId
                ? 'ml-auto bg-blue-500 text-white'
                : 'bg-gray-100'
            }`}
          >
            {msg.contenido}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={enviarMensaje} className="flex gap-2">
        <input
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          Enviar
        </button>
      </form>
    </div>
  )
}
```

:::info
La suscripción Realtime escucha solo los `INSERT` en la sala actual gracias al filtro `filter` con el valor `sala_id=eq.<salaId>`. Esto evita recibir eventos de otras salas.
:::

## Paso 5: Página principal con Auth

Crea `app/page.tsx` con el flujo de magic link:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChatRoom from '@/components/ChatRoom'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <LoginForm />
  }

  // Obtener salas disponibles
  const { data: salas } = await supabase.from('salas').select('*')

  return (
    <main>
      <h1>Chat en Tiempo Real</h1>
      <p>Bienvenido, {user.email}</p>
      {salas && salas.length > 0 && (
        <ChatRoom salaId={salas[0].id} userId={user.id} />
      )}
    </main>
  )
}

function LoginForm() {
  async function enviarMagicLink(formData: FormData) {
    'use server'
    const supabase = createClient()
    const email = formData.get('email') as string

    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_URL}/auth/callback`,
      },
    })
    redirect('/check-email')
  }

  return (
    <form action={enviarMagicLink} className="max-w-sm mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <input
        name="email"
        type="email"
        placeholder="tu@email.com"
        required
        className="w-full border rounded-lg px-3 py-2"
      />
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 rounded-lg"
      >
        Enviar magic link
      </button>
    </form>
  )
}
```

También necesitas crear `app/auth/callback/route.ts` para manejar el redirect del magic link:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(`${origin}/`)
}
```

## Paso 6: Deploy en Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy (primera vez)
vercel

# Seguir el asistente interactivo
```

En el **Dashboard de Vercel**, ve a tu proyecto → **Settings → Environment Variables** y agrega:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `NEXT_PUBLIC_URL` | URL de tu app en Vercel |

:::warning
En Supabase, ve a **Authentication → URL Configuration** y agrega tu URL de Vercel a la lista de **Redirect URLs** permitidas: `https://tu-app.vercel.app/auth/callback`
:::

## ✅ Checklist de verificación

- [ ] Tablas creadas en Supabase (`salas` y `mensajes`)
- [ ] RLS policies activas y configuradas
- [ ] Auth con magic link funcionando (revisa la carpeta de spam)
- [ ] Mensajes aparecen en tiempo real sin recargar la página
- [ ] Deploy en Vercel con variables de entorno correctas
- [ ] Probar con dos navegadores o pestañas simultáneas — los mensajes deben aparecer en ambas
