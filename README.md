# Guía de Hosting Gratuito para Devs

Sitio Docusaurus desplegado en GitHub Pages con dominio personalizado via Cloudflare.

**Live:** https://free-hosting-guide.alanrivas.me

---

## Sistema de deploy automatizado con Claude Code

Este repo incluye un sistema reutilizable para hacer deploys a GitHub Pages con dominio personalizado en Cloudflare, usando Claude Code como orquestador.

Una vez instalado, el flujo completo se reduce a:

```
/deploy-gh-pages   →  setup completo en un proyecto nuevo (1 solo comando)
/check-deployment  →  verificar estado en cualquier momento
git push           →  deploy automático + reporte de estado en la conversación
```

---

## Estructura de archivos del sistema

```
~/.claude/                              ← carpeta global de Claude Code
├── agents/
│   └── static-site-deployer.md        ← agente especializado (cerebro del sistema)
├── skills/
│   ├── deploy-gh-pages/
│   │   └── SKILL.md                   ← comando /deploy-gh-pages
│   └── check-deployment/
│       └── SKILL.md                   ← comando /check-deployment
└── settings.json                      ← hook post-push

[tu-proyecto]/
├── CLAUDE.md                          ← contexto del proyecto para Claude
├── static/CNAME                       ← dominio personalizado
└── .github/workflows/deploy.yml       ← workflow de GitHub Actions
```

---

## Cómo instalar en una máquina nueva

Todos los archivos globales van en `~/.claude/`. En Windows: `C:\Users\TU-USUARIO\.claude\`.

### Paso 1 — Copiar el agente

Copiar [deploy-templates/agents/static-site-deployer.md](deploy-templates/agents/static-site-deployer.md) a:
```
~/.claude/agents/static-site-deployer.md
```

### Paso 2 — Copiar los skills

Copiar [deploy-templates/skills/deploy-gh-pages/SKILL.md](deploy-templates/skills/deploy-gh-pages/SKILL.md) a:
```
~/.claude/skills/deploy-gh-pages/SKILL.md
```

Copiar [deploy-templates/skills/check-deployment/SKILL.md](deploy-templates/skills/check-deployment/SKILL.md) a:
```
~/.claude/skills/check-deployment/SKILL.md
```

> **Importante:** Los skills deben estar en una **carpeta** con ese nombre y el archivo debe llamarse exactamente `SKILL.md`.

### Paso 3 — Agregar el hook en `~/.claude/settings.json`

Añadir esta sección al JSON existente:

```json
"hooks": {
  "PostToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bash -c 'CMD=$(echo \"$CLAUDE_TOOL_INPUT\" | python3 -c \"import sys,json; print(json.load(sys.stdin).get(\\\"command\\\",\\\"\\\"))\" 2>/dev/null); if echo \"$CMD\" | grep -qE \"git push\"; then REMOTE=$(git remote get-url origin 2>/dev/null); if echo \"$REMOTE\" | grep -q \"github.com\"; then REPO=$(echo \"$REMOTE\" | sed \"s|.*github.com/||\" | sed \"s|\\.git$||\"); sleep 5; RESULT=$(gh api repos/$REPO/actions/runs --jq \".workflow_runs[0] | \\\"[deploy-hook] Workflow: \\(.name) | \\(.status) / \\(.conclusion // \\\"running...\\\") | \\(.html_url)\\\"\" 2>/dev/null); echo \"${RESULT:-[deploy-hook] No se pudo obtener el estado del workflow}\"; fi; fi'"
        }
      ]
    }
  ]
}
```

---

## Cómo usar en un proyecto nuevo

Una vez instalados los archivos globales, para cada proyecto nuevo:

### Paso 1 — Agregar el DNS en Cloudflare (antes de todo)

En tu panel de Cloudflare, para tu dominio, añadir:

| Tipo | Nombre | Contenido | Proxy |
|---|---|---|---|
| `CNAME` | `nombre-del-proyecto` | `TU-USUARIO.github.io` | **Off** (nube gris) |

> El proxy **debe estar desactivado** para que GitHub Pages emita el certificado SSL.

### Paso 2 — Copiar `CLAUDE.md` al proyecto

Copiar [deploy-templates/CLAUDE.md](deploy-templates/CLAUDE.md) a la raíz del proyecto y editar estos valores:

```markdown
| **GitHub org**    | `TU-USUARIO`                    |
| **Repo**          | `NOMBRE-EXACTO-DEL-REPO`        |
| **Custom domain** | `subdominio.tudominio.com`       |
```

### Paso 3 — Correr el skill desde Claude Code

Abrir Claude Code en el proyecto y ejecutar:

```
/deploy-gh-pages
```

Claude detectará el contexto desde `CLAUDE.md` y ejecutará el pipeline completo de forma autónoma:
- Actualiza `docusaurus.config.ts`
- Crea `static/CNAME`
- Crea `.github/workflows/deploy.yml`
- Hace commit y push
- Configura GitHub Pages via API (CNAME + HTTPS)
- Verifica DNS y respuesta HTTPS

### Paso 4 — Verificar

```
/check-deployment
```

---

## Qué cambia de proyecto a proyecto

| Qué | Dónde |
|---|---|
| Nombre del proyecto, org, dominio | `CLAUDE.md` |
| Dominio personalizado | `static/CNAME` |
| `url`, `organizationName`, `projectName` | `docusaurus.config.ts` |
| Registro DNS | Cloudflare (manual) |

El workflow `.github/workflows/deploy.yml` es **idéntico** en todos los proyectos.

---

## Archivos de referencia en este repo

```
deploy-templates/
├── CLAUDE.md                          ← template del CLAUDE.md del proyecto
├── CNAME                              ← template del CNAME
├── deploy.yml                         ← workflow de GitHub Actions (copiar tal cual)
├── agents/
│   └── static-site-deployer.md        ← agente global (copiar a ~/.claude/agents/)
└── skills/
    ├── deploy-gh-pages/
    │   └── SKILL.md                   ← skill /deploy-gh-pages (copiar a ~/.claude/skills/)
    └── check-deployment/
        └── SKILL.md                   ← skill /check-deployment (copiar a ~/.claude/skills/)
```

---

## Desarrollo local

```bash
npm install
npm start       # servidor en http://localhost:3000
npm run build   # build de producción en build/
```
