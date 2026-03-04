---
sidebar_position: 1
title: Supabase
---

# Supabase

Backend as a Service basado en **PostgreSQL**. Incluye base de datos, autenticación, almacenamiento de archivos, funciones edge y suscripciones en tiempo real — todo gratis en el plan Free.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Motor | **PostgreSQL** |
| Storage DB | 500 MB |
| Storage archivos | 1 GB |
| Proyectos activos | **2 proyectos** |
| **Pausa por inactividad** | ⚠️ 1 semana sin actividad |
| Auth (MAU) | 50,000 usuarios activos/mes |
| Realtime | ✅ Incluido |
| Edge Functions | 500,000 invocaciones/mes |
| Bandwidth | 5 GB/mes |
| Backups | ❌ No en free |
| Organizaciones | Ilimitadas |

## Crear proyecto

```
1. https://supabase.com → New Project
2. Organización: crear o seleccionar existente
3. Configurar:
   - Name: mi-proyecto
   - Database Password: elegir una contraseña segura (¡guardarla!)
   - Region: elegir la más cercana (South America São Paulo, US East, EU Frankfurt)
4. Esperar ~2 minutos a que se aprovisione
```

## Obtener credenciales

```
Settings → API
├── Project URL: https://xxxx.supabase.co
├── anon (public) key: eyJhb...  ← para el cliente/frontend
└── service_role key: eyJhb...  ← SOLO en el servidor, nunca en el cliente
```

## Instalación del cliente

```bash
npm install @supabase/supabase-js
```

## Configurar cliente

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...  # solo servidor
```

## Crear tablas

**Opción 1: Table Editor (GUI)**
```
Table Editor → New Table
→ Name: usuarios
→ Columns: id (uuid, primary key), nombre (text), email (text, unique), created_at (timestamp)
→ Enable RLS: ✅ (recomendado)
```

**Opción 2: SQL Editor**
```sql
-- SQL Editor → New query
CREATE TABLE usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
```

## Operaciones CRUD

```typescript
// SELECT
const { data, error } = await supabase
  .from('usuarios')
  .select('*')
  .eq('activo', true)
  .order('created_at', { ascending: false })
  .limit(10)

// SELECT con relaciones
const { data } = await supabase
  .from('posts')
  .select(`
    id, titulo, contenido,
    autor:usuarios(nombre, email)
  `)

// INSERT
const { data, error } = await supabase
  .from('usuarios')
  .insert({ nombre: 'Juan', email: 'juan@email.com' })
  .select()  // retorna el registro creado

// UPDATE
const { data, error } = await supabase
  .from('usuarios')
  .update({ activo: false })
  .eq('id', userId)
  .select()

// DELETE
const { error } = await supabase
  .from('usuarios')
  .delete()
  .eq('id', userId)

// UPSERT (insert o update si existe)
const { data, error } = await supabase
  .from('configuracion')
  .upsert({ user_id: userId, tema: 'dark' })
  .select()
```

## Autenticación

```typescript
// Registrar usuario
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@email.com',
  password: 'contraseña123',
  options: {
    data: { nombre: 'Juan' }  // metadata adicional
  }
})

// Login con email/password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@email.com',
  password: 'contraseña123',
})

// Login con OAuth (Google, GitHub, etc.)
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://mi-app.com/auth/callback'
  }
})

// Logout
await supabase.auth.signOut()

// Obtener usuario actual
const { data: { user } } = await supabase.auth.getUser()

// Escuchar cambios de sesión
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') console.log('Logueado:', session?.user)
  if (event === 'SIGNED_OUT') console.log('Deslogueado')
})
```

## Row Level Security (RLS)

RLS controla qué datos puede ver/modificar cada usuario. **Siempre activarlo en producción.**

```sql
-- Política: cada usuario solo ve sus propios datos
CREATE POLICY "usuarios_propios" ON usuarios
  FOR ALL
  USING (auth.uid() = user_id);

-- Política: lectura pública, escritura solo autenticados
CREATE POLICY "lectura_publica" ON posts
  FOR SELECT USING (true);

CREATE POLICY "escritura_autenticada" ON posts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

## Realtime (suscripciones)

```typescript
// Escuchar cambios en una tabla
const channel = supabase
  .channel('cambios-mensajes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'mensajes' },
    (payload) => {
      console.log('Cambio recibido:', payload)
      if (payload.eventType === 'INSERT') {
        // nuevo mensaje...
      }
    }
  )
  .subscribe()

// Desuscribirse
supabase.removeChannel(channel)
```

## Storage (archivos)

```typescript
// Subir archivo
const { data, error } = await supabase.storage
  .from('avatares')  // nombre del bucket
  .upload(`${userId}/avatar.png`, file, {
    contentType: 'image/png',
    upsert: true
  })

// Obtener URL pública
const { data } = supabase.storage
  .from('avatares')
  .getPublicUrl(`${userId}/avatar.png`)

console.log(data.publicUrl)

// Eliminar archivo
await supabase.storage
  .from('avatares')
  .remove([`${userId}/avatar.png`])
```

## Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Crear función
supabase functions new mi-funcion

# Estructura creada: supabase/functions/mi-funcion/index.ts
```

```typescript
// supabase/functions/mi-funcion/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data } = await supabase.from('usuarios').select('*')
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

```bash
# Desplegar función
supabase functions deploy mi-funcion --project-ref tu-project-ref
```

## Prevenir la pausa automática

Supabase pausa proyectos inactivos después de **1 semana** en el plan free.

**Solución con cron-job.org (gratuito):**
1. Registrarse en [https://cron-job.org](https://cron-job.org)
2. **Create cronjob**:
   - URL: `https://tu-proyecto.supabase.co/rest/v1/cualquier-tabla?select=id&limit=1`
   - Headers: `apikey: tu-anon-key`
   - Interval: cada 3 días
3. Esto mantiene el proyecto activo sin costo

## Organizaciones y proyectos

```
Organización
└── Proyecto 1 (500 MB DB, 1 GB Storage)
└── Proyecto 2 (500 MB DB, 1 GB Storage)
```

- Máximo **2 proyectos activos** por organización en free
- Para más proyectos: pausar uno antes de crear otro
- Las organizaciones son gratuitas e ilimitadas

## ⚠️ Limitaciones importantes

- **Pausa por inactividad:** el mayor problema del free tier
- **Sin backups automáticos:** hacer exports manuales regularmente desde SQL Editor → Export
- **5 GB bandwidth:** puede agotarse con apps de muchas imágenes
- **500 MB DB:** suficiente para la mayoría de proyectos de dev/prueba
