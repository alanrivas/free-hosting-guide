---
sidebar_position: 3
title: Turso (SQLite)
---

# Turso

SQLite distribuido en el edge. Ofrece **500 bases de datos gratis** y latencia ultra-baja al estar cerca del usuario. Ideal para apps con reads intensivos y datos simples.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Motor | **SQLite** (libSQL, fork de SQLite) |
| Databases | **500** bases de datos |
| Storage total | 9 GB |
| Row reads | 1,000,000,000 (1 Billón)/mes |
| Row writes | 25,000,000 (25M)/mes |
| Embedded replicas | ✅ |
| Organizaciones | 1 organización |
| Locaciones edge | Múltiples regiones |

## Instalación del CLI

```bash
# Mac/Linux:
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell):
# Descargar desde: https://github.com/tursodatabase/turso-cli/releases

# O con npm:
npm install -g @turso/cli

# Login:
turso auth login
```

## Crear y gestionar bases de datos

```bash
# Crear base de datos
turso db create mi-database

# Crear en región específica
turso db create mi-database --location mad  # Madrid
turso db create mi-database --location iad  # US East
turso db create mi-database --location nrt  # Tokyo

# Ver regiones disponibles
turso db locations

# Listar todas las bases de datos
turso db list

# Ver info de una DB (URL, regiones, etc.)
turso db show mi-database

# Eliminar base de datos
turso db destroy mi-database
```

## Consola SQL interactiva

```bash
turso db shell mi-database

# Dentro de la consola:
.tables                          # listar tablas
.schema usuarios                 # ver schema de tabla
SELECT * FROM usuarios LIMIT 5;
CREATE TABLE productos (id INTEGER PRIMARY KEY, nombre TEXT, precio REAL);
.exit
```

## Tokens de autenticación

```bash
# Crear token para la DB (usar en tu app)
turso db tokens create mi-database

# Token con expiración (más seguro para producción)
turso db tokens create mi-database --expiration 7d

# Revocar token
turso db tokens revoke mi-database TOKEN_ID
```

## Conectar desde Node.js/TypeScript

```bash
npm install @libsql/client
```

```typescript
// db.ts
import { createClient } from "@libsql/client"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export { client }
```

```bash
# .env
TURSO_DATABASE_URL=libsql://mi-database-usuario.turso.io
TURSO_AUTH_TOKEN=eyJhb...
```

## Operaciones básicas

```typescript
import { client } from './db'

// CREATE TABLE
await client.execute(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`)

// INSERT
const result = await client.execute({
  sql: "INSERT INTO usuarios (nombre, email) VALUES (?, ?)",
  args: ["Juan", "juan@email.com"]
})
console.log('Nuevo ID:', result.lastInsertRowid)

// SELECT
const { rows } = await client.execute("SELECT * FROM usuarios")
console.log(rows)

// SELECT con parámetros
const { rows } = await client.execute({
  sql: "SELECT * FROM usuarios WHERE email = ?",
  args: [email]
})

// UPDATE
await client.execute({
  sql: "UPDATE usuarios SET nombre = ? WHERE id = ?",
  args: [nuevoNombre, id]
})

// DELETE
await client.execute({
  sql: "DELETE FROM usuarios WHERE id = ?",
  args: [id]
})
```

## Transacciones

```typescript
// Transacción atómica
const transaction = await client.transaction("write")
try {
  await transaction.execute({
    sql: "UPDATE cuentas SET saldo = saldo - ? WHERE id = ?",
    args: [monto, cuentaOrigen]
  })
  await transaction.execute({
    sql: "UPDATE cuentas SET saldo = saldo + ? WHERE id = ?",
    args: [monto, cuentaDestino]
  })
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
  throw error
}
```

## Batch queries (múltiples operaciones)

```typescript
// Ejecutar múltiples queries en una sola petición de red
const results = await client.batch([
  "SELECT COUNT(*) as total FROM usuarios",
  { sql: "SELECT * FROM usuarios WHERE activo = ?", args: [1] },
  "SELECT * FROM productos ORDER BY precio DESC LIMIT 5",
], "read")  // "read" o "write" o "deferred"
```

## Con Drizzle ORM

```bash
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

```typescript
// db/schema.ts
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  email: text('email').unique().notNull(),
})
```

```typescript
// db/index.ts
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client)
```

## Embedded Replicas (réplicas locales)

Permite tener una copia local del SQLite que se sincroniza con Turso:

```typescript
const client = createClient({
  url: "file:local.db",           // archivo SQLite local
  syncUrl: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// Sincronizar manualmente
await client.sync()
```

Ideal para apps de escritorio o móviles con soporte offline.

## Organización en Turso

```
Organización (tu cuenta)
└── Database: api-produccion
└── Database: api-desarrollo
└── Database: app-cliente-1
└── Database: app-cliente-2
... (hasta 500 databases gratis)
```

## ⚠️ Limitaciones importantes

- **SQLite, no PostgreSQL:** no tiene soporte para JOINs complejos, funciones avanzadas, extensiones
- **Sin triggers ni stored procedures avanzados**
- **Concurrencia de escritura limitada:** SQLite no es ideal para apps con muchas escrituras concurrentes
- **No ideal para datos relacionales complejos:** considera Neon/Supabase para esos casos
