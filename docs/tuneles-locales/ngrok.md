---
sidebar_position: 3
title: ngrok
---

# ngrok

El túnel local más popular del ecosistema. Su mayor ventaja es la **interfaz web de inspección de requests**, que te permite ver y repetir cada petición HTTP recibida — invaluable para depurar webhooks.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Costo | Gratis con cuenta |
| Túneles simultáneos | 1 |
| HTTPS | ✅ Automático |
| URL | Aleatoria en cada sesión |
| URL estática | ✅ 1 dominio estático gratuito (desde 2024) |
| **Inspector web** | ✅ localhost:4040 |
| **Replay de requests** | ✅ (muy útil para webhooks) |
| Requests/min | 40 (free) |

---

## Instalación

```bash
# Mac:
brew install ngrok/ngrok/ngrok

# Windows (con winget):
winget install ngrok

# O descargar desde: https://ngrok.com/download
# (un solo binario, sin instalación)

# Linux:
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null \
  && echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list \
  && sudo apt update && sudo apt install ngrok

# Autenticar (crear cuenta gratis en ngrok.com):
ngrok config add-authtoken TU_TOKEN
# El token está en: https://dashboard.ngrok.com/get-started/your-authtoken
```

---

## Uso básico

```bash
# Tu app corre en localhost:3000
ngrok http 3000

# Puerto diferente
ngrok http 8080

# Con host header (para frameworks que necesitan el host correcto)
ngrok http --host-header=rewrite 3000

# Salida:
# ngrok
#
# Session Status     online
# Account            tu@email.com (Plan: Free)
# Version            3.x.x
# Region             United States (us)
# Web Interface      http://127.0.0.1:4040    ← Interfaz de inspección
# Forwarding         https://abc123.ngrok-free.app -> http://localhost:3000
#
# Connections        ttl     opn     rt1     rt5     p50     p90
#                    0       0       0.00    0.00    0.00    0.00
```

---

## La killer feature: el Inspector Web

Mientras ngrok está corriendo, abre [http://localhost:4040](http://localhost:4040) en tu browser:

```
┌─────────────────────────────────────────────────────────┐
│  ngrok Inspector                          localhost:4040 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Requests                                               │
│  ────────                                               │
│  POST /webhook/stripe          200 OK    2ms  ▼         │
│  ├─ Headers                                             │
│  │  stripe-signature: t=1234...                         │
│  │  content-type: application/json                      │
│  │                                                      │
│  ├─ Body (Request)                                      │
│  │  {                                                   │
│  │    "type": "payment_intent.succeeded",               │
│  │    "data": { "object": { "amount": 2000, ... } }    │
│  │  }                                                   │
│  │                                                      │
│  └─ Body (Response)                                     │
│     { "received": true }                                │
│                                                         │
│  [Replay ▶]  ← Reenviar esta petición sin ir a Stripe   │
└─────────────────────────────────────────────────────────┘
```

**El botón Replay es fundamental:** en vez de tener que ir a Stripe y disparar un evento de prueba cada vez, simplemente repites la petición anterior. Ahorra muchísimo tiempo al depurar webhooks.

---

## Dominio estático gratuito

Desde 2024, ngrok ofrece **1 dominio estático gratuito** (la URL no cambia entre sesiones):

```bash
# Ver tu dominio estático asignado:
# ngrok.com → Dashboard → Domains

# Usarlo:
ngrok http --domain=tu-nombre-asignado.ngrok-free.app 3000

# Ejemplo:
ngrok http --domain=adorable-puppy-honestly.ngrok-free.app 3000
```

Esto es muy útil para configurar webhooks y OAuth callbacks una sola vez sin tener que actualizar la URL cada vez que reinicias ngrok.

---

## Archivo de configuración

```yaml
# ~/.config/ngrok/ngrok.yml  (o ngrok.yml en el directorio actual)
version: "2"
authtoken: TU_AUTHTOKEN

tunnels:
  # Túnel principal
  web:
    proto: http
    addr: 3000
    # domain: tu-dominio.ngrok-free.app   # Si tienes dominio estático

  # Túnel para la API (en el plan pagado se pueden tener múltiples)
  api:
    proto: http
    addr: 8080
```

```bash
# Iniciar túnel del archivo de configuración:
ngrok start web

# Iniciar todos los túneles del archivo:
ngrok start --all
```

---

## Integración con frameworks populares

### Next.js

```bash
# Next.js dev server corre en 3000 por defecto
npm run dev &
ngrok http 3000
```

```typescript
// next.config.ts - permitir el dominio de ngrok para imágenes
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.ngrok-free.app',   // Para imágenes externas
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: '1',  // Evita la página de warning de ngrok en desarrollo
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

### Vite (React, Vue, Svelte)

```bash
npm run dev &   # → localhost:5173
ngrok http 5173 --host-header="localhost:5173"
```

### FastAPI / Django

```bash
uvicorn main:app --reload &   # → localhost:8000
ngrok http 8000
```

---

## Caso de uso: Depurar webhook de GitHub

```bash
# 1. Crear un repositorio de prueba en GitHub
# 2. Configurar webhook:
#    Repo → Settings → Webhooks → Add webhook
#    Payload URL: https://abc123.ngrok-free.app/webhook/github
#    Content type: application/json
#    Events: Push events, Pull request events

# 3. Levantar tu servidor local + ngrok
node server.js &
ngrok http 3000

# 4. En tu servidor:
```

```typescript
import crypto from 'crypto'
import express from 'express'

const app = express()

app.post('/webhook/github',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    // Verificar firma de GitHub
    const signature = req.headers['x-hub-signature-256'] as string
    const secret = process.env.GITHUB_WEBHOOK_SECRET!
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(req.body)
    const expected = `sha256=${hmac.digest('hex')}`

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return res.status(401).send('Firma inválida')
    }

    const event = req.headers['x-github-event']
    const payload = JSON.parse(req.body.toString())

    console.log(`Evento: ${event}`)

    if (event === 'push') {
      const branch = payload.ref.replace('refs/heads/', '')
      console.log(`Push a rama: ${branch}`)
      console.log(`Commits: ${payload.commits.length}`)
      // → Disparar re-deploy, notificar Slack, etc.
    }

    if (event === 'pull_request') {
      console.log(`PR #${payload.number}: ${payload.action}`)
      // → Correr tests, asignar reviewers, etc.
    }

    res.json({ ok: true })
  }
)
```

Luego en ngrok Inspector (`localhost:4040`) puedes:
1. Ver cada petición que llegó con sus headers y body
2. Hacer clic en **Replay** para reenviar el mismo evento sin ir a GitHub
3. Modificar el body antes de reenviar (en el plan pagado)

---

## Usar ngrok desde Node.js (programático)

Puedes iniciar ngrok directamente desde tu código:

```bash
npm install ngrok
```

```typescript
import ngrok from 'ngrok'

async function startServer() {
  // Iniciar tu servidor
  const PORT = 3000
  app.listen(PORT)
  console.log(`Servidor en puerto ${PORT}`)

  // Abrir túnel automáticamente
  if (process.env.NODE_ENV === 'development') {
    const url = await ngrok.connect({
      addr: PORT,
      authtoken: process.env.NGROK_AUTHTOKEN,
    })
    console.log(`🌐 Túnel ngrok: ${url}`)
    console.log(`🔍 Inspector: http://localhost:4040`)
  }
}

startServer()
```

---

## ⚠️ Limitaciones importantes

- **1 solo túnel activo** a la vez
- **40 requests/minuto:** si recibes más, ngrok los rechaza con 429
- **La URL cambia** en cada reinicio (excepto el dominio estático)
- **Sin autenticación básica** en URLs (pago)
- **Sin IP whitelisting** (pago)

## Comparación ngrok vs Cloudflare Tunnel

| | ngrok | Cloudflare Tunnel |
|---|---|---|
| **Inspector de requests** | ✅ Excelente | ❌ No tiene |
| **Replay de webhooks** | ✅ | ❌ |
| **Velocidad** | ⚡ Buena | ⚡⚡ Mejor |
| **Sin registro** | ❌ Requiere cuenta | ✅ Modo rápido |
| **Requests/min** | 40 (free) | Sin límite |
| **URL fija gratis** | ✅ 1 dominio | Con cuenta |
| **Múltiples túneles** | ❌ 1 (free) | ✅ Varios |

**Conclusión:**
- **Debuggear webhooks** → ngrok (por el inspector)
- **Demos, pruebas en móvil, uso general** → Cloudflare Tunnel
