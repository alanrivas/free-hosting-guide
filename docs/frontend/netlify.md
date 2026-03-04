---
sidebar_position: 2
title: Netlify
---

# Netlify

Plataforma de hosting estático y edge con soporte para funciones serverless, formularios y autenticación básica.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Tipo | Static + SSR + Edge Functions |
| Despliegue | Git, drag & drop, CLI |
| Bandwidth | 100 GB/mes |
| Build minutes | 300 min/mes |
| Funciones | 125,000 invocaciones/mes |
| Forms | 100 envíos/mes |
| Dominios | `.netlify.app` + custom gratis |
| Organizaciones | 1 team, múltiples sitios |
| Docker | ❌ No soportado |

## Despliegue con CLI

```bash
npm i -g netlify-cli
netlify login
netlify init       # conecta al repo
netlify deploy     # preview (no producción)
netlify deploy --prod  # producción
```

## Despliegue desde GitHub

1. Ir a [https://app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
2. Autorizar GitHub → seleccionar repositorio
3. Configurar:

| Framework | Build Command | Publish Dir |
|---|---|---|
| Vite (React/Vue) | `npm run build` | `dist` |
| Create React App | `npm run build` | `build` |
| Gatsby | `gatsby build` | `public` |
| Astro | `npm run build` | `dist` |
| Hugo | `hugo` | `public` |

4. Clic en **Deploy site**

## Archivo de configuración: `netlify.toml`

Crear en la raíz del proyecto:

```toml
[build]
  command = "npm run build"
  publish = "dist"

# Redirigir rutas de SPA al index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Redirigir /api/* a Netlify Functions
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# Variables por entorno
[context.production.environment]
  NODE_ENV = "production"

[context.deploy-preview.environment]
  NODE_ENV = "staging"
```

## Netlify Functions (backend serverless)

Crear carpeta `/netlify/functions/` en tu proyecto:

```javascript
// netlify/functions/usuarios.js
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Método no permitido' }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuarios: ['Ana', 'Pedro'] }),
  }
}
```

Accesible en: `https://tu-app.netlify.app/.netlify/functions/usuarios`  
Con el redirect configurado: `https://tu-app.netlify.app/api/usuarios`

## Variables de entorno

```
Site Settings → Environment Variables → Add a variable
```

```bash
# También desde CLI:
netlify env:set MI_VARIABLE "mi valor"
netlify env:list
```

## Netlify Edge Functions

Funciones que corren en el borde de la red (más rápidas):

```javascript
// netlify/edge-functions/middleware.js
export default async (request, context) => {
  const response = await context.next()
  response.headers.set('X-Custom-Header', 'Hola desde edge')
  return response
}

export const config = { path: '/api/*' }
```

## Formularios sin backend

Agrega el atributo `netlify` a tu formulario HTML:

```html
<form name="contacto" method="POST" data-netlify="true">
  <input type="hidden" name="form-name" value="contacto" />
  <input type="text" name="nombre" />
  <input type="email" name="email" />
  <button type="submit">Enviar</button>
</form>
```

Los envíos aparecen en el dashboard de Netlify. Límite: 100/mes en free.

## Proyectos y organizaciones

- **Sites**: cada repositorio es un "site" dentro de tu team
- **Teams**: el team free admite 1 miembro
- Puedes tener múltiples sites en el mismo team

## ⚠️ Limitaciones importantes

- **300 build minutes/mes:** con builds frecuentes se puede agotar
- **125k funciones/mes:** suficiente para proyectos pequeños
- **Sin Docker**
- **1 miembro en team free**
