---
sidebar_position: 2
title: Neon
---

# Neon

PostgreSQL serverless con **branching** (ramas de base de datos como en Git). No tiene pausa automática como Supabase, lo que lo hace ideal para proyectos de desarrollo continuo.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Motor | **PostgreSQL** (serverless) |
| Storage | 512 MB |
| Proyectos | 1 proyecto |
| Branches | 10 branches por proyecto |
| Compute | 0.25 vCPU, auto-suspende cuando no hay queries |
| **Sin pausa manual** | ✅ No se pausa como Supabase |
| Conexión | Directa + Pooler (PgBouncer) |
| Regiones | AWS us-east-2, eu-central-1, ap-southeast-1, etc. |
| Backups | 7 días de historial |

## Crear proyecto

```
1. https://neon.tech → Sign up
2. Create a Project:
   - Name: mi-proyecto
   - PostgreSQL version: 16 (recomendado)
   - Region: la más cercana
3. Se crea automáticamente la branch "main"
4. Copiar el connection string desde el dashboard
```

## Obtener connection string

```
Dashboard → Connection Details
├── Direct connection:  postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname
└── Pooled connection:  postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname?pgbouncer=true
```

:::tip
Usa **Pooled connection** en aplicaciones serverless (Vercel, Netlify Functions, Cloudflare Workers) para evitar el error de "too many connections".
:::

## Conexión con drivers estándar de PostgreSQL

```bash
npm install pg
```

```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // requerido en Neon
})

const result = await pool.query('SELECT * FROM usuarios')
```

## Driver optimizado para serverless

```bash
npm install @neondatabase/serverless
```

```typescript
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Queries con template literals
const usuarios = await sql`SELECT * FROM usuarios WHERE activo = true`

// Con parámetros (previene SQL injection automáticamente)
const { rows } = await sql`
  SELECT * FROM usuarios 
  WHERE email = ${email} 
  AND activo = true
`

// INSERT
const [usuario] = await sql`
  INSERT INTO usuarios (nombre, email) 
  VALUES (${nombre}, ${email}) 
  RETURNING *
`

// UPDATE
await sql`
  UPDATE usuarios 
  SET nombre = ${nuevoNombre} 
  WHERE id = ${id}
`
```

## Con Drizzle ORM (recomendado)

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

```typescript
// db/schema.ts
import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core'

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: text('nombre').notNull(),
  email: text('email').unique().notNull(),
  activo: boolean('activo').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})
```

```typescript
// db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

```typescript
// Usar en tu app
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { eq } from 'drizzle-orm'

// SELECT
const todos = await db.select().from(usuarios)
const activos = await db.select().from(usuarios).where(eq(usuarios.activo, true))

// INSERT
const [nuevo] = await db.insert(usuarios)
  .values({ nombre: 'Juan', email: 'juan@email.com' })
  .returning()

// UPDATE
await db.update(usuarios)
  .set({ activo: false })
  .where(eq(usuarios.id, id))
```

```json
// drizzle.config.ts
{
  "schema": "./db/schema.ts",
  "out": "./drizzle",
  "dialect": "postgresql",
  "dbCredentials": {
    "url": "tu-database-url"
  }
}
```

```bash
# Generar y ejecutar migraciones
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Branching (función estrella de Neon)

Los branches son **copias instantáneas** de la base de datos, ideal para:
- **Desarrollo:** cada feature tiene su propia DB
- **Testing:** correr tests sin afectar datos reales
- **Staging:** ambiente idéntico a producción

```bash
# Instalar Neon CLI
npm install -g neonctl
neonctl auth

# Crear branch
neonctl branches create --name feature/nueva-funcionalidad --project-id tu-project-id

# Listar branches
neonctl branches list --project-id tu-project-id

# Obtener connection string de un branch
neonctl connection-string --branch feature/nueva-funcionalidad --project-id tu-project-id

# Eliminar branch
neonctl branches delete feature/nueva-funcionalidad --project-id tu-project-id
```

**Flujo de trabajo con branches:**
```
main branch          ← producción
  └── dev branch     ← desarrollo
        └── feature/X ← feature específica (eliminada al hacer merge)
```

## Configurar en Vercel (integración oficial)

```
1. Vercel → Storage → Browse Marketplace → Neon
2. "Create new database"
3. Vercel inyecta automáticamente:
   - DATABASE_URL
   - DATABASE_URL_UNPOOLED
4. Con branching automático: cada Preview deploy usa su propio branch de DB
```

## ⚠️ Limitaciones importantes

- **1 solo proyecto en free:** para más proyectos, necesitas plan pagado
- **0.25 vCPU:** las queries pesadas pueden ser lentas
- **Auto-suspend:** el compute se suspende tras inactividad (pero sin perder datos, solo hay latencia al reconectar)
- **Sin extensiones pagas:** PostGIS y otras extensiones premium requieren plan pagado
