---
sidebar_position: 3
title: Fly.io
---

# Fly.io

Plataforma para correr contenedores Docker distribuidos globalmente. Ofrece **3 VMs siempre activas** en el plan gratuito, ideal para APIs que no pueden permitirse spin-down.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Tipo | Containers (Docker) |
| VMs gratuitas | 3 × `shared-cpu-1x` (256 MB RAM c/u) |
| Storage | 3 GB de volumes persistentes |
| Ancho de banda | 160 GB salida/mes |
| PostgreSQL | 3 GB (free tier) |
| **Sin spin-down** | ✅ (con tráfico mínimo) |
| Regiones | Múltiples (despliegue global) |
| Dominio | `.fly.dev` + custom gratis |

## Instalación de flyctl

```bash
# Windows (PowerShell):
iwr https://fly.io/install.ps1 -useb | iex

# Mac:
brew install flyctl

# Linux:
curl -L https://fly.io/install.sh | sh

# Verificar instalación:
fly version

# Login:
fly auth login
```

## Primer despliegue

```bash
cd tu-proyecto

# Genera fly.toml automáticamente (detecta el runtime)
fly launch

# Durante el wizard:
# - App name: mi-api-nombre (o aceptar el generado)
# - Region: elegir la más cercana (mad = Madrid, iad = US East)
# - ¿Crear PostgreSQL? → sí/no según necesidad
# - ¿Desplegar ahora? → sí

# Desplegar cambios posteriores:
fly deploy

# Ver estado:
fly status

# Ver logs:
fly logs
```

## `fly.toml` (archivo de configuración)

```toml
app = "mi-api"
primary_region = "mad"   # Madrid

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false    # ← desactivar para no dormir
  auto_start_machines = true
  min_machines_running = 1      # ← mínimo 1 VM activa

  [http_service.concurrency]
    type = "requests"
    soft_limit = 200
    hard_limit = 250

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

## Dockerfile de ejemplo

```dockerfile
# Node.js API
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

```dockerfile
# Python/FastAPI
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Secretos y variables de entorno

```bash
# Establecer secretos (encriptados, para datos sensibles)
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set API_KEY="mi-clave-secreta"
fly secrets set JWT_SECRET="mi-jwt-secret"

# Listar secretos (solo nombres, no valores)
fly secrets list

# Variables no sensibles van en fly.toml:
[env]
  NODE_ENV = "production"
  PORT = "3000"
  LOG_LEVEL = "info"
```

## Volumes (almacenamiento persistente)

```bash
# Crear un volume de 1 GB (gratis hasta 3 GB total)
fly volumes create mi_data --size 1 --region mad

# Montar en fly.toml:
[[mounts]]
  source = "mi_data"
  destination = "/data"
```

## Base de datos PostgreSQL en Fly.io

```bash
# Crear cluster PostgreSQL
fly postgres create --name mi-db --region mad

# Conectar al app
fly postgres attach mi-db --app mi-api

# Esto inyecta DATABASE_URL automáticamente

# Conectar a la consola de PostgreSQL
fly postgres connect -a mi-db

# Tunnel para acceso local
fly proxy 5432 -a mi-db
# Luego conectar con: postgresql://localhost:5432/...
```

## Escalar y gestionar VMs

```bash
# Ver VMs actuales
fly scale show

# Escalar a 0 (detener, ahorrar recursos)
fly scale count 0

# Volver a activar
fly scale count 1

# Cambiar memoria (puede requerir plan pagado)
fly scale memory 512

# Ver regiones disponibles
fly platform regions
```

## Múltiples apps (proyectos)

```bash
# Cada "app" en Fly.io es independiente
fly apps list

# Crear nueva app sin desplegar
fly apps create mi-segunda-api

# Desplegar en una app específica
fly deploy --app mi-segunda-api

# Cambiar de app en el contexto actual
fly apps open mi-segunda-api
```

## Monitoreo y debugging

```bash
# Logs en tiempo real
fly logs --app mi-api

# SSH al contenedor
fly ssh console

# Estado detallado
fly status --all

# Métricas
fly dashboard  # abre el dashboard web
```

## Dominio custom

```bash
# Agregar dominio
fly certs create mi-dominio.com

# Ver estado del certificado SSL
fly certs show mi-dominio.com
```

En tu DNS:
```
A      @    →  IP que muestra: fly ips list
AAAA   @    →  IPv6 que muestra: fly ips list
```

## ⚠️ Limitaciones importantes

- **256 MB RAM por VM:** puede ser insuficiente para apps con mucho estado en memoria
- **3 VMs gratis:** distribuidas entre todas tus apps
- **Requiere Dockerfile:** no hay detección automática de runtime (a diferencia de Railway/Render)
- **Facturación:** si pasas del free tier, se cobra. Configurar alertas de gasto
