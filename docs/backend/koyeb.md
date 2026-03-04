---
sidebar_position: 4
title: Koyeb
---

# Koyeb

Plataforma serverless para desplegar APIs y aplicaciones sin gestionar infraestructura. El plan free ofrece una instancia siempre activa (sin spin-down).

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Tipo | Containers, Git, Docker |
| Instancia free | 1 × nano (0.1 vCPU, 256 MB RAM) |
| Bandwidth | 100 GB/mes |
| **Sin spin-down** | ✅ Siempre activo |
| Despliegue | Git (GitHub/GitLab) o Docker Hub |
| Regiones | Frankfurt (eu-west) o Washington (us-east) |
| Dominio | `.koyeb.app` + custom gratis |
| Apps | 1 app en plan free |

## Crear cuenta y primer despliegue

```
1. https://app.koyeb.com → Sign up con GitHub
2. Create App → elegir origen:
   - GitHub: conectar repo
   - Docker: imagen pública
3. Configurar:
   - Name: mi-api
   - Region: Frankfurt o Washington
   - Instance type: Free (nano)
   - Build command (si es git): npm install
   - Run command: node index.js
   - Port: 3000 (o el que use tu app)
4. Environment Variables → Add variable
5. Deploy
```

## Despliegue desde GitHub

1. Conectar cuenta GitHub en **Settings → Integrations**
2. **Create App → GitHub**
3. Seleccionar repositorio y rama
4. Koyeb usa **Buildpacks** (detecta Node, Python, Go automáticamente)

## Despliegue con Docker

```
Create App → Docker
→ Image: tu-usuario/mi-imagen:latest
→ Port: 3000
→ Environment variables...
```

O desde Docker Hub:
```
docker push tu-usuario/mi-api:latest
# Koyeb puede hacer re-deploy automático con webhooks
```

## Variables de entorno

```
Tu app → Settings → Environment Variables → Add variable
```

Koyeb soporta **Secrets** para valores sensibles:
```
Settings → Secrets → Create Secret
→ Referenciar en env vars como: {{ secret.MI_SECRET }}
```

## Healthcheck

Koyeb verifica que tu app esté activa. Asegúrate de tener una ruta `/health`:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' })
})
```

Configurar en Koyeb:
```
App → Settings → Health checks → Path: /health
```

## Dominio custom

```
App → Settings → Domains → Add custom domain
```

En tu DNS:
```
CNAME  www  →  tu-app.koyeb.app
```

## ⚠️ Limitaciones importantes

- **Solo 1 app en plan free** (pero puede tener múltiples servicios)
- **256 MB RAM:** suficiente para APIs simples con Node/Python
- **0.1 vCPU compartida:** puede ser lenta bajo cargas altas
- **Sin PostgreSQL incluido:** usar Neon o Supabase externamente
- Menos maduro que Render o Railway en ecosistema de herramientas
