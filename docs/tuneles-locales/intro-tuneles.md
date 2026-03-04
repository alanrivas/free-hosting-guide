---
sidebar_position: 1
title: ¿Qué son los túneles locales?
---

# 🌐 Túneles Locales

Un **túnel local** (o _local tunnel_) te permite exponer un servidor que corre en tu computadora (`localhost`) a internet, obteniendo una URL pública temporal. Es una de las herramientas más útiles y menos conocidas del desarrollo web.

---

## El problema que resuelven

Cuando desarrollas localmente, tu servidor corre en algo como `http://localhost:3000`. El problema: **nadie más en internet puede acceder a esa URL**.

Esto se convierte en un bloqueador cuando necesitas:

```
❌ Probar webhooks de Stripe, GitHub, Twilio...
   → Stripe necesita una URL pública para enviarte eventos de pago

❌ OAuth con Google/GitHub en desarrollo
   → Google requiere una URL de callback que sea pública

❌ Probar tu app desde el celular (otro dispositivo)
   → Tu celular no puede acceder a tu localhost

❌ Mostrarle tu trabajo a un cliente o colega
   → "Compárteme el link" → no puedes

❌ Integrar con APIs de terceros que hacen llamadas a tu server
   → La mayoría requieren URLs accesibles desde internet
```

Con un túnel local:
```
✅ localhost:3000 → https://mi-tunnel.trycloudflare.com
   (URL pública que cualquiera puede usar)
```

---

## ¿Cómo funciona?

```
Tu máquina              Internet
──────────              ────────

localhost:3000  ←───── Servidor del túnel ←───── Cliente externo
       │                       │
       └───── Conexión TCP ────┘
              (túnel seguro)

Flujo:
1. Tu app corre en localhost:3000
2. El cliente del túnel se conecta al servidor (Cloudflare, ngrok, etc.)
3. El servidor le asigna una URL pública (ej: abc123.trycloudflare.com)
4. Las peticiones a esa URL se reenvían a tu localhost:3000
```

---

## Casos de uso reales

### 🔔 Webhooks

Los webhooks son peticiones HTTP que un servicio externo hace a **tu** servidor cuando ocurre algo. Para probarlos en local, necesitas una URL pública.

```
Stripe → POST https://tu-tunnel.com/webhook/stripe
           ↓ (reenvía a)
         localhost:3000/webhook/stripe
```

**Servicios que usan webhooks:**
- **Stripe / MercadoPago** → pagos completados, fallidos, reembolsos
- **GitHub** → push, pull requests, issues, releases
- **Twilio** → SMS recibidos, llamadas entrantes
- **Clerk / Auth0** → login, registro de usuarios
- **Shopify** → pedidos, clientes
- **Discord / Slack** → comandos de bots

### 🔑 OAuth en desarrollo

```javascript
// Google OAuth requiere:
// Authorized redirect URIs: https://tu-tunnel.com/auth/callback

// Sin túnel: tienes que usar localhost y Google lo permite
// Pero con OAuth de GitHub/GitHub App: NECESITAS HTTPS público
```

### 📱 Pruebas en dispositivos móviles

```
Desarrollas en laptop → quieres probar en tu iPhone/Android
→ Tu celular no puede acceder a localhost
→ Con túnel: abres https://mi-tunnel.com en el celular
```

### 👥 Demos a clientes

```
"¿Podés mostrarme cómo va quedando?"
→ Sin túnel: "Tenés que venir a mi máquina"
→ Con túnel: "Entrá a https://demo-cliente.trycloudflare.com"
```

---

## Comparativa de servicios

| Servicio | Plan gratuito | HTTPS | URL fija | Velocidad | Instalación |
|---|---|---|---|---|---|
| **Cloudflare Tunnel** | ✅ Ilimitado | ✅ | ❌ Aleatoria | ⚡ Muy rápida | CLI |
| **ngrok** | ✅ 1 túnel, URL aleatoria | ✅ | ❌ (pago) | ⚡ Rápida | CLI |
| **localtunnel** | ✅ Ilimitado | ✅ | ✅ (si está libre) | 🐢 Lenta | npm |
| **Expose** | ✅ 1 túnel | ✅ | ❌ | Media | CLI |

**Recomendación:**
- **Uso general:** Cloudflare Tunnel (más rápido, sin límites, sin registro)
- **Webhooks con inspección:** ngrok (tiene una UI para ver/repetir requests)
- **Rápido y sin instalar nada:** localtunnel (solo npm)

En las siguientes páginas veremos cada uno en detalle.
