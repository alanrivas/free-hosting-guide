---
sidebar_position: 3
title: GitHub Pages
---

# GitHub Pages

Hosting estático 100% gratuito integrado en GitHub. Ideal para portafolios, documentación y sitios simples.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Tipo | **Solo estático** (HTML/CSS/JS) |
| Despliegue | Git (solo GitHub) |
| Storage | 1 GB por repositorio |
| Bandwidth | 100 GB/mes |
| Builds con Actions | 2,000 min/mes (cuenta free) |
| Dominio | `usuario.github.io/repo` o custom |
| Sitios por usuario | 1 sitio de usuario + 1 por cada repo |
| SSR | ❌ No |
| Backend | ❌ No |
| Docker | ❌ No |

## Tipos de sitios en GitHub Pages

| Tipo | URL | Rama |
|---|---|---|
| Usuario | `https://usuario.github.io` | Repo llamado `usuario.github.io` |
| Organización | `https://org.github.io` | Repo llamado `org.github.io` |
| Proyecto | `https://usuario.github.io/repo` | Rama `gh-pages` o carpeta `/docs` |

## Método 1: Con `gh-pages` (React/Vite)

```bash
npm install gh-pages --save-dev
```

```json
// package.json
{
  "homepage": "https://tuusuario.github.io/tu-repo",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

> Para Create React App cambia `dist` por `build`

```bash
npm run deploy
```

Luego en GitHub:  
`Settings → Pages → Source → Deploy from branch → gh-pages`

## Método 2: GitHub Actions (recomendado)

Crea el archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run build

      - uses: actions/configure-pages@v4

      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist   # o ./build para CRA

      - id: deployment
        uses: actions/deploy-pages@v4
```

En GitHub: `Settings → Pages → Source → GitHub Actions`

## Configuración para SPA (React Router, Vue Router)

GitHub Pages no redirige rutas desconocidas al `index.html`. Solución:

Crea un archivo `404.html` que redirige al index:

```html
<!-- public/404.html -->
<!DOCTYPE html>
<html>
<head>
  <script>
    // Redirigir al index con la ruta como parámetro
    const path = window.location.pathname;
    window.location.replace(
      window.location.origin + '/?redirect=' + encodeURIComponent(path)
    );
  </script>
</head>
</html>
```

O usa el paquete `vite-plugin-single-spa-root` / configura el router con `basename`:

```tsx
// Para Vite + React Router, en vite.config.ts:
export default defineConfig({
  base: '/nombre-del-repo/',  // ← importante para GitHub Pages
})
```

## Dominio custom

1. Comprar dominio (o usar uno gratuito en Freenom)
2. En tu proveedor de DNS agregar:
```
CNAME  www   →  tuusuario.github.io
A      @     →  185.199.108.153
A      @     →  185.199.109.153
A      @     →  185.199.110.153
A      @     →  185.199.111.153
```
3. En GitHub: `Settings → Pages → Custom domain → tu-dominio.com`
4. Activar **Enforce HTTPS** ✅

## ⚠️ Limitaciones importantes

- **Solo archivos estáticos:** no puedes correr Node.js, Python, etc.
- **Sin variables de entorno en runtime:** las env vars se incluyen en el build
- **1 GB máximo:** no apto para proyectos con muchos assets
- **URLs con subdirectorio:** `/nombre-repo/` puede complicar el routing
