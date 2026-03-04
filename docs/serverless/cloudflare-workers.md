---
sidebar_position: 1
title: Cloudflare Workers
---

# Cloudflare Workers

Plataforma de cómputo en el edge de Cloudflare. Tu código corre en más de 300 ubicaciones alrededor del mundo, a milisegundos de cada usuario. **Sin cold starts, sin spin-down.**

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Requests | **100,000/día** |
| CPU time | 10 ms por request |
| Workers | Ilimitados |
| **KV Storage** | 1 GB reads gratuitas, 1M writes/día |
| **D1 Database** (SQLite) | 5 GB, 5M row reads/día, 100K writes/día |
| **R2 Storage** | 10 GB, 1M Class A ops/mes, 10M Class B ops/mes |
| **Durable Objects** | 400,000 GB-s/mes |
| Dominios | `.workers.dev` + custom gratis |
| Sin cold start | ✅ |

## Instalación y setup

```bash
# Instalar Wrangler CLI
npm install -g wrangler

# Autenticar
wrangler login

# Crear nuevo proyecto
npm create cloudflare@latest mi-worker
# Elegir: "Hello World" Worker
# TypeScript: sí
# Deploy now: sí/no
```

## Estructura del proyecto

```
mi-worker/
├── src/
│   └── index.ts       ← código principal
├── wrangler.toml      ← configuración
├── package.json
└── tsconfig.json
```

## `wrangler.toml` básico

```toml
name = "mi-worker"
main = "src/index.ts"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# Variables de entorno no secretas
[vars]
NODE_ENV = "production"
API_VERSION = "v1"

# Secrets: configurar con: wrangler secret put MI_SECRET
```

## Worker básico (API REST)

```typescript
// src/index.ts
export interface Env {
  DB: D1Database
  KV: KVNamespace
  BUCKET: R2Bucket
  API_KEY: string  // secret
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    // Router simple
    if (pathname === '/api/usuarios' && request.method === 'GET') {
      return handleGetUsuarios(request, env)
    }

    if (pathname === '/api/usuarios' && request.method === 'POST') {
      return handleCreateUsuario(request, env)
    }

    if (pathname.startsWith('/api/usuarios/')) {
      const id = pathname.split('/').pop()!
      return handleGetUsuario(id, env)
    }

    return new Response('Not Found', { status: 404 })
  }
}

async function handleGetUsuarios(request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM usuarios WHERE activo = 1 ORDER BY created_at DESC LIMIT 50'
  ).all()

  return Response.json(results, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60'
    }
  })
}

async function handleCreateUsuario(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ nombre: string; email: string }>()

  const result = await env.DB.prepare(
    'INSERT INTO usuarios (nombre, email) VALUES (?, ?) RETURNING *'
  )
  .bind(body.nombre, body.email)
  .first()

  return Response.json(result, { status: 201 })
}
```

## Configurar D1 (base de datos SQLite)

```bash
# Crear base de datos D1
wrangler d1 create mi-base-datos

# Crear schema
wrangler d1 execute mi-base-datos --remote --command "
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )
"

# Ejecutar archivo SQL
wrangler d1 execute mi-base-datos --remote --file schema.sql

# Consultar directamente
wrangler d1 execute mi-base-datos --remote --command "SELECT * FROM usuarios"
```

Agregar al `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "mi-base-datos"
database_id = "xxxx-xxxx-xxxx"  # obtenido al crear
```

## Configurar KV (key-value store)

```bash
# Crear namespace KV
wrangler kv namespace create MI_KV
wrangler kv namespace create MI_KV --preview  # para desarrollo local
```

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "KV"
id = "xxxx"
preview_id = "yyyy"
```

```typescript
// Usar KV en el Worker
await env.KV.put('clave', 'valor', { expirationTtl: 3600 })
await env.KV.put('objeto', JSON.stringify({ nombre: 'Juan' }))

const valor = await env.KV.get('clave')
const obj = await env.KV.get('objeto', 'json')

await env.KV.delete('clave')
```

## Configurar R2 (almacenamiento de archivos)

```bash
wrangler r2 bucket create mis-archivos
```

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "mis-archivos"
```

```typescript
// Subir archivo
await env.BUCKET.put('imagen.png', request.body, {
  httpMetadata: { contentType: 'image/png' }
})

// Obtener archivo
const objeto = await env.BUCKET.get('imagen.png')
if (!objeto) return new Response('Not Found', { status: 404 })

return new Response(objeto.body, {
  headers: { 'Content-Type': objeto.httpMetadata?.contentType ?? 'application/octet-stream' }
})

// Eliminar
await env.BUCKET.delete('imagen.png')
```

## Secrets y variables de entorno

```bash
# Agregar secret (encriptado)
wrangler secret put API_KEY
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL

# Listar secrets
wrangler secret list

# Eliminar secret
wrangler secret delete API_KEY
```

## Desarrollo local

```bash
# Servidor de desarrollo local (con hot reload)
wrangler dev

# Con acceso a bindings locales (D1, KV, R2):
wrangler dev --local

# Exponer en internet temporalmente:
wrangler dev --remote
```

## Deploy

```bash
# Deploy a producción
wrangler deploy

# Deploy a entorno específico
wrangler deploy --env staging
wrangler deploy --env production
```

## CORS y middleware

```typescript
// helpers/cors.ts
export function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// En el handler:
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders() })
}
```

## Autenticación con JWT

```typescript
// Verificar JWT en Workers
async function verifyJWT(token: string, secret: string): Promise<boolean> {
  const [headerB64, payloadB64, signatureB64] = token.split('.')
  
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0))
  
  return crypto.subtle.verify('HMAC', key, signature, data)
}
```

## ⚠️ Limitaciones importantes

- **10ms CPU por request:** no apto para procesamiento pesado (video, ML, etc.)
- **No Node.js nativo:** aunque hay `nodejs_compat`, no todos los módulos funcionan
- **Sin acceso a filesystem:** todo debe estar en memoria o en bindings (KV, D1, R2)
- **100k requests/día:** para apps de alta carga usar plan Workers Paid ($5/mes)
- **D1 en beta:** puede tener cambios; para producción crítica considerar Neon o PlanetScale
