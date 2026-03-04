---
sidebar_position: 2
title: Railway
---

# Railway

Plataforma moderna para desplegar apps, bases de datos y workers. Ofrece **$5 USD de créditos/mes** en el plan Hobby, suficiente para mantener un proyecto pequeño corriendo sin interrupciones.

## Límites del plan gratuito (Hobby)

| Parámetro | Valor |
|---|---|
| Crédito mensual | **$5 USD/mes** |
| RAM | Hasta 8 GB (según consumo de créditos) |
| CPU | Hasta 32 vCPU |
| **Sin spin-down** | ✅ Siempre activo |
| Despliegue | Git, Docker, CLI |
| Bases de datos incluidas | PostgreSQL, MySQL, Redis, MongoDB |
| Dominio | `.railway.app` + custom gratis |
| Workspaces | 1 workspace |
| Proyectos | Múltiples (limitados por créditos) |

:::info Estimación de créditos
Un servicio pequeño (Node.js + PostgreSQL) consume aproximadamente $2-3/mes, dejando margen para más servicios.
:::

## Crear cuenta y primer proyecto

```
1. https://railway.app → Login with GitHub
2. New Project → opción según caso:
   - "Deploy from GitHub repo"
   - "Deploy a template" (hay plantillas de Node, Django, etc.)
   - "Empty project" (para configurar manualmente)
```

## Despliegue con CLI

```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# En tu proyecto:
railway init          # crear nuevo proyecto Railway
railway up            # desplegar código actual
railway open          # abrir en browser
railway logs          # ver logs
railway status        # estado del servicio
```

## Despliegue desde GitHub

1. **New Project** → **Deploy from GitHub repo**
2. Seleccionar repositorio
3. Railway detecta automáticamente el runtime (Node, Python, Go, etc.) via **Nixpacks**
4. El deploy comienza automáticamente

## `railway.json` (configuración opcional)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## Variables de entorno

```
Tu servicio → Variables → Add Variable
```

Railway tiene **variables de referencia** para conectar servicios automáticamente:

```
# En tu servicio web, referencia la DB:
DATABASE_URL  →  ${{Postgres.DATABASE_URL}}
REDIS_URL     →  ${{Redis.REDIS_URL}}
```

Esto vincula automáticamente las variables del servicio de DB con tu app.

## Agregar base de datos

1. En tu proyecto → **New** → **Database**
2. Elegir: **PostgreSQL**, **MySQL**, **Redis** o **MongoDB**
3. Railway despliega la DB y la conecta al proyecto
4. La variable `DATABASE_URL` se inyecta automáticamente

```javascript
// Usar DATABASE_URL en Node.js con pg
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
})

const result = await pool.query('SELECT * FROM usuarios')
```

## Proyectos y workspaces

```
Workspace (tu cuenta o equipo)
└── Proyecto A
│   ├── Servicio: API Node.js
│   ├── Servicio: PostgreSQL
│   └── Servicio: Redis
└── Proyecto B
    ├── Servicio: Frontend
    └── Servicio: API Python
```

- Cada **proyecto** tiene su red privada (los servicios se comunican internamente)
- Los servicios del mismo proyecto usan URLs internas (más rápido y sin costo de bandwidth)

## Networking entre servicios

```javascript
// Dentro del mismo proyecto, usar hostname interno
// Railway provee: NOMBRE_SERVICIO.railway.internal
const DB_HOST = process.env.PGHOST  // automático con Railway
// o definir manualmente:
const API_URL = 'http://mi-api.railway.internal:3000'
```

## Cron Jobs en Railway

```
Nuevo servicio → Cron Job
```

```json
// Configurar en el servicio:
{
  "cronSchedule": "0 */6 * * *"  // cada 6 horas
}
```

## Dominios custom

```
Tu servicio → Settings → Networking → Custom Domain → Add Domain
```

Agregar en tu DNS:
```
CNAME  www  →  tu-servicio.railway.app
```

## ⚠️ Limitaciones importantes

- **$5 créditos/mes** no es "gratis puro" — es un crédito mensual gratuito
- Si superas los $5, el servicio se pausa hasta el siguiente mes
- Sin tarjeta de crédito: solo Starter plan (más restrictivo)
- **Monitorear uso:** Dashboard → Usage para ver cuánto estás consumiendo
