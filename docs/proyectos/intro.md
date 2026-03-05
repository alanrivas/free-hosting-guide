---
sidebar_position: 1
---

# 🏗️ Proyectos Guiados de Práctica

Esta sección contiene proyectos completos de principio a fin, usando exclusivamente servicios gratuitos. Cada proyecto está diseñado para enseñar habilidades reales de desarrollo combinando múltiples servicios.

## ¿Cómo están organizados los proyectos?

Cada proyecto incluye:

- **Tiempo estimado** para completarlo desde cero
- **Nivel de dificultad** con estrellas (⭐ a ⭐⭐⭐⭐)
- **Servicios utilizados** (todos gratuitos)
- **Guía paso a paso** con código completo

| Proyecto | Dificultad | Tiempo estimado | Servicios usados | Habilidades principales |
|---|---|---|---|---|
| 💬 Chat en Tiempo Real | ⭐⭐ Media | 3-4 horas | Next.js, Supabase, Vercel | Realtime, WebSockets, Auth |
| 🔐 API REST con Auth | ⭐⭐ Media | 2-3 horas | Node.js/Hono, Neon, Render | JWT, REST, PostgreSQL |
| 🤖 App con IA | ⭐⭐⭐ Alta | 4-5 horas | Next.js, Groq, Neon, Vercel | LLM, streaming, embeddings |
| ⚙️ Pipeline CI/CD | ⭐⭐ Media | 2-3 horas | GitHub Actions, Vercel, Vitest | Testing, automation, deploy |
| 💳 SaaS Básico | ⭐⭐⭐⭐ Avanzado | 6-8 horas | Next.js, Supabase, Stripe | Auth, payments, subscriptions |
| 📄 Sitio de Docs con Deploy Automatizado | ⭐ Fácil | 30-60 min | GitHub Pages, Cloudflare, Claude Code | Deploy estático, DNS, automatización |

## Requisitos previos

Antes de empezar, asegúrate de tener:

- **Node.js 20+** instalado en tu máquina
- **Git** instalado y configurado
- Una **cuenta de GitHub** (gratuita)
- Cuentas creadas en los servicios que usa cada proyecto (Supabase, Neon, Render, Vercel, etc.)
- Conocimiento básico de **TypeScript** y React

## Estructura de cada proyecto

Todos los proyectos siguen el mismo patrón:

1. **1 repositorio público en GitHub** — el código fuente completo
2. **Deploy automático** — cada push a `main` despliega a producción
3. **Variables de entorno documentadas** — sabrás exactamente qué configurar
4. **README con instrucciones** — para que cualquiera pueda reproducirlo

## Progresión de aprendizaje

Los conceptos se van encadenando entre proyectos:

```
Proyecto 1 (Chat)
  → introduce Supabase Auth y Realtime
    → Proyecto 2 (API) agrega JWT y PostgreSQL propio
      → Proyecto 3 (IA) suma embeddings y RAG sobre una base de datos
        → Proyecto 4 (CI/CD) automatiza testing y deploy de cualquier proyecto
          → Proyecto 5 (SaaS) combina todo con pagos reales
          → Proyecto 6 (Docs) deploy estático con automatización reutilizable
```

:::tip
Haz los proyectos en orden: cada uno introduce conceptos que se usan en los siguientes.
:::
