---
sidebar_position: 7
title: CockroachDB Serverless
---

# CockroachDB Serverless

Base de datos distribuida y compatible con PostgreSQL. Ofrece **5 GB gratuitos** sin pausas automáticas y con escalado automático.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Motor | **CockroachDB** (compatible con PostgreSQL) |
| Storage | **5 GB** |
| Request Units | 50,000,000/mes |
| **Sin spin-down** | ✅ Siempre activo |
| Multi-región | ✅ |
| Backups | 30 días de backups automáticos ✅ |
| Compatible con | Drivers PostgreSQL estándar (`pg`, Prisma, Drizzle) |
| Clusters | 1 serverless cluster (free) |

## Crear cluster

```
1. https://cockroachlabs.com/free → Create account
2. Create a free cluster
3. Configurar:
   - Plan: Serverless
   - Regions: elegir una o varias (multi-región gratis)
   - Cluster name: mi-cluster
4. Create cluster
5. Crear SQL user:
   - Username: mi-usuario
   - Password: guardar la contraseña
6. Conectar:
   - Seleccionar: Node.js (u otro)
   - Copiar connection string
```

## Connection string

```
postgresql://mi-usuario:PASSWORD@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full
```

## Conectar con `pg` (driver PostgreSQL estándar)

```bash
npm install pg
```

```typescript
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,  // CockroachDB requiere SSL
    ca: process.env.COCKROACH_CA_CERT,  // cert del cluster si usas cert auth
  }
})

const { rows } = await pool.query('SELECT * FROM usuarios')
```

## Con Prisma ORM

```bash
npm install prisma @prisma/client
npx prisma init
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "cockroachdb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Usuario {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  nombre    String
  email     String   @unique
  activo    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")

  @@map("usuarios")
}
```

```bash
npx prisma migrate dev --name init
npx prisma generate
```

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Crear
const usuario = await prisma.usuario.create({
  data: { nombre: 'Juan', email: 'juan@email.com' }
})

// Leer
const usuarios = await prisma.usuario.findMany({
  where: { activo: true },
  orderBy: { createdAt: 'desc' }
})

// Actualizar
await prisma.usuario.update({
  where: { id: userId },
  data: { nombre: 'Juan Carlos' }
})

// Eliminar
await prisma.usuario.delete({ where: { id: userId } })
```

## Características únicas de CockroachDB

### Transacciones distribuidas
```sql
BEGIN;
UPDATE cuentas SET saldo = saldo - 100 WHERE id = 1;
UPDATE cuentas SET saldo = saldo + 100 WHERE id = 2;
COMMIT;
-- Las transacciones son ACID completas incluso entre nodos
```

### Contention y reintentos automáticos
```typescript
// CockroachDB puede tener contention (conflictos de transacción)
// Usar el helper de reintentos:
import { Pool } from 'pg'

async function executeWithRetry(pool: Pool, fn: (client: any) => Promise<void>) {
  const client = await pool.connect()
  while (true) {
    try {
      await client.query('BEGIN')
      await fn(client)
      await client.query('COMMIT')
      break
    } catch (err: any) {
      await client.query('ROLLBACK')
      if (err.code !== '40001') throw err  // 40001 = serialization failure
      // Reintentar automáticamente
    } finally {
      client.release()
    }
  }
}
```

## ⚠️ Limitaciones importantes

- **Sintaxis diferente en algunos casos:** aunque es compatible con PostgreSQL, hay diferencias menores (ej: tipos de datos como `SERIAL` vs `UUID`)
- **Request Units:** métrica abstracta que puede agotarse con queries pesadas
- **Sin extensiones PostgreSQL:** PostGIS, pgvector y otras extensiones no están disponibles
- **Latencia ligeramente mayor:** al ser distribuido, puede ser más lento que PostgreSQL tradicional para queries simples
