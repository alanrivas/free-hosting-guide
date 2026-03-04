---
sidebar_position: 1
title: Render
---

# Render

Plataforma que soporta Web Services, sitios estáticos, Cron Jobs y contenedores Docker. Es una de las mejores opciones para hospedar APIs gratis, aunque con la limitación de spin-down.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Tipo | Web Services, Static, Cron Jobs, Docker |
| RAM | 512 MB |
| CPU | 0.1 vCPU |
| **Spin-down** | ⚠️ Duerme tras 15 min sin tráfico |
| Tiempo de inicio | ~30-60 seg al despertar |
| Horas | 750 horas/mes (1 servicio continuo) |
| Dominio | `.onrender.com` + custom gratis |
| PostgreSQL | Gratis por **90 días** (luego se elimina) |
| Deploy | Git o Docker |

## Crear y desplegar un Web Service

1. Ir a [https://render.com](https://render.com) → **New** → **Web Service**
2. Conectar GitHub → seleccionar repositorio
3. Configurar:

| Campo | Valor |
|---|---|
| Name | nombre-de-tu-servicio |
| Runtime | Node / Python / Go / Rust / Docker |
| Branch | main |
| Build Command | `npm install` o `pip install -r requirements.txt` |
| Start Command | `node index.js` o `gunicorn app:app` |
| Instance Type | **Free** |

4. **Environment Variables**: agregar en la sección *Environment*
5. Clic en **Create Web Service**

Cada push a `main` activa un auto-deploy.

## Ejemplo: API Node.js en Render

```javascript
// index.js
import express from 'express'

const app = express()
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/usuarios', async (req, res) => {
  res.json({ usuarios: ['Ana', 'Pedro'] })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`))
```

```json
// package.json
{
  "scripts": {
    "start": "node index.js",
    "build": "echo 'No build needed'"
  },
  "engines": {
    "node": "20.x"
  }
}
```

## Despliegue con Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

En Render: seleccionar **Docker** como Runtime. Render detecta el `Dockerfile` automáticamente.

## `render.yaml` (Infrastructure as Code)

Crea este archivo en la raíz para definir toda tu infraestructura:

```yaml
services:
  - type: web
    name: mi-api
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: node index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: mi-base-datos
          property: connectionString

databases:
  - name: mi-base-datos
    databaseName: miapp
    user: miapp
    plan: free
```

## Variables de entorno

```
Dashboard → tu servicio → Environment → Add Variable
```

También puedes crear **Environment Groups** para compartir variables entre servicios:
```
Dashboard → Environment Groups → New Group
```

## ⚠️ Solución al spin-down (servicio siempre activo)

El plan free duerme el servidor tras 15 min de inactividad. Soluciones:

**Opción 1: UptimeRobot (gratis)**
1. Registrarse en [https://uptimerobot.com](https://uptimerobot.com)
2. **Add New Monitor** → HTTP(S)
3. URL: `https://tu-servicio.onrender.com/health`
4. Interval: **5 minutes**

**Opción 2: Cron job interno**
```javascript
// Hacer ping a sí mismo cada 10 min (no ideal pero funciona)
import https from 'https'

setInterval(() => {
  https.get(process.env.RENDER_EXTERNAL_URL + '/health')
}, 10 * 60 * 1000)
```

## Base de datos PostgreSQL (90 días gratis)

1. Dashboard → **New** → **PostgreSQL**
2. Nombre, usuario, versión de Postgres
3. Plan: **Free**
4. La cadena de conexión aparece en *Info* → *Internal Database URL*

:::warning
La base de datos free de Render **se elimina automáticamente después de 90 días**. Haz backups regulares o migra a Neon/Supabase para producción.
:::

## Logs y diagnóstico

```bash
# Ver logs en tiempo real desde CLI
# (No hay CLI oficial, usar el dashboard)
Dashboard → tu servicio → Logs
```

## ⚠️ Limitaciones importantes

- **Spin-down:** el mayor problema del free tier
- **PostgreSQL gratis solo 90 días**
- **512 MB RAM:** suficiente para APIs simples, no para apps pesadas
- **0.1 vCPU compartida:** puede ser lenta bajo carga
