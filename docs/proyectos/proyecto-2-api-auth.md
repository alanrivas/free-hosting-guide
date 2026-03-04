---
sidebar_position: 3
---

# 🔐 Proyecto 2: API REST con Autenticación JWT

:::info
**Dificultad:** ⭐⭐ Media | **Tiempo:** 2-3 horas | **Servicios:** Hono, Neon, Render
:::

## Qué vas a construir

Una API REST para un gestor de tareas con registro de usuarios, login con JWT, y CRUD de tareas por usuario. Cada usuario solo puede ver y modificar sus propias tareas.

```
Arquitectura:

Cliente (curl / frontend)
        ↓
Hono API (Render)
        ↓
Neon PostgreSQL (usuarios + tareas)
```

## Lo que vas a aprender

- **Hono** — framework HTTP ultraligero para Node.js/Bun/Edge
- **JWT** con la biblioteca `jose` — firma y verificación de tokens
- **Hashing de contraseñas** con `bcryptjs`
- **Neon** — PostgreSQL serverless con driver dedicado
- **Deploy en Render** — Web Service gratuito con auto-deploy desde GitHub

## Paso 1: Inicializar el proyecto

```bash
mkdir api-tareas && cd api-tareas
npm init -y
npm install hono @hono/node-server @neondatabase/serverless bcryptjs jose dotenv
npm install -D typescript @types/node @types/bcryptjs tsx
```

Crea `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Agrega los scripts en `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc"
  }
}
```

## Paso 2: Schema de base de datos

En el **SQL Editor de Neon** ([console.neon.tech](https://console.neon.tech)), crea las tablas:

```sql
create table usuarios (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table tareas (
  id serial primary key,
  user_id integer references usuarios(id) on delete cascade,
  titulo text not null,
  descripcion text,
  completada boolean default false,
  created_at timestamptz default now()
);

create index idx_tareas_user_id on tareas(user_id);
```

:::tip
El índice `idx_tareas_user_id` es clave para el rendimiento: sin él, cada consulta de "mis tareas" haría un full scan de toda la tabla.
:::

## Paso 3: Middleware de autenticación

Crea `src/middleware/auth.ts`:

```typescript
import { createMiddleware } from 'hono/factory'
import { verify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Token requerido' }, 401)
  }

  const token = authHeader.split(' ')[1]
  
  try {
    const { payload } = await verify(token, JWT_SECRET)
    c.set('userId', payload.sub as string)
    await next()
  } catch {
    return c.json({ error: 'Token inválido o expirado' }, 401)
  }
})
```

:::info
Usamos `jose` en lugar de `jsonwebtoken` porque es compatible con el runtime Edge de Cloudflare Workers y Vercel Edge Functions, además de Node.js estándar.
:::

## Paso 4: Rutas de autenticación

Crea `src/routes/auth.ts`:

```typescript
import { Hono } from 'hono'
import { hash, compare } from 'bcryptjs'
import { SignJWT } from 'jose'
import { neon } from '@neondatabase/serverless'

const auth = new Hono()
const sql = neon(process.env.DATABASE_URL!)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

auth.post('/register', async (c) => {
  const { email, password } = await c.req.json()
  
  if (!email || !password) {
    return c.json({ error: 'Email y contraseña requeridos' }, 400)
  }
  
  if (password.length < 8) {
    return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
  }
  
  const passwordHash = await hash(password, 10)
  
  try {
    const [usuario] = await sql`
      insert into usuarios (email, password_hash)
      values (${email}, ${passwordHash})
      returning id, email, created_at
    `
    return c.json({ usuario }, 201)
  } catch (err: any) {
    if (err.message.includes('unique')) {
      return c.json({ error: 'El email ya está registrado' }, 409)
    }
    throw err
  }
})

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  
  const [usuario] = await sql`
    select * from usuarios where email = ${email}
  `
  
  if (!usuario || !(await compare(password, usuario.password_hash))) {
    return c.json({ error: 'Credenciales inválidas' }, 401)
  }
  
  const token = await new SignJWT({ sub: String(usuario.id) })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
  
  return c.json({ token, email: usuario.email })
})

export default auth
```

## Paso 5: CRUD de tareas

Crea `src/routes/tareas.ts` con todas las operaciones protegidas por JWT:

```typescript
import { Hono } from 'hono'
import { neon } from '@neondatabase/serverless'
import { authMiddleware } from '../middleware/auth'

const tareas = new Hono()
const sql = neon(process.env.DATABASE_URL!)

// Todas las rutas requieren autenticación
tareas.use('*', authMiddleware)

// GET /tareas - listar mis tareas
tareas.get('/', async (c) => {
  const userId = c.get('userId')
  const { completada } = c.req.query()
  
  let data
  if (completada !== undefined) {
    data = await sql`
      select * from tareas
      where user_id = ${userId}
        and completada = ${completada === 'true'}
      order by created_at desc
    `
  } else {
    data = await sql`
      select * from tareas
      where user_id = ${userId}
      order by created_at desc
    `
  }
  
  return c.json({ tareas: data })
})

// POST /tareas - crear tarea
tareas.post('/', async (c) => {
  const userId = c.get('userId')
  const { titulo, descripcion } = await c.req.json()
  
  if (!titulo?.trim()) {
    return c.json({ error: 'El título es requerido' }, 400)
  }
  
  const [tarea] = await sql`
    insert into tareas (user_id, titulo, descripcion)
    values (${userId}, ${titulo.trim()}, ${descripcion || null})
    returning *
  `
  return c.json({ tarea }, 201)
})

// PATCH /tareas/:id - actualizar tarea
tareas.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { titulo, descripcion, completada } = await c.req.json()
  
  const [tarea] = await sql`
    update tareas
    set
      titulo = coalesce(${titulo}, titulo),
      descripcion = coalesce(${descripcion}, descripcion),
      completada = coalesce(${completada}, completada)
    where id = ${id} and user_id = ${userId}
    returning *
  `
  
  if (!tarea) return c.json({ error: 'Tarea no encontrada' }, 404)
  return c.json({ tarea })
})

// DELETE /tareas/:id - eliminar tarea
tareas.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  
  const [tarea] = await sql`
    delete from tareas
    where id = ${id} and user_id = ${userId}
    returning id
  `
  
  if (!tarea) return c.json({ error: 'Tarea no encontrada' }, 404)
  return c.json({ mensaje: 'Tarea eliminada' })
})

export default tareas
```

## Paso 6: Servidor principal

Crea `src/index.ts`:

```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import 'dotenv/config'
import auth from './routes/auth'
import tareas from './routes/tareas'

const app = new Hono()

app.use('*', cors())
app.route('/auth', auth)
app.route('/tareas', tareas)

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000 }, (info) => {
  console.log(`API corriendo en http://localhost:${info.port}`)
})
```

Y el archivo `.env` local:

```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
JWT_SECRET=un-secreto-muy-largo-y-aleatorio-aqui
PORT=3000
```

:::warning
Genera un `JWT_SECRET` fuerte con: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. Nunca uses un secreto débil en producción.
:::

## Paso 7: Deploy en Render

1. Sube tu código a un repositorio de GitHub
2. Ve a [render.com](https://render.com) → **New → Web Service**
3. Conecta tu repositorio
4. Configura el servicio:

| Campo | Valor |
|---|---|
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npx tsx src/index.ts` |
| **Instance Type** | Free |

5. En **Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Connection string de Neon |
| `JWT_SECRET` | Tu secreto generado |

:::info
Render apaga los servicios gratuitos después de 15 minutos de inactividad. La primera request puede tardar 30-60 segundos en "despertar" el servicio.
:::

## Probar la API

```bash
# Registrar usuario
curl -X POST https://tu-api.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com","password":"MiPass123"}'

# Login (guarda el token devuelto)
curl -X POST https://tu-api.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@email.com","password":"MiPass123"}'

# Crear tarea (reemplaza TU_TOKEN con el token del login)
curl -X POST https://tu-api.onrender.com/tareas \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titulo":"Mi primera tarea","descripcion":"Completar el proyecto"}'

# Listar tareas
curl https://tu-api.onrender.com/tareas \
  -H "Authorization: Bearer TU_TOKEN"

# Marcar como completada
curl -X PATCH https://tu-api.onrender.com/tareas/1 \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completada":true}'

# Eliminar tarea
curl -X DELETE https://tu-api.onrender.com/tareas/1 \
  -H "Authorization: Bearer TU_TOKEN"
```

## ✅ Checklist de verificación

- [ ] Schema creado en Neon (tablas `usuarios` y `tareas`)
- [ ] `POST /auth/register` devuelve el usuario creado
- [ ] `POST /auth/login` devuelve un JWT válido
- [ ] Rutas de `/tareas` rechazan requests sin token (respuesta 401)
- [ ] CRUD completo de tareas funciona con token válido
- [ ] Un usuario no puede ver ni modificar tareas de otro usuario
- [ ] Deploy en Render activo y respondiendo
- [ ] Variables de entorno configuradas en Render
