---
sidebar_position: 5
---

# ⚙️ Proyecto 4: Pipeline CI/CD Completo

:::info
**Dificultad:** ⭐⭐ Media | **Tiempo:** 2-3 horas | **Servicios:** GitHub Actions, Vercel, Vitest
:::

## Qué vas a construir

Un pipeline de integración y entrega continua (CI/CD) completo para cualquier proyecto Next.js que:

- ✅ Ejecuta tests automáticamente en cada Pull Request
- ✅ Verifica tipos TypeScript y linting
- ✅ Crea un deploy de preview por cada PR con URL única
- ✅ Despliega a producción automáticamente al mergear a `main`
- ✅ Comenta la URL de preview directamente en el PR

```
Arquitectura:

Developer pushes code
        ↓
GitHub (PR / merge to main)
        ↓
GitHub Actions ──→ Tests (Node 20 + 22)
                ──→ TypeScript check
                ──→ ESLint
                ──→ Build
        ↓
Vercel CLI ──→ Preview URL (en PR)
           ──→ Producción (en merge a main)
```

## Lo que vas a aprender

- **GitHub Actions** — workflows, jobs, steps, y matrix strategy
- **Testing en CI** — correr Vitest en entorno headless
- **Secrets management** — variables seguras en GitHub
- **Vercel CLI** — deploy programático desde la terminal
- **Preview deployments** — una URL única por cada PR
- **Branch protection rules** — evitar merges sin tests en verde

## Paso 1: Preparar el proyecto con tests

Sobre un proyecto Next.js existente, instala las dependencias de testing:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Crea `vitest.config.ts` en la raíz del proyecto:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
```

Crea `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

## Paso 2: Escribir tests

Crea `__tests__/components/Button.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Componente simple de ejemplo
function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick}>{children}</button>
}

describe('Button', () => {
  it('renderiza el texto del botón', () => {
    render(<Button onClick={() => {}}>Guardar</Button>)
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('llama a onClick al hacer clic', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Guardar</Button>)
    fireEvent.click(screen.getByText('Guardar'))
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

Crea `__tests__/lib/utils.test.ts` para funciones utilitarias:

```typescript
import { describe, it, expect } from 'vitest'

// Función utilitaria de ejemplo
function formatearPrecio(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`
}

describe('formatearPrecio', () => {
  it('formatea 1000 centavos como $10.00', () => {
    expect(formatearPrecio(1000)).toBe('$10.00')
  })

  it('formatea 0 como $0.00', () => {
    expect(formatearPrecio(0)).toBe('$0.00')
  })

  it('formatea cantidades con decimales', () => {
    expect(formatearPrecio(999)).toBe('$9.99')
  })
})
```

## Paso 3: Scripts de package.json

Agrega estos scripts en `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Verifica que los tests corren localmente antes de configurar CI:

```bash
npm test
# ✓ __tests__/components/Button.test.tsx (2 tests)
# ✓ __tests__/lib/utils.test.ts (3 tests)
# Test Files  2 passed (2)
# Tests  5 passed (5)
```

## Paso 4: Workflow de CI

Crea `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Tests y Calidad de Código
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Configurar Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Instalar dependencias
        run: npm ci

      - name: Verificar tipos TypeScript
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

:::info
La **matrix strategy** corre el job en paralelo para Node.js 20 y 22 simultáneamente. Si alguna versión falla, el check aparece en rojo. Esto garantiza compatibilidad con múltiples versiones.
:::

## Paso 5: Workflow de deploy

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    name: Deploy a Vercel
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm install --global vercel@latest

      - name: Pull configuración de Vercel
        run: vercel pull --yes --environment=${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }} --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build
        run: vercel build ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy
        id: deploy
        run: |
          URL=$(vercel deploy --prebuilt ${{ github.ref == 'refs/heads/main' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$URL" >> $GITHUB_OUTPUT
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

      - name: Comentar URL en PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ **Preview desplegado:** ${{ steps.deploy.outputs.url }}`
            })
```

## Paso 6: Configurar secrets en GitHub

Ve a tu repositorio en GitHub → **Settings → Secrets and variables → Actions → New repository secret**.

### Obtener los secrets de Vercel

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login y vincular el proyecto
vercel login
vercel link  # Esto crea .vercel/project.json

# 3. Ver el archivo generado
cat .vercel/project.json
# {"orgId":"team_xxx","projectId":"prj_xxx"}
```

### Secrets necesarios

| Secret | Cómo obtenerlo |
|---|---|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | `.vercel/project.json` → campo `orgId` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` → campo `projectId` |
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard de Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard de Supabase → Settings → API |

:::warning
El archivo `.vercel/project.json` **no es secreto**, pero los tokens sí. Nunca subas tu `VERCEL_TOKEN` al repositorio. Agrégalo siempre como secret de GitHub.
:::

## Paso 7: Protección de ramas (Branch Protection)

Evita que alguien (incluido tú mismo) haga push directo a `main` sin pasar los tests:

1. Ve a tu repositorio → **Settings → Branches**
2. Click en **Add branch protection rule**
3. Branch name pattern: `main`
4. Activa las siguientes opciones:

| Opción | Por qué |
|---|---|
| ✅ Require a pull request before merging | Obliga a abrir un PR |
| ✅ Require status checks to pass | CI debe estar en verde |
| ✅ Require branches to be up to date | El PR debe estar actualizado con main |
| ✅ Do not allow bypassing the above settings | Aplica a admins también |

5. En **Status checks that are required**, busca y agrega:
   - `Tests y Calidad de Código (20)`
   - `Tests y Calidad de Código (22)`

:::tip
Una vez activa la branch protection, el único camino para cambios en `main` es: abrir PR → pasar CI → aprobar → merge. Esto te protege de errores en madrugada.
:::

## ✅ Checklist de verificación

- [ ] Tests corren localmente con `npm test` sin errores
- [ ] CI workflow se activa automáticamente al abrir un PR
- [ ] El build falla si hay errores de TypeScript
- [ ] El build falla si hay errores de ESLint
- [ ] Deploy preview se crea para cada PR con URL única
- [ ] La URL de preview aparece como comentario en el PR
- [ ] Deploy a producción ocurre solo al mergear a `main`
- [ ] Branch protection impide push directo a `main`
- [ ] Tests corren en paralelo en Node.js 20 y 22
