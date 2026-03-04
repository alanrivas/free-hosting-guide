---
sidebar_position: 1
title: ¿Qué es CI/CD?
---

# ⚙️ Integración y Entrega Continua (CI/CD)

CI/CD es uno de los conceptos más importantes del desarrollo de software moderno. Entenderlo y aplicarlo — incluso en proyectos personales — marca la diferencia entre un developer junior y uno senior.

---

## ¿Qué significa CI/CD?

**CI** = **Continuous Integration** (Integración Continua)  
**CD** = **Continuous Delivery** o **Continuous Deployment** (Entrega/Despliegue Continuo)

Es un conjunto de prácticas que automatizan el proceso de **verificar, construir y desplegar** código cada vez que alguien hace un cambio en el repositorio.

---

## El problema que resuelve

Imagina un equipo (o tú solo) trabajando en un proyecto:

```
Sin CI/CD:
1. Escribes código por días o semanas
2. Intentas hacer merge con el código de otro → ¡conflictos masivos!
3. Haces el deploy a mano → algo falla en producción
4. No sabes qué cambio rompió qué cosa
5. Los tests "los corría localmente" → en producción fallan cosas distintas
```

```
Con CI/CD:
1. Escribes código
2. Haces push → automáticamente se corren los tests
3. Si los tests pasan, se hace el deploy automáticamente
4. Si algo falla, sabes exactamente qué commit lo rompió
5. El ambiente de CI es idéntico al de producción → no hay sorpresas
```

---

## Los tres pilares

### 🔵 Continuous Integration (CI)

Es la práctica de **integrar cambios de código frecuentemente** (varias veces al día) y verificar automáticamente que:

- El código **compila** correctamente
- Los **tests unitarios** pasan
- Los **tests de integración** pasan  
- El **linting** no reporta errores
- La **cobertura de código** no bajó

**Principio clave:** si el pipeline de CI falla, el equipo prioriza arreglarlo inmediatamente sobre cualquier otra tarea. Un pipeline roto bloquea a todos.

```
Developer A hace push
         │
         ▼
   GitHub detecta el push
         │
         ▼
   Se dispara el workflow de CI
         │
    ┌────┴────┐
    │         │
  Tests    Linting
    │         │
    └────┬────┘
         │
    ¿Todo OK?
   /           \
 Sí             No
  │               │
Verde ✅      Rojo ❌
  │               │
(continúa)   (notifica al dev,
              bloquea el merge)
```

### 🟢 Continuous Delivery (CD - Entrega)

Extiende CI: después de que los tests pasan, el código está **listo para ser desplegado** a producción en cualquier momento, pero un humano decide cuándo hacerlo.

```
CI pasa ✅ → Artefacto listo → [Humano presiona deploy] → Producción
```

**Ventaja:** siempre tienes una versión estable lista para salir. No hay código "medio hecho" esperando para liberarse.

### 🟡 Continuous Deployment (CD - Despliegue)

Va un paso más allá: si todos los tests pasan, el código **se despliega automáticamente** a producción sin intervención humana.

```
Push → CI pasa ✅ → Deploy automático a producción ✅
```

**¿Cuándo usarlo?**
- Apps web con buena cobertura de tests
- Equipos con alta confianza en su suite de pruebas
- No recomendado si no tienes tests o feature flags

---

## El Pipeline: el corazón del CI/CD

Un **pipeline** es la secuencia de pasos automatizados que se ejecutan. Se define como código (YAML) en el repositorio.

```
┌──────────────────────────────────────────────────────────────┐
│                         PIPELINE                              │
│                                                              │
│  Push  →  Build  →  Test  →  Lint  →  Preview Deploy  →  ✅  │
│                                              │                │
│                              (merge a main) →  Prod Deploy   │
└──────────────────────────────────────────────────────────────┘
```

### Etapas típicas de un pipeline

| Etapa | Qué hace | Tiempo típico |
|---|---|---|
| **Checkout** | Descarga el código del repo | ~5 seg |
| **Install** | Instala dependencias (`npm ci`) | ~30 seg - 2 min |
| **Lint** | Verifica estilo y errores de código | ~15 seg |
| **Type check** | Verifica tipos TypeScript | ~20 seg |
| **Test** | Corre tests unitarios e integración | ~30 seg - 5 min |
| **Build** | Compila/bundlea la app | ~1 - 3 min |
| **Deploy** | Sube a servidor / plataforma | ~30 seg - 2 min |

---

## Conceptos clave del CI/CD

### Environments (Ambientes)

La mayoría de proyectos tienen 3 ambientes:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│             │    │             │    │             │
│ Development │───▶│   Staging   │───▶│ Production  │
│  (local /   │    │  (preview)  │    │   (prod)    │
│   develop)  │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
  Dev trabaja        QA prueba         Usuarios reales
  aquí               aquí              están aquí
```

| Ambiente | URL | Se despliega cuando |
|---|---|---|
| Development | localhost:3000 | Durante el desarrollo local |
| Staging/Preview | preview.mi-app.com | En cada PR o push a `develop` |
| Production | mi-app.com | En merge a `main` |

### Secrets y variables de entorno en CI

Los secretos (API keys, contraseñas) **nunca** van en el código. En GitHub Actions se configuran como **Secrets del repositorio** y se acceden como variables de entorno:

```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret
```

```yaml
# En el workflow, acceder así:
- name: Deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    API_KEY: ${{ secrets.API_KEY }}
  run: npm run deploy
```

### Artifacts y caché

- **Artifacts:** archivos generados por el pipeline que se pueden descargar (reportes de tests, binarios, etc.)
- **Caché:** guardar carpetas como `node_modules` entre ejecuciones para hacer el pipeline más rápido

```yaml
# Caché de node_modules (ahorra 1-2 min por ejecución)
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

---

## CI/CD vs Deploy Manual: comparativa

| | Manual | CI/CD |
|---|---|---|
| **Consistencia** | ❌ Varía según el desarrollador | ✅ Siempre igual |
| **Velocidad** | Lento (humano) | ✅ Automático |
| **Errores humanos** | Alta probabilidad | ✅ Mínima |
| **Auditoría** | Difícil rastrear | ✅ Log completo de cada deploy |
| **Rollback** | Complicado | ✅ Un click o un git revert |
| **Tests en prod** | "En mi máquina funciona" | ✅ Ambiente controlado |
| **Colaboración** | Difícil | ✅ Cada PR tiene su preview |

---

## Herramientas de CI/CD y sus límites gratuitos

| Herramienta | Plan gratuito | Ideal para |
|---|---|---|
| **GitHub Actions** | 2,000 min/mes | Repos en GitHub (cualquier stack) |
| **GitLab CI/CD** | 400 min/mes | Repos en GitLab |
| **Vercel** | CI/CD automático incluido | Proyectos frontend/Next.js |
| **Netlify** | 300 min/mes | Proyectos frontend |
| **Cloudflare Pages** | 500 builds/mes | Frontend + Workers |
| **Railway** | Incluido con $5 crédito | Apps en Railway |

---

## El flujo ideal para un proyecto personal

```
1. Escribes código en una rama (feature/nueva-funcionalidad)
2. Haces push → GitHub Actions corre los tests automáticamente
3. Abres un Pull Request → se crea un preview deploy automático
4. Revisas el preview → todo OK
5. Haces merge a main → se hace el deploy a producción automáticamente
6. GitHub Actions notifica éxito o falla
```

En la siguiente sección veremos cómo implementar exactamente esto con **GitHub Actions**.
