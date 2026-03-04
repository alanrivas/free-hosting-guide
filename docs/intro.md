---
slug: /intro
sidebar_position: 1
title: Introducción
---

# 🆓 Guía Completa de Servicios Gratuitos para Desarrollo

Esta guía cubre **todos los servicios gratuitos** disponibles para desarrollar y desplegar proyectos sin gastar dinero: APIs, frontends, bases de datos, almacenamiento y más.

> **Nota:** Los límites y planes cambian con el tiempo. Verifica siempre la documentación oficial de cada servicio antes de comenzar un proyecto importante.

---

## 📂 Categorías cubiertas

| Categoría | Servicios |
|---|---|
| 🖼️ **Frontend / Sitios Estáticos** | Vercel, Netlify, GitHub Pages, Cloudflare Pages |
| 🚀 **Backend / APIs** | Render, Railway, Fly.io, Koyeb |
| 🗄️ **Bases de Datos** | Supabase, Neon, Turso, MongoDB Atlas, Firebase, Upstash, CockroachDB |
| ⚡ **Serverless / Edge** | Cloudflare Workers, Deno Deploy |
| 🔧 **Full-Stack Todo-en-uno** | PocketBase, Appwrite |
| 📦 **Almacenamiento de Archivos** | Cloudflare R2, Supabase Storage, Backblaze B2 |

---

## 🗺️ Resumen: Cuándo usar cada servicio

| Si necesitas... | Usa... |
|---|---|
| Frontend React/Vue/Svelte | Vercel o Cloudflare Pages |
| Sitio estático simple | GitHub Pages |
| API Node.js/Python sencilla | Render (con UptimeRobot) o Koyeb |
| API con Docker | Fly.io o Render |
| API + DB integradas | Railway ($5 crédito mensual) |
| PostgreSQL sin pausas | Neon |
| PostgreSQL con Auth/Realtime | Supabase |
| NoSQL / Documentos | MongoDB Atlas o Firebase |
| Redis / Cache | Upstash |
| SQLite distribuido | Turso |
| Edge API ultra-rápida | Cloudflare Workers + D1 |
| Backend completo sin código | Supabase o Firebase |
| Full stack 100% gratis | Cloudflare (Workers + D1 + R2 + Pages) |

---

## ⚠️ Consideraciones generales

- **Spin-down (sleep):** Algunos servicios de backend (Render free tier) duermen el servidor tras 15 min de inactividad. Al recibir una petición, tardan ~30-60 seg en despertar.
- **Pausas de DB:** Supabase pausa proyectos inactivos después de 1 semana. Neon no tiene esta limitación.
- **Créditos en vez de gratis puro:** Railway da $5 USD/mes de créditos (suficiente para proyectos pequeños).
- **Restricciones de orgs:** En Vercel free solo 1 miembro por equipo. Para colaborar, cada quien despliega en su cuenta.
- **Dominios custom:** Todos los servicios listados permiten agregar dominio propio sin costo adicional.

---

## 💡 Stack recomendado para empezar

```
Frontend:  Cloudflare Pages   → bandwidth ilimitado, deploy desde git
Backend:   Cloudflare Workers → 100k req/día, sin cold start, sin spin-down
Database:  Neon PostgreSQL    → 512 MB, sin pausa automática
Cache:     Upstash Redis      → 10k comandos/día
Files:     Cloudflare R2      → 10 GB gratuitos
Auth:      Supabase Auth      → 50,000 usuarios activos/mes
```

**O el stack más simple si estás empezando:**
```
Frontend + Backend:  Vercel (Next.js con API Routes)
Base de datos:       Supabase (PostgreSQL + Auth + Realtime)
Cache:               Upstash Redis
```
