---
sidebar_position: 3
title: Flujos Completos
---

# Flujos CI/CD Completos

Ejemplos end-to-end de pipelines reales para los stacks más comunes. Copia, adapta y úsalos en tus proyectos.

---

## Flujo 1: Next.js + Supabase → Vercel

El stack más común para proyectos web modernos.

```
Estructura del proyecto:
mi-app/
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── src/
├── tests/
├── package.json
└── .env.example
```

### Paso 1: Configurar secrets en GitHub

```
Repo → Settings → Secrets and variables → Actions

Agregar:
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID
- SUPABASE_URL          (para tests de integración)
- SUPABASE_ANON_KEY     (para tests de integración)
```

### Paso 2: Workflow de CI (en cada PR)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [develop]

jobs:
  quality:
    name: Calidad de código
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

      - name: Verificar tipos TypeScript
        run: npx tsc --noEmit

      - name: Tests unitarios
        run: npm run test:unit -- --coverage

      - name: Tests de integración
        run: npm run test:integration
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Build de verificación
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  preview-deploy:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: quality
    if: github.event_name == 'pull_request'

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm install -g vercel@latest

      - run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy a preview
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "preview_url=$url" >> $GITHUB_OUTPUT
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comentar URL en el PR
        uses: actions/github-script@v7
        with:
          script: |
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const botComment = comments.find(c =>
              c.user.type === 'Bot' && c.body.includes('Preview desplegado')
            );

            const body = `## 🚀 Preview desplegado\n\n**URL:** ${{ steps.deploy.outputs.preview_url }}\n\n**Commit:** \`${{ github.sha }}\``;

            if (botComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: botComment.id,
                body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body,
              });
            }
```

### Paso 3: Workflow de Deploy (merge a main)

```yaml
# .github/workflows/deploy.yml
name: Deploy a Producción

on:
  push:
    branches: [main]

jobs:
  deploy-production:
    name: Deploy → Vercel Producción
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm install -g vercel@latest

      - run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy a producción
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Resultado visual en GitHub

```
Pull Request #42: "feat: agregar perfil de usuario"

✅ CI / Calidad de código (1m 45s)
✅ CI / Deploy Preview (2m 10s)

🤖 GitHub Actions comentó:
   🚀 Preview desplegado
   URL: https://mi-app-git-feat-perfil.vercel.app
   Commit: a3f9b2c
```

---

## Flujo 2: API Node.js → Fly.io + Neon

Para APIs backend con Docker.

```yaml
# .github/workflows/api-pipeline.yml
name: API Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ─────────────────────────────────────────
  # JOB 1: Tests (en cada push y PR)
  # ─────────────────────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest

    # Base de datos temporal para los tests
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Correr migraciones en DB de test
        run: npx drizzle-kit migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

      - name: Tests
        run: npm test
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          JWT_SECRET: test-secret-para-ci
          NODE_ENV: test

  # ─────────────────────────────────────────
  # JOB 2: Build Docker (solo en main)
  # ─────────────────────────────────────────
  build:
    name: Build Docker
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    permissions:
      packages: write

    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─────────────────────────────────────────
  # JOB 3: Deploy a Fly.io (solo en main)
  # ─────────────────────────────────────────
  deploy:
    name: Deploy → Fly.io
    runs-on: ubuntu-latest
    needs: build

    steps:
      - uses: actions/checkout@v4

      - uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Migrar base de datos de producción
        run: fly ssh console -C "node dist/migrate.js" --app mi-api
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy
        run: flyctl deploy --remote-only --image ghcr.io/${{ github.repository }}:${{ github.sha }}
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

## Flujo 3: Monorepo (Frontend + Backend)

Cuando tienes el frontend y el backend en el mismo repositorio.

```
mi-monorepo/
├── apps/
│   ├── web/          ← Next.js
│   └── api/          ← Node.js/Express
├── packages/
│   └── shared/       ← tipos y utils compartidos
└── .github/workflows/
```

```yaml
# .github/workflows/monorepo-ci.yml
name: Monorepo CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  changes:
    name: Detectar cambios
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web:
              - 'apps/web/**'
              - 'packages/shared/**'
            api:
              - 'apps/api/**'
              - 'packages/shared/**'
            shared:
              - 'packages/shared/**'

  test-web:
    name: Test Frontend
    needs: changes
    if: needs.changes.outputs.web == 'true'    # ← Solo si hubo cambios en web
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build

  test-api:
    name: Test Backend
    needs: changes
    if: needs.changes.outputs.api == 'true'    # ← Solo si hubo cambios en api
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test

  deploy-web:
    name: Deploy Frontend
    needs: [test-web]
    if: github.ref == 'refs/heads/main' && needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploy web aquí..."

  deploy-api:
    name: Deploy Backend
    needs: [test-api]
    if: github.ref == 'refs/heads/main' && needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Deploy api aquí..."
```

---

## Protección de ramas: el complemento perfecto del CI

Configura que nadie (ni tú) pueda hacer push directo a `main` sin que el CI pase:

```
Repo → Settings → Branches → Add rule

Branch name pattern: main

✅ Require a pull request before merging
  ✅ Require approvals: 1 (o 0 si trabajas solo)

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Status checks:
    → Buscar y agregar: "CI / Calidad de código"
    → Buscar y agregar: "Tests"

✅ Include administrators  ← para que aplique a todos
```

Con esta configuración:
```
Nadie puede hacer merge si:
  ❌ Los tests fallan
  ❌ El linting falla
  ❌ El type check falla
  ❌ La rama está desactualizada respecto a main
```

---

## Diagrama del flujo completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO DE CI/CD                          │
│                                                                     │
│  1. Developer crea rama: git checkout -b feat/nueva-funcionalidad   │
│                                                                     │
│  2. Desarrolla y hace commits localmente                            │
│                                                                     │
│  3. git push origin feat/nueva-funcionalidad                        │
│         │                                                           │
│         ▼                                                           │
│  4. GitHub Actions: CI workflow                                     │
│         ├─ Lint ✅                                                  │
│         ├─ TypeScript ✅                                            │
│         ├─ Tests ✅                                                 │
│         └─ Build ✅                                                 │
│                                                                     │
│  5. Abre Pull Request → Preview deploy automático                   │
│     URL: https://mi-app-git-feat-nueva.vercel.app                   │
│                                                                     │
│  6. Review + aprobación (si trabajan en equipo)                     │
│                                                                     │
│  7. Merge a main                                                    │
│         │                                                           │
│         ▼                                                           │
│  8. GitHub Actions: Deploy workflow                                 │
│         ├─ Build producción ✅                                      │
│         ├─ Migraciones DB ✅                                        │
│         └─ Deploy a prod ✅                                         │
│                                                                     │
│  9. ✅ Código en producción en ~3 minutos                           │
└─────────────────────────────────────────────────────────────────────┘
```
