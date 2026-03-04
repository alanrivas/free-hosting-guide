---
sidebar_position: 2
title: GitHub Actions
---

# GitHub Actions

La herramienta de CI/CD integrada en GitHub. Es **gratuita para repositorios públicos** (ilimitado) y ofrece **2,000 minutos/mes** para repositorios privados.

---

## ¿Cómo funciona?

GitHub Actions funciona con **workflows**: archivos YAML que defines en tu repositorio en la carpeta `.github/workflows/`. Cada workflow describe **cuándo** ejecutarse y **qué pasos** correr.

```
Tu repositorio
└── .github/
    └── workflows/
        ├── ci.yml          ← se ejecuta en cada push/PR
        ├── deploy.yml      ← se ejecuta al hacer merge a main
        └── cron.yml        ← se ejecuta según un schedule
```

---

## Anatomía de un workflow

```yaml
# .github/workflows/ci.yml

name: CI                          # Nombre visible en GitHub

on:                               # ← TRIGGERS: cuándo se ejecuta
  push:
    branches: [main, develop]     # En push a estas ramas
  pull_request:
    branches: [main]              # En PRs hacia main

env:                              # Variables de entorno globales
  NODE_VERSION: '20'

jobs:                             # ← JOBS: grupos de pasos
  test:                           # Nombre del job
    name: Tests y Linting         # Nombre visible
    runs-on: ubuntu-latest        # Sistema operativo del runner

    steps:                        # ← STEPS: pasos individuales

      - name: Checkout código
        uses: actions/checkout@v4  # Acción predefinida de GitHub

      - name: Instalar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm               # Caché automático de npm

      - name: Instalar dependencias
        run: npm ci                # Comando shell

      - name: Linting
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Tests
        run: npm test -- --coverage

      - name: Build
        run: npm run build
```

---

## Conceptos fundamentales

### Triggers (eventos `on:`)

```yaml
on:
  # Push a ramas específicas
  push:
    branches: [main, develop, 'release/**']
    paths:                          # Solo si cambian estos archivos
      - 'src/**'
      - 'package.json'

  # Pull Requests
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]

  # Schedule (cron)
  schedule:
    - cron: '0 8 * * 1-5'         # Lunes a viernes a las 8am UTC

  # Manual (botón en GitHub UI)
  workflow_dispatch:
    inputs:
      environment:
        description: 'Ambiente destino'
        required: true
        default: 'staging'
        type: choice
        options: [staging, production]

  # Cuando otro workflow termina
  workflow_run:
    workflows: [CI]
    types: [completed]
```

### Jobs en paralelo y en secuencia

```yaml
jobs:
  lint:                            # Job 1: linting
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run lint

  test:                            # Job 2: tests (en paralelo con lint)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

  build:                           # Job 3: build (espera a lint y test)
    runs-on: ubuntu-latest
    needs: [lint, test]            # ← DEPENDENCIA: espera a que terminen
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build

  deploy:                          # Job 4: deploy (solo si build pasó)
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'   # Solo en rama main
    steps:
      - run: echo "Desplegando..."
```

### Matrix: correr en múltiples configuraciones

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]        # Probar en 3 versiones de Node
        # os: [ubuntu-latest, windows-latest]  # O en múltiples OS

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci && npm test
```

---

## Workflows por caso de uso

### 🔵 CI básico: tests y linting en cada PR

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main, develop]

jobs:
  ci:
    name: Test & Lint
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Instalar dependencias
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Tests unitarios
        run: npm test -- --coverage --watchAll=false

      - name: Subir reporte de cobertura
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
```

---

### 🟢 Deploy automático a Vercel

```yaml
# .github/workflows/deploy-vercel.yml
name: Deploy a Vercel

on:
  push:
    branches: [main]    # Producción
  pull_request:         # Preview por PR

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm install -g vercel@latest

      - name: Pull configuración de Vercel
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      # Deploy a preview (en PRs)
      - name: Deploy Preview
        if: github.event_name == 'pull_request'
        id: preview
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> $GITHUB_OUTPUT

      # Comentar la URL en el PR
      - name: Comentar URL en PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Preview desplegado: ${{ steps.preview.outputs.url }}`
            })

      # Deploy a producción (en push a main)
      - name: Deploy Producción
        if: github.ref == 'refs/heads/main'
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**Configurar los secrets necesarios:**
```
Settings → Secrets → Actions → New secret:
- VERCEL_TOKEN        → vercel.com → Settings → Tokens
- VERCEL_ORG_ID       → vercel.com → Settings → General → Team ID
- VERCEL_PROJECT_ID   → .vercel/project.json (después de `vercel link`)
```

---

### 🚀 Deploy a Fly.io

```yaml
# .github/workflows/deploy-fly.yml
name: Deploy a Fly.io

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci && npm test

  deploy:
    needs: test           # Solo despliega si los tests pasan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

```
Obtener FLY_API_TOKEN:
flyctl auth token
→ Copiar y agregar como secret en GitHub
```

---

### 🗃️ Migraciones de base de datos automáticas

```yaml
# .github/workflows/migrate.yml
name: Migraciones DB

on:
  push:
    branches: [main]
    paths:
      - 'drizzle/**'        # Solo cuando hay nuevas migraciones
      - 'prisma/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    environment: production    # Requiere aprobación manual (opcional)
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      # Con Drizzle
      - name: Correr migraciones (Drizzle)
        run: npx drizzle-kit migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      # Con Prisma
      # - name: Correr migraciones (Prisma)
      #   run: npx prisma migrate deploy
      #   env:
      #     DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

### 🐳 Build y push de imagen Docker

```yaml
# .github/workflows/docker.yml
name: Build Docker Image

on:
  push:
    branches: [main]
    tags: ['v*.*.*']          # También en tags de versión

env:
  REGISTRY: ghcr.io           # GitHub Container Registry (gratis para repos públicos)
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Login a GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}  # Automático, no necesitas configurarlo

      - name: Extraer metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=sha-

      - name: Build y push imagen
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha      # Caché de GitHub Actions
          cache-to: type=gha,mode=max
```

---

### ⏰ Tarea programada (cron job)

```yaml
# .github/workflows/cron.yml
name: Tareas Programadas

on:
  schedule:
    - cron: '0 3 * * *'         # Todos los días a las 3am UTC
  workflow_dispatch:             # También ejecutable manualmente

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci

      - name: Limpiar datos viejos
        run: node scripts/cleanup.js
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Ping a Supabase para evitar pausa
        run: |
          curl -X GET "${{ secrets.SUPABASE_URL }}/rest/v1/health" \
            -H "apikey: ${{ secrets.SUPABASE_ANON_KEY }}"
```

---

## Reutilización: Actions del Marketplace

GitHub tiene miles de **Actions predefinidas** gratuitas:

```yaml
# Notificar en Slack si el deploy falla
- name: Notificar Slack
  if: failure()
  uses: slackapi/slack-github-action@v1.27.0
  with:
    channel-id: 'deploys'
    slack-message: "❌ Deploy fallido en ${{ github.repository }}"
  env:
    SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}

# Code coverage badge
- name: Coverage Badge
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/lcov.info

# Comentar cambios de bundle size en PRs
- name: Bundle Size
  uses: preactjs/compressed-size-action@v2
  with:
    repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

---

## Contextos y expresiones

```yaml
# Información disponible automáticamente:
${{ github.actor }}           # Usuario que hizo el push
${{ github.repository }}      # owner/repo
${{ github.ref }}             # refs/heads/main
${{ github.sha }}             # Hash del commit
${{ github.event_name }}      # 'push', 'pull_request', etc.
${{ runner.os }}              # 'Linux', 'Windows', 'macOS'

# Condicionales:
if: github.ref == 'refs/heads/main'
if: github.event_name == 'pull_request'
if: failure()                 # Solo si el paso anterior falló
if: success()                 # Solo si todo fue bien
if: always()                  # Siempre (incluso si falló)
if: contains(github.ref, 'release')

# Expresiones:
${{ env.MI_VARIABLE }}
${{ secrets.MI_SECRET }}
${{ steps.mi-step.outputs.mi-output }}
${{ needs.mi-job.outputs.mi-output }}
```

---

## Optimización: hacer el pipeline más rápido

```yaml
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # 1. Caché de dependencias (ahorra 1-2 min)
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm            # Maneja el caché automáticamente

      # 2. npm ci en lugar de npm install (más rápido y reproducible)
      - run: npm ci

      # 3. Correr lint, typecheck y tests en paralelo
      - name: Lint + TypeCheck + Tests en paralelo
        run: |
          npm run lint &
          npx tsc --noEmit &
          npm test -- --watchAll=false &
          wait    # Esperar a que todos terminen

      # 4. Solo hacer build si los anteriores pasaron
      - run: npm run build
```

---

## Ver resultados en GitHub

```
Repositorio → Actions → (lista de workflows)
→ Clic en un workflow → ver jobs → ver steps → ver logs
```

**Badges de status (poner en README.md):**
```markdown
![CI](https://github.com/usuario/repo/actions/workflows/ci.yml/badge.svg)
![Deploy](https://github.com/usuario/repo/actions/workflows/deploy.yml/badge.svg?branch=main)
```

---

## ⚠️ Errores comunes al empezar

| Error | Causa | Solución |
|---|---|---|
| `Process completed with exit code 1` | Un comando falló | Ver el log del step específico |
| `Secret not found` | Secret no configurado | Settings → Secrets → Actions |
| `Permission denied` | Falta permiso en el token | Agregar `permissions:` al job |
| `npm ci` falla | `package-lock.json` desactualizado | Correr `npm install` local y hacer commit del lock |
| El workflow no se dispara | Ruta del archivo incorrecta | Debe estar en `.github/workflows/` |
| Cargos de minutos | Repo privado con mucho CI | Usar `paths:` para limitar cuándo corre |
