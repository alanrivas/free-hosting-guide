---
sidebar_position: 7
---

# 📄 Proyecto 6: Sitio de Documentación con Deploy Automatizado

:::info
**Dificultad:** ⭐ Fácil | **Tiempo:** 30-60 min | **Servicios:** GitHub Pages, Cloudflare DNS, GitHub Actions
:::

Este proyecto es el ejemplo real que usa esta misma guía. Aprenderás a desplegar un sitio Docusaurus a GitHub Pages con dominio personalizado via Cloudflare, y a automatizar el proceso completo con Claude Code para poder repetirlo en segundos en cualquier proyecto futuro.

```
Arquitectura:

Código fuente (Docusaurus)
        ↓
git push a main
        ↓
GitHub Actions ──→ npm ci → npm run build
        ↓
GitHub Pages ──→ https://free-hosting-guide.alanrivas.me
        ↑
Cloudflare DNS
CNAME: free-hosting-guide → alanrivas.github.io
```

## Lo que vas a aprender

- Configurar **GitHub Pages** con GitHub Actions (no con la rama `gh-pages`)
- Apuntar un **subdominio de Cloudflare** a GitHub Pages
- Habilitar **HTTPS** con certificado automático de GitHub
- Crear **skills y agentes reutilizables en Claude Code** para automatizar deploys futuros

---

## Paso 1: Crear el proyecto Docusaurus

```bash
npx create-docusaurus@latest mi-guia classic --typescript
cd mi-guia
```

Instala las dependencias y verifica que funciona localmente:

```bash
npm install
npm start   # abre http://localhost:3000
```

Cuando todo funcione, inicializa el repositorio y súbelo a GitHub:

```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/TU-USUARIO/mi-guia.git
git push -u origin main
```

---

## Paso 2: Configurar `docusaurus.config.ts`

Edita estos campos en `docusaurus.config.ts`:

```typescript
const config: Config = {
  // URL final del sitio (con tu dominio personalizado)
  url: 'https://mi-guia.tudominio.com',
  baseUrl: '/',

  // Config de GitHub Pages
  organizationName: 'TU-USUARIO',   // tu usuario u org de GitHub
  projectName: 'mi-guia',           // nombre exacto del repo
  trailingSlash: false,

  // ... resto de la config
}
```

:::warning
`organizationName` y `projectName` deben coincidir exactamente con tu usuario y repo en GitHub, incluyendo mayúsculas/minúsculas.
:::

---

## Paso 3: Crear el archivo CNAME

Crea `static/CNAME` con el dominio personalizado (sin protocolo, sin barra final):

```
mi-guia.tudominio.com
```

Este archivo se copia tal cual al build final. GitHub Pages lo lee para saber qué dominio sirvir.

---

## Paso 4: Crear el workflow de GitHub Actions

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build website
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: build

  deploy:
    name: Deploy
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

:::info
Este workflow se activa en cada push a `main`. El build tarda ~1-2 minutos y el sitio queda disponible automáticamente.
:::

---

## Paso 5: Activar GitHub Pages en el repo

1. Ve a tu repositorio en GitHub
2. **Settings → Pages**
3. En **Source**, selecciona: `GitHub Actions`

Eso es todo. GitHub Pages usará el workflow para obtener el build en lugar de buscar una rama `gh-pages`.

---

## Paso 6: Configurar el DNS en Cloudflare

En el panel de Cloudflare, para tu dominio, añade este registro:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| `CNAME` | `mi-guia` | `TU-USUARIO.github.io` | **Off** (nube gris ☁️) |

:::warning Proxy desactivado
El proxy de Cloudflare **debe estar desactivado** (nube gris, no naranja) para que GitHub Pages pueda verificar el dominio y emitir el certificado SSL. Una vez que el SSL esté activo y el sitio funcione con HTTPS, puedes volver a activarlo si lo deseas.
:::

Espera 1-2 minutos para que el DNS propague. Puedes verificar con:

```bash
nslookup mi-guia.tudominio.com
# Debe responder: aliases: TU-USUARIO.github.io
```

---

## Paso 7: Hacer push y verificar

```bash
git add .
git commit -m "feat: configure GitHub Pages deployment with custom domain"
git push
```

En ~2 minutos el sitio estará disponible en `https://mi-guia.tudominio.com`.

Para verificar el estado del deploy, ve a tu repo en GitHub → **Actions** → el último workflow run.

---

## Automatización con Claude Code

Si usas Claude Code, este proceso completo se puede reducir a un solo comando reutilizable en cualquier proyecto. Esta guía incluye un sistema de automatización listo para usar.

### Cómo funciona

```
/deploy-gh-pages   →  ejecuta todos los pasos anteriores automáticamente
/check-deployment  →  verifica estado: DNS, HTTPS, workflow run, GitHub Pages API
git push           →  hook reporta en la conversación si el deploy fue exitoso
```

El sistema tiene tres componentes en `~/.claude/` (globales, disponibles en todos tus proyectos):

| Archivo | Qué hace |
|---|---|
| `agents/static-site-deployer.md` | Agente con todo el conocimiento del deploy |
| `skills/deploy-gh-pages/SKILL.md` | Skill `/deploy-gh-pages` — setup completo |
| `skills/check-deployment/SKILL.md` | Skill `/check-deployment` — verificación |

Y el hook en `settings.json` que consulta automáticamente el estado del workflow después de cada `git push`.

### Cómo instalar

Todos los archivos están listos en [`deploy-templates/`](https://github.com/alanrivas/free-hosting-guide/tree/main/deploy-templates). Copiarlos a su ubicación global:

```
deploy-templates/agents/static-site-deployer.md
  → ~/.claude/agents/static-site-deployer.md

deploy-templates/skills/deploy-gh-pages/SKILL.md
  → ~/.claude/skills/deploy-gh-pages/SKILL.md

deploy-templates/skills/check-deployment/SKILL.md
  → ~/.claude/skills/check-deployment/SKILL.md
```

Y mergear el bloque `"hooks"` de `deploy-templates/settings.json` en `~/.claude/settings.json`.

### Usar en un proyecto nuevo

Con los archivos globales ya instalados, para cada proyecto nuevo:

1. Añadir el registro CNAME en Cloudflare (nube gris)
2. Copiar `deploy-templates/CLAUDE.md` al proyecto y editar org/repo/domain
3. Abrir Claude Code en el proyecto y ejecutar `/deploy-gh-pages`

---

## ✅ Checklist de verificación

- [ ] `docusaurus.config.ts` tiene `url`, `organizationName`, `projectName` y `trailingSlash: false`
- [ ] `static/CNAME` existe con el dominio exacto (sin protocolo)
- [ ] `.github/workflows/deploy.yml` existe y el workflow corrió exitosamente
- [ ] GitHub Pages está configurado con **Source: GitHub Actions**
- [ ] DNS en Cloudflare apunta a `TU-USUARIO.github.io` con proxy Off
- [ ] `nslookup mi-guia.tudominio.com` resuelve a `TU-USUARIO.github.io`
- [ ] `https://mi-guia.tudominio.com` responde `200 OK`
- [ ] HTTPS está activo (candado verde en el navegador)
