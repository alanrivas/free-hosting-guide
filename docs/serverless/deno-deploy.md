---
sidebar_position: 2
title: Deno Deploy
---

# Deno Deploy

Plataforma edge para correr código TypeScript/JavaScript de forma nativa. No requiere compilación, soporta TypeScript sin configuración y tiene Deno KV incluido.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Requests | **1,000,000/mes** |
| Proyectos | Ilimitados |
| Despliegue | Git (GitHub) o deployctl CLI |
| **Deno KV** | ✅ Incluido (base de datos key-value) |
| Bandwidth | 100 GB/mes |
| Runtime | Deno (TypeScript nativo, sin configuración) |
| Sin cold start | ✅ |
| Dominio | `.deno.dev` + custom gratis |

## Despliegue desde GitHub

```
1. https://dash.deno.com → New Project
2. "Deploy from GitHub" → conectar repositorio
3. Configurar:
   - Entry Point: main.ts (o el archivo principal)
   - Branch: main
4. Deploy
```

## Despliegue con CLI

```bash
# Instalar deployctl
deno install -A jsr:@deno/deployctl

# Deploy desde archivo local
deployctl deploy --project=mi-proyecto main.ts

# Deploy con token
deployctl deploy --token=tu-token --project=mi-proyecto main.ts
```

## API básica con Deno

```typescript
// main.ts
Deno.serve(async (req: Request) => {
  const url = new URL(req.url)

  if (url.pathname === '/api/usuarios' && req.method === 'GET') {
    const usuarios = [
      { id: 1, nombre: 'Juan' },
      { id: 2, nombre: 'Ana' }
    ]
    return Response.json(usuarios)
  }

  if (url.pathname === '/api/usuarios' && req.method === 'POST') {
    const body = await req.json()
    // procesar...
    return Response.json({ creado: true, data: body }, { status: 201 })
  }

  return new Response('Not Found', { status: 404 })
})
```

## Con Hono (framework web para Deno)

```typescript
// main.ts
import { Hono } from 'https://deno.land/x/hono/mod.ts'

const app = new Hono()

app.get('/api/usuarios', (c) => {
  return c.json({ usuarios: ['Ana', 'Juan'] })
})

app.post('/api/usuarios', async (c) => {
  const body = await c.req.json()
  return c.json({ creado: body }, 201)
})

app.get('/api/usuarios/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id, nombre: 'Usuario ' + id })
})

Deno.serve(app.fetch)
```

## Deno KV (base de datos incluida)

```typescript
// Abrir la base de datos KV (persiste en Deno Deploy)
const kv = await Deno.openKv()

// SET
await kv.set(['usuarios', '123'], { nombre: 'Juan', email: 'juan@email.com' })

// GET
const resultado = await kv.get<{ nombre: string }>(['usuarios', '123'])
console.log(resultado.value?.nombre)  // 'Juan'

// LIST (listar con prefijo)
const iter = kv.list<{ nombre: string }>({ prefix: ['usuarios'] })
for await (const entry of iter) {
  console.log(entry.key, entry.value)
}

// DELETE
await kv.delete(['usuarios', '123'])

// Atomic (transacciones)
const res = await kv.atomic()
  .check({ key: ['contador'], versionstamp: null })  // solo si no existe
  .set(['contador'], 0)
  .commit()

if (!res.ok) {
  console.log('La clave ya existía')
}
```

## Variables de entorno

```
Dashboard → tu proyecto → Settings → Environment Variables
```

```typescript
// Acceder en Deno:
const apiKey = Deno.env.get('API_KEY')
const dbUrl = Deno.env.get('DATABASE_URL')
```

## Conectar a PostgreSQL externo (Neon, Supabase)

```typescript
// Con driver neon serverless
import { neon } from 'npm:@neondatabase/serverless'

const sql = neon(Deno.env.get('DATABASE_URL')!)

Deno.serve(async (req) => {
  const usuarios = await sql`SELECT * FROM usuarios`
  return Response.json(usuarios)
})
```

## Proyectos y organizaciones

- Cada cuenta tiene **proyectos ilimitados**
- Cada proyecto puede conectarse a un repositorio de GitHub
- Los **deployments** se generan en cada push (preview por PR, producción por push a main)

## ⚠️ Limitaciones importantes

- **Deno, no Node.js:** la mayoría de paquetes npm funcionan via `npm:`, pero algunos no son compatibles
- **Deno KV limitado:** no es un reemplazo de PostgreSQL para datos relacionales complejos
- **Sin Docker:** solo código JavaScript/TypeScript
- **Ecosistema más pequeño** que Node.js (aunque compatible con la mayoría de paquetes)
