---
sidebar_position: 4
title: Cloudflare Pages
---

# Cloudflare Pages

Plataforma de hosting con la red más grande del mundo. El plan gratuito tiene **bandwidth ilimitado**, lo que lo hace ideal para proyectos con mucho tráfico.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Tipo | Static + SSR (con Workers) |
| Despliegue | Git o Wrangler CLI |
| **Bandwidth** | **Ilimitado** ✅ |
| Builds | 500/mes |
| Proyectos | Ilimitados |
| Workers (Pages Functions) | 100,000 req/día |
| Dominio | `.pages.dev` + custom gratis |
| Preview deploys | ✅ Por cada PR |
| Docker | ❌ No directo (Workers solo JS/WASM) |

## Despliegue desde GitHub (recomendado)

1. Ir a [https://dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create**
2. Seleccionar **Pages** → **Connect to Git**
3. Autorizar GitHub → seleccionar repositorio
4. Configurar:

| Framework | Build Command | Output Dir |
|---|---|---|
| Vite (React/Vue) | `npm run build` | `dist` |
| Next.js | `npm run build` | `.next` |
| Astro | `npm run build` | `dist` |
| Nuxt | `npm run build` | `.output/public` |
| SvelteKit | `npm run build` | `build` |

5. **Save and Deploy**

## Despliegue con CLI (Wrangler)

```bash
npm install -g wrangler
wrangler login

# Desplegar carpeta dist
wrangler pages deploy ./dist --project-name=mi-proyecto

# Crear proyecto nuevo
wrangler pages project create mi-proyecto
```

## Variables de entorno

```
Workers & Pages → tu-proyecto → Settings → Environment Variables → Add variable
```

- Puedes definir variables para **Production** y **Preview** por separado
- Para variables secretas: marcar como **Secret** (se ocultan en logs)

## Pages Functions (backend en el Edge)

Crea una carpeta `/functions` en tu proyecto. Cada archivo es una ruta:

```
/functions/api/usuarios.js   →  /api/usuarios
/functions/api/[id].js       →  /api/:id  (rutas dinámicas)
```

```javascript
// functions/api/usuarios.js
export async function onRequestGet(context) {
  return Response.json({ usuarios: ['Ana', 'Pedro'] })
}

export async function onRequestPost(context) {
  const body = await context.request.json()
  // procesar...
  return Response.json({ creado: true }, { status: 201 })
}
```

```javascript
// functions/api/[id].js  (ruta dinámica)
export async function onRequestGet({ params }) {
  const { id } = params
  return Response.json({ id, nombre: 'Usuario ' + id })
}
```

### Acceso a bindings desde Functions

```javascript
// functions/api/datos.js
export async function onRequestGet({ env }) {
  // D1 Database
  const { results } = await env.DB.prepare('SELECT * FROM items').all()
  
  // KV Storage
  const valor = await env.MI_KV.get('clave')
  
  // R2 Bucket
  const objeto = await env.MI_BUCKET.get('archivo.txt')
  
  return Response.json({ results })
}
```

## Configurar bindings (D1, KV, R2)

En el dashboard: `Settings → Functions → Bindings`

O en `wrangler.toml` para deploy desde CLI:

```toml
name = "mi-proyecto"
pages_build_output_dir = "./dist"

[[d1_databases]]
binding = "DB"
database_name = "mi-base"
database_id = "xxxx-xxxx"

[[kv_namespaces]]
binding = "MI_KV"
id = "xxxx"

[[r2_buckets]]
binding = "MI_BUCKET"
bucket_name = "mis-archivos"
```

## Configurar redirects y headers

Crear `public/_redirects`:
```
/api/*  /api/:splat  200
/*      /index.html  200
```

Crear `public/_headers`:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Cache-Control: public, max-age=3600

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

## Proyectos y organizaciones

- Los proyectos viven dentro de una **cuenta de Cloudflare** (puede ser personal o una org)
- Puedes crear **múltiples proyectos** (Pages projects) en la misma cuenta
- Para colaborar: añadir miembros en `Account → Members` (gratis hasta 5 miembros)

## Dominio custom

1. `Settings → Custom domains → Set up a custom domain`
2. Si tu DNS ya está en Cloudflare: se configura automáticamente
3. Si usas otro proveedor: agregar el CNAME que te indica Cloudflare

## ⚠️ Limitaciones importantes

- **500 builds/mes:** con muchos commits se puede agotar (usar branch deploys solo en `main`)
- **Workers = JS/WASM únicamente:** no puedes correr Python, Go, etc. en funciones
- **Sin persistencia en Workers:** debes usar D1, KV o R2 para estado
