# [NOMBRE-DEL-PROYECTO]

Docusaurus static site desplegado en GitHub Pages con dominio personalizado via Cloudflare.

## Deployment config

| Campo | Valor |
|---|---|
| **GitHub org** | `TU-ORG-O-USUARIO` |
| **Repo** | `NOMBRE-DEL-REPO` |
| **Custom domain** | `SUBDOMINIO.tudominio.com` |
| **Deploy branch** | `main` |
| **Build command** | `npm run build` |
| **Output dir** | `build/` |

## Deploy commands disponibles

- `/deploy-gh-pages` — Setup completo (primera vez en un proyecto nuevo)
- `/check-deployment` — Verificar estado del deploy en cualquier momento

## Stack

- Docusaurus 3.x + TypeScript
- Node 22, npm
- GitHub Actions para CI/CD
- GitHub Pages como hosting
- Cloudflare para DNS del subdominio

## Notas

- El archivo `static/CNAME` contiene el dominio personalizado
- El workflow en `.github/workflows/deploy.yml` se dispara en cada push a `main`
- Cloudflare proxy debe estar en OFF (nube gris) para que GitHub Pages emita el SSL
