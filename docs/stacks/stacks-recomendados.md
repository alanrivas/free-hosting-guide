---
sidebar_position: 1
title: Stacks Recomendados
---

# 💡 Stacks Recomendados

Combinaciones de servicios gratuitos probadas y organizadas por caso de uso.

---

## 🏆 Stack Cloudflare (100% gratis, sin límites prácticos)

El stack más potente del plan free. Cloudflare tiene los mejores límites gratuitos del mercado.

```
Frontend:   Cloudflare Pages    → bandwidth ilimitado, deploy desde git
Backend:    Cloudflare Workers  → 100k req/día, sin cold start
Database:   Cloudflare D1       → SQLite, 5 GB, 5M row reads/día
Cache/KV:   Cloudflare KV       → 1 GB, 1M writes/día
Storage:    Cloudflare R2       → 10 GB, sin costo de egress
```

**Cuándo usarlo:**
- Apps con mucho tráfico de lectura
- APIs simples o moderadas
- Sites con mucho static content
- Proyectos que no quieren preocuparse por límites de bandwidth

**Limitaciones:**
- Solo JavaScript/TypeScript en Workers (no Python, Go, etc.)
- D1 es SQLite (no PostgreSQL completo)
- 10ms CPU por request en Workers

---

## ⚡ Stack Vercel + Supabase (el más popular)

El combo más usado para proyectos Next.js. Setup rápido, todo integrado.

```
Frontend + API:  Vercel (Next.js con API Routes)
Database:        Supabase PostgreSQL
Auth:            Supabase Auth
Realtime:        Supabase Realtime
Storage:         Supabase Storage
Cache:           Upstash Redis
```

**Setup rápido:**
```bash
npx create-next-app@latest mi-app --typescript --tailwind
cd mi-app
npm install @supabase/supabase-js @upstash/redis
```

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...
```

**Cuándo usarlo:**
- Apps Next.js con PostgreSQL
- Proyectos con autenticación y realtime
- Startups y proyectos MVP rápidos

**Limitaciones:**
- Supabase pausa el proyecto tras 1 semana de inactividad
- Vercel limita a 1 miembro en teams free

---

## 🐍 Stack para Python (FastAPI / Django)

```
Backend:   Render (Web Service, Python)
Database:  Neon PostgreSQL
Cache:     Upstash Redis
Storage:   Cloudflare R2
```

**Setup:**
```bash
# requirements.txt
fastapi
uvicorn[standard]
psycopg2-binary
redis
boto3  # para R2 (S3-compatible)
```

```python
# main.py
from fastapi import FastAPI
import psycopg2
import os

app = FastAPI()

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

@app.get("/api/usuarios")
def get_usuarios():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM usuarios")
    return cur.fetchall()
```

```
# render.yaml
services:
  - type: web
    name: mi-api-python
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    plan: free
```

**Cuándo usarlo:**
- APIs en Python (FastAPI, Flask, Django)
- Proyectos de data science con API

---

## 📱 Stack para Apps Móviles (React Native / Flutter)

```
Backend:   Supabase (o Firebase)
Database:  Supabase PostgreSQL (o Firestore)
Auth:      Supabase Auth (o Firebase Auth)
Storage:   Supabase Storage
Realtime:  Supabase Realtime
Push:      Firebase Cloud Messaging (gratis)
```

**¿Por qué Supabase para móvil?**
- SDK oficial para React Native, Flutter, Swift, Kotlin
- Auth con OAuth (Google, Apple, GitHub) incluido
- Realtime para chats, notificaciones en vivo
- Storage para fotos de perfil y contenido de usuario

```bash
# React Native
npm install @supabase/supabase-js
```

---

## 🎮 Stack para Tiempo Real (Chat, Juegos, Colaboración)

```
Backend:   Railway (Node.js + Socket.io)
Database:  Neon PostgreSQL (persistencia)
Cache:     Upstash Redis (estado temporal, pubsub)
Frontend:  Vercel
```

**O alternativa:**
```
Backend + DB + Realtime:  PocketBase en Fly.io
Frontend:                 Cloudflare Pages
```

---

## 🏗️ Stack Microservicios (varios servicios pequeños)

```
API Gateway:   Cloudflare Workers (routing, rate limiting, auth)
Servicio 1:    Fly.io (Node.js, lógica principal)
Servicio 2:    Render (Python, procesamiento)
Database:      Neon PostgreSQL (compartida o por servicio)
Queue/Cache:   Upstash Redis
Storage:       Cloudflare R2
```

---

## 📊 Comparativa de límites gratuitos

### Frontend

| Servicio | Bandwidth | Builds/mes | Sin spin-down |
|---|---|---|---|
| Cloudflare Pages | **Ilimitado** ✅ | 500 | ✅ |
| Vercel | 100 GB | 6,000 min | ✅ |
| Netlify | 100 GB | 300 min | ✅ |
| GitHub Pages | 100 GB | 2,000 min | ✅ |

### Backend

| Servicio | RAM | Sin spin-down | Docker |
|---|---|---|---|
| Fly.io | 256 MB × 3 VMs | ✅ | ✅ |
| Koyeb | 256 MB | ✅ | ✅ |
| Railway | ~1 GB ($5 crédito) | ✅ | ✅ |
| Render | 512 MB | ❌ (duerme 15 min) | ✅ |

### Base de datos PostgreSQL

| Servicio | Storage | Sin pausa | Branching |
|---|---|---|---|
| CockroachDB | 5 GB | ✅ | ❌ |
| Neon | 512 MB | ✅ | ✅ |
| Supabase | 500 MB | ❌ (1 semana) | ❌ |
| Render PostgreSQL | 1 GB | ✅ | ❌ |

### Base de datos NoSQL

| Servicio | Storage | Límite ops gratuito |
|---|---|---|
| Turso (SQLite) | 9 GB | 1B reads/mes |
| MongoDB Atlas | 512 MB | Compartida |
| Firebase Firestore | 1 GB | 50k reads/día |
| Cloudflare D1 | 5 GB | 5M rows/día |

---

## ✅ Recomendación final para empezar

Si estás comenzando y quieres el setup más simple:

```
1. Crear cuenta en Vercel    → https://vercel.com
2. Crear cuenta en Supabase  → https://supabase.com
3. Crear cuenta en Upstash   → https://upstash.com
4. Crear proyecto Next.js:
   npx create-next-app@latest mi-proyecto
5. Conectar Supabase + Upstash a Vercel desde el marketplace
```

Con este stack tienes:
- ✅ Frontend + Backend (Next.js)
- ✅ Base de datos PostgreSQL
- ✅ Autenticación completa
- ✅ Almacenamiento de archivos
- ✅ Realtime
- ✅ Cache Redis
- ✅ Deploy automático en cada push
- ✅ **Sin gastar un centavo**
