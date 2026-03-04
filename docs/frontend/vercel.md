---
sidebar_position: 1
title: Vercel
---

# Vercel

Plataforma de despliegue enfocada en frontend y funciones serverless. Es el hogar nativo de **Next.js** (creado por el mismo equipo).

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Tipo | Static + SSR (Next.js nativo) |
| Despliegue | Git (GitHub, GitLab, Bitbucket) o CLI |
| Bandwidth | 100 GB/mes |
| Proyectos | Ilimitados |
| Funciones Serverless | 100,000 invocaciones/día |
| Dominios | Subdominio `.vercel.app` + dominio custom gratis |
| Build minutes | 6,000 minutos/mes |
| Tiempo máx. función | 10 segundos (free) |
| Organizaciones | 1 equipo, 1 solo miembro en free |
| Docker | ❌ No soportado |

## Despliegue con CLI

```bash
npm i -g vercel
vercel login
cd tu-proyecto
vercel          # despliega en preview
vercel --prod   # despliega en producción
```

## Despliegue desde GitHub (recomendado)

1. Ir a [https://vercel.com](https://vercel.com) → **Add New Project**
2. Conectar GitHub → seleccionar repositorio
3. Configurar según framework:

| Framework | Build Command | Output Dir |
|---|---|---|
| Next.js | `npm run build` | `.next` (auto) |
| Vite (React/Vue) | `npm run build` | `dist` |
| Create React App | `npm run build` | `build` |
| Astro | `npm run build` | `dist` |

4. Clic en **Deploy** — cada push a `main` hace auto-deploy

## Variables de entorno

```
Settings → Environment Variables → Add New
```

- Puedes tener variables diferentes por: **Production**, **Preview**, **Development**
- Para usar en el código: `process.env.MI_VARIABLE`
- Variables con prefijo `NEXT_PUBLIC_` son visibles en el cliente

## API Routes (serverless functions)

Crea funciones backend dentro de tu proyecto Next.js o Vercel:

```
/api/usuarios.ts     → accesible en https://tu-app.vercel.app/api/usuarios
```

```typescript
// pages/api/usuarios.ts  (Next.js Pages Router)
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ usuarios: ['Ana', 'Pedro'] })
  } else {
    res.status(405).json({ error: 'Método no permitido' })
  }
}
```

```typescript
// app/api/usuarios/route.ts  (Next.js App Router)
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ usuarios: ['Ana', 'Pedro'] })
}
```

## Proyectos y organizaciones

- Cada cuenta tiene un **Personal Account** gratuito (ideal para proyectos propios)
- Los **Teams** (organizaciones) en free solo permiten 1 miembro
- Para proyectos colaborativos: cada desarrollador despliega en su cuenta y comparte previews

## Dominios custom

```
Settings → Domains → Add → escribir tu dominio
```
Vercel genera los registros DNS a configurar en tu proveedor de dominio (A record o CNAME).

## ⚠️ Limitaciones importantes

- **Sin Docker:** no puedes correr contenedores
- **Cold starts:** las funciones serverless pueden tener latencia inicial
- **1 miembro en teams free:** no ideal para equipos
- **10 seg timeout:** las funciones no pueden tardar más de 10 segundos
