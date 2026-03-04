# Guía de Hosting Gratuito para Devs

Sitio Docusaurus desplegado en GitHub Pages con dominio personalizado via Cloudflare.

**Live:** https://free-hosting-guide.alanrivas.me

---

## Deploy automatizado con Claude Code

Este repo usa un sistema de automatización con Claude Code para hacer deploys con un solo comando. La idea es reutilizable en cualquier proyecto Docusaurus similar.

### Cómo funciona

```
/deploy-gh-pages   →  setup completo (primera vez)
/check-deployment  →  verificar estado en cualquier momento
git push           →  deploy automático + hook que reporta el estado
```

---

## Arquitectura del sistema

### 1. Agent: `static-site-deployer`
**Archivo:** `~/.claude/agents/static-site-deployer.md`

El "cerebro" del sistema. Agente especializado que conoce todos los pasos del deploy:
- Configurar `docusaurus.config.ts`
- Crear `static/CNAME`
- Crear el workflow de GitHub Actions
- Llamar a la GitHub Pages API via `gh`
- Verificar DNS y HTTPS

Se invoca automáticamente desde los skills, no directamente por el usuario.

---

### 2. Skill: `/deploy-gh-pages`
**Archivo:** `~/.claude/skills/deploy-gh-pages.md`

Setup completo de un proyecto nuevo. Pide `org`, `repo` y `domain`, luego ejecuta el pipeline entero de forma autónoma.

**Uso:**
```
/deploy-gh-pages org=alanrivas repo=mi-proyecto domain=mi-proyecto.alanrivas.me
```

---

### 3. Skill: `/check-deployment`
**Archivo:** `~/.claude/skills/check-deployment.md`

Verificación completa del estado de un deploy existente. Comprueba:
- GitHub Pages API (CNAME, HTTPS enforcement)
- Último workflow run (status + conclusion)
- DNS resolution (alias a `{org}.github.io`)
- Respuesta HTTPS en vivo (curl)

**Uso:**
```
/check-deployment
```

---

### 4. Hook: post-push
**Archivo:** `~/.claude/settings.json`

Después de cada `git push`, el hook espera 5 segundos y consulta automáticamente el estado del workflow. Claude te reporta en la conversación si el deploy fue exitoso o falló, sin que tengas que preguntar.

---

### 5. `CLAUDE.md` por proyecto
**Archivo:** `CLAUDE.md` (en la raíz del proyecto)

Le da contexto permanente a Claude sobre el proyecto: org, repo, dominio, stack. Así cualquier skill o agente sabe con qué proyecto está trabajando sin que tengas que repetírselo.

---

## Usar en un proyecto nuevo

### Paso 1 — Copiar los archivos de `deploy-templates/`

```
deploy-templates/
├── CLAUDE.md       →  copiar a la raíz del proyecto, editar los valores
├── deploy.yml      →  copiar a .github/workflows/deploy.yml
└── CNAME           →  copiar a static/CNAME, poner tu dominio
```

Los archivos globales (`~/.claude/agents/` y `~/.claude/skills/`) ya están instalados y se comparten entre todos los proyectos.

### Paso 2 — Editar `CLAUDE.md`

Cambiar estos valores por los del nuevo proyecto:

```markdown
| **GitHub org** | `TU-ORG-O-USUARIO` |    ← tu usuario de GitHub
| **Repo**       | `NOMBRE-DEL-REPO`  |    ← nombre exacto del repo
| **Custom domain** | `SUBDOMINIO.tudominio.com` |  ← tu dominio
```

### Paso 3 — Configurar el DNS en Cloudflare

Antes de correr el skill, añadir este registro en Cloudflare:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| `CNAME` | `SUBDOMINIO` | `TU-USUARIO.github.io` | **Off** (nube gris) |

> El proxy de Cloudflare debe estar **desactivado** para que GitHub Pages pueda emitir el certificado SSL. Una vez activo el SSL, se puede volver a activar si se desea.

### Paso 4 — Correr el skill

```
/deploy-gh-pages org=TU-ORG repo=NOMBRE-DEL-REPO domain=SUBDOMINIO.tudominio.com
```

El agente hace todo el resto de forma autónoma.

---

## Qué cambia de proyecto a proyecto

| Archivo | Qué editar |
|---|---|
| `CLAUDE.md` | org, repo, domain |
| `static/CNAME` | el dominio exacto |
| `docusaurus.config.ts` | `url`, `organizationName`, `projectName` |
| DNS en Cloudflare | nombre del subdominio y target |

El workflow `.github/workflows/deploy.yml` es **idéntico** en todos los proyectos, no necesita cambios.

---

## Desarrollo local

```bash
npm install
npm start       # servidor en http://localhost:3000
npm run build   # build de producción en build/
```
