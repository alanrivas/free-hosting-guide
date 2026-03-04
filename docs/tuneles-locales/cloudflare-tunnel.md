---
sidebar_position: 2
title: Cloudflare Tunnel
---

# Cloudflare Tunnel (cloudflared)

El túnel más rápido y con menos limitaciones. No requiere cuenta para uso básico. Usa la red global de Cloudflare.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Costo | **Completamente gratis** |
| Registro | ❌ No requerido (modo rápido) |
| HTTPS | ✅ Automático |
| Velocidad | ⚡ Muy alta (red de Cloudflare) |
| URL | Aleatoria en cada sesión |
| URL fija | ✅ Con cuenta gratuita de Cloudflare |
| Límite de requests | Sin límite práctico |
| Múltiples túneles | ✅ Con cuenta |

---

## Instalación

```bash
# Windows (PowerShell como administrador):
winget install --id Cloudflare.cloudflared

# Mac:
brew install cloudflare/cloudflare/cloudflared

# Linux (Debian/Ubuntu):
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Verificar instalación:
cloudflared --version
```

---

## Uso rápido (sin cuenta)

La forma más rápida — cero configuración, cero registro:

```bash
# Tu app corre en puerto 3000:
cloudflared tunnel --url http://localhost:3000
```

Salida:
```
2024-01-15T10:30:00Z INF Thank you for trying Cloudflare Tunnel. Doing so, without a Cloudflare account, is a quick way to experiment and try it out. However, be aware that:
...
+-------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:     |
|  https://random-words-here.trycloudflare.com          |
+-------------------------------------------------------+
```

**¡Listo!** Comparte esa URL y cualquiera puede acceder a tu localhost.

```bash
# Otros ejemplos:
cloudflared tunnel --url http://localhost:8080   # puerto diferente
cloudflared tunnel --url http://localhost:5173   # Vite dev server
cloudflared tunnel --url http://localhost:8000   # FastAPI/Django
```

---

## Uso con cuenta (URL fija y persistente)

Con una cuenta gratuita de Cloudflare puedes tener túneles con nombres fijos:

### 1. Autenticarse

```bash
cloudflared tunnel login
# Abre el browser para autenticarse con tu cuenta de Cloudflare
```

### 2. Crear el túnel

```bash
# Crear túnel con nombre
cloudflared tunnel create mi-proyecto-dev

# Ver lista de túneles
cloudflared tunnel list

# Salida:
# ID                                    NAME              CREATED
# f6c9a8b2-xxxx-xxxx-xxxx-xxxxxxxxxxxx  mi-proyecto-dev   2024-01-15T...
```

### 3. Configurar el túnel

```yaml
# ~/.cloudflared/config.yml
tunnel: f6c9a8b2-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # ID del túnel
credentials-file: /home/usuario/.cloudflared/f6c9a8b2-xxxx.json

ingress:
  - hostname: dev.mi-dominio.com          # Tu dominio (si tienes uno en Cloudflare)
    service: http://localhost:3000
  - service: http_status:404              # Default: 404 para todo lo demás
```

### 4. Crear registro DNS

```bash
# Apuntar subdominio a tu túnel (si tienes dominio en Cloudflare)
cloudflared tunnel route dns mi-proyecto-dev dev.mi-dominio.com
```

### 5. Correr el túnel

```bash
# Con archivo de configuración:
cloudflared tunnel run mi-proyecto-dev

# O especificando directamente:
cloudflared tunnel --url http://localhost:3000 run mi-proyecto-dev
```

---

## Caso de uso: Webhooks de Stripe en desarrollo

```bash
# 1. Levantar tu API local
npm run dev   # → corre en localhost:3000

# 2. En otra terminal, abrir el túnel
cloudflared tunnel --url http://localhost:3000
# → https://abc-def-ghi.trycloudflare.com

# 3. Configurar el webhook en Stripe Dashboard:
# https://dashboard.stripe.com/test/webhooks
# → Add endpoint: https://abc-def-ghi.trycloudflare.com/webhook/stripe
# → Events: payment_intent.succeeded, payment_intent.payment_failed

# 4. En tu código, recibir el webhook:
```

```typescript
// src/routes/webhook.ts
import Stripe from 'stripe'
import express from 'express'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const router = express.Router()

// IMPORTANTE: usar express.raw() antes de este router para preservar el body
router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature']!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!  // del Dashboard de Stripe
    )
  } catch (err) {
    console.error('Webhook signature inválida:', err)
    return res.status(400).send(`Webhook Error: ${err}`)
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('✅ Pago exitoso:', paymentIntent.amount)
      // → actualizar orden en DB, enviar email de confirmación, etc.
      break

    case 'payment_intent.payment_failed':
      console.log('❌ Pago fallido')
      // → notificar al usuario
      break
  }

  res.json({ received: true })
})

export default router
```

---

## Caso de uso: OAuth de GitHub App en desarrollo

```bash
# 1. En GitHub Developer Settings → New GitHub App:
# Callback URL: https://abc-def-ghi.trycloudflare.com/auth/callback

# 2. Levantar app + túnel como arriba

# 3. En tu código:
```

```typescript
// src/routes/auth.ts
import { Octokit } from '@octokit/oauth-app'

const CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

// Redirigir a GitHub para autorización
app.get('/auth/github', (req, res) => {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,user`
  res.redirect(authUrl)
})

// GitHub redirige aquí después de que el usuario autoriza
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query

  // Intercambiar code por access token
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code })
  })

  const { access_token } = await response.json()

  // Obtener datos del usuario
  const octokit = new Octokit({ auth: access_token })
  const { data: user } = await octokit.request('GET /user')

  console.log('Usuario autenticado:', user.login)
  res.json({ user: user.login, token: access_token })
})
```

---

## Caso de uso: Probar en móvil

```bash
# 1. Levantar tu app (Vite, Next.js dev, etc.)
npm run dev   # → localhost:5173

# 2. Abrir túnel
cloudflared tunnel --url http://localhost:5173

# 3. En tu celular:
# Abrir el browser → navegar a https://xxx.trycloudflare.com
# ¡Tu app en el celular!
```

**Extra: hacer que Vite acepte conexiones externas** (para probar desde la misma red sin túnel):

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    host: '0.0.0.0',  // ← Escuchar en todas las interfaces
    port: 5173,
  }
})
// Luego acceder desde celular: http://192.168.1.X:5173
```

---

## Correr como servicio (siempre activo)

```bash
# Instalar como servicio del sistema (requiere cuenta y config.yml)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Ver estado
sudo systemctl status cloudflared
```

---

## ⚠️ Limitaciones importantes

- No compartir URLs de túnel con datos sensibles ni usarlas en producción
- **Los túneles rápidos** (sin cuenta) duran ~24 horas y la URL cambia en cada reinicio
- **Variables de entorno:** nunca pongas secrets en la URL del túnel
- Para demos a clientes: usar el túnel solo durante la demo, luego cerrar
- En CI/CD: no usar túneles, usar URLs reales de staging
