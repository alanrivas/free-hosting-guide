---
sidebar_position: 1
title: PocketBase
---

# PocketBase

Backend completo en **un solo archivo binario**: base de datos SQLite, autenticación, almacenamiento de archivos, y API REST + Realtime. Se despliega en Fly.io gratis.

## Límites del plan gratuito

PocketBase es **self-hosted**: tú lo desplegás en tu propio servidor. Con Fly.io gratis, los límites son los del hosting, no los del software en sí.

| Parámetro | Valor (Fly.io free tier) |
|---|---|
| VMs | 1 × shared-cpu-1x (256 MB RAM) |
| Storage (volume) | 1 GB persistente gratis |
| Bandwidth | 160 GB salida/mes |
| Base de datos | SQLite (incluida en el binario) |
| Auth, Realtime, Files | ✅ Incluido y **sin límites de usuarios** |
| **Costo del software** | **Gratis para siempre** (open source) |
| Sin pausas | ✅ (con `auto_stop_machines = false`) |

:::info
A diferencia de Firebase o Supabase, PocketBase no tiene límites de MAU, reads/writes o storage en el software — los únicos límites son los del servidor donde lo hosteas.
:::

## ¿Qué incluye?

| Característica | Disponible |
|---|---|
| Base de datos | ✅ SQLite |
| API REST auto-generada | ✅ |
| Dashboard admin (UI) | ✅ |
| Autenticación | ✅ (email/password, OAuth) |
| Almacenamiento de archivos | ✅ |
| Realtime (websockets) | ✅ |
| Extensiones en Go | ✅ |
| Self-hosted | ✅ (gratis siempre) |
| Docker image | ✅ |

## Despliegue en Fly.io (100% gratis)

```bash
# Prerrequisito: tener flyctl instalado y cuenta en Fly.io
fly auth login

# Crear app
fly apps create mi-pocketbase --machines

# Crear volume para persistencia de datos (1 GB gratis)
fly volumes create pb_data --app mi-pocketbase --size 1 --region mad

# Crear fly.toml
```

Crear archivo `fly.toml`:

```toml
app = "mi-pocketbase"
primary_region = "mad"

[build]
  image = "ghcr.io/muchobien/pocketbase:latest"

[mounts]
  source = "pb_data"
  destination = "/pb_data"

[http_service]
  internal_port = 8090
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

```bash
# Desplegar
fly deploy

# Ver URL de tu PocketBase:
fly open

# El admin panel está en: https://mi-pocketbase.fly.dev/_/
```

## Configuración inicial

```
1. Ir a: https://mi-pocketbase.fly.dev/_/
2. Crear cuenta admin (solo la primera vez)
3. Explorar el dashboard
```

## Crear colecciones (tablas)

```
Collections → New Collection
→ Name: productos
→ Fields:
   - nombre (text, required)
   - precio (number)
   - descripcion (text)
   - imagen (file)
   - activo (bool, default: true)
→ API Rules: configurar quién puede leer/escribir
→ Save
```

PocketBase **genera automáticamente** la API REST:
```
GET    /api/collections/productos/records
POST   /api/collections/productos/records
GET    /api/collections/productos/records/:id
PATCH  /api/collections/productos/records/:id
DELETE /api/collections/productos/records/:id
```

## SDK de JavaScript

```bash
npm install pocketbase
```

```typescript
// lib/pocketbase.ts
import PocketBase from 'pocketbase'

export const pb = new PocketBase('https://mi-pocketbase.fly.dev')
```

## Operaciones CRUD

```typescript
import { pb } from '@/lib/pocketbase'

// Listar registros
const productos = await pb.collection('productos').getList(1, 20, {
  filter: 'activo = true',
  sort: '-created',
  expand: 'categoria'  // relaciones
})
console.log(productos.items)

// Obtener uno
const producto = await pb.collection('productos').getOne('RECORD_ID')

// Buscar
const resultados = await pb.collection('productos').getList(1, 10, {
  filter: `nombre ~ "${busqueda}" && precio < 100`,
})

// Crear
const nuevo = await pb.collection('productos').create({
  nombre: 'Laptop',
  precio: 999,
  activo: true
})

// Con archivo
const formData = new FormData()
formData.append('nombre', 'Laptop')
formData.append('imagen', archivoFile)
const con_imagen = await pb.collection('productos').create(formData)

// Actualizar
const actualizado = await pb.collection('productos').update('RECORD_ID', {
  precio: 899
})

// Eliminar
await pb.collection('productos').delete('RECORD_ID')
```

## Autenticación

```typescript
// Registro con email/password
const usuario = await pb.collection('users').create({
  email: 'juan@email.com',
  password: 'contraseña123',
  passwordConfirm: 'contraseña123',
  nombre: 'Juan'
})

// Login
const authData = await pb.collection('users').authWithPassword(
  'juan@email.com', 
  'contraseña123'
)
console.log(pb.authStore.isValid)  // true
console.log(pb.authStore.model)    // datos del usuario
console.log(pb.authStore.token)    // JWT token

// Login con OAuth (Google, GitHub, etc.)
const authData = await pb.collection('users').authWithOAuth2({
  provider: 'google',
})

// Verificar sesión actual
const user = await pb.collection('users').authRefresh()

// Logout
pb.authStore.clear()

// Persistir sesión (localStorage en browser)
// PocketBase lo maneja automáticamente en browser
```

## Realtime (suscripciones)

```typescript
// Escuchar todos los cambios en una colección
pb.collection('mensajes').subscribe('*', (e) => {
  console.log(e.action)  // 'create', 'update', 'delete'
  console.log(e.record)  // datos del registro
})

// Escuchar cambios de un registro específico
pb.collection('productos').subscribe('RECORD_ID', (e) => {
  console.log('Producto actualizado:', e.record)
})

// Desuscribirse
pb.collection('mensajes').unsubscribe()
```

## API Rules (seguridad)

En el dashboard de PocketBase, configura las reglas para cada colección:

```
Collections → productos → API Rules

List/Search: @request.auth.id != ""  ← solo usuarios autenticados
View:        ""  ← público
Create:      @request.auth.id != ""  ← autenticados
Update:      @request.auth.id = @collection.usuarios.id  ← solo el dueño
Delete:      @request.auth.roles ?~ "admin"  ← solo admins
```

## Actualizar PocketBase

```bash
# Ver versiones disponibles
# https://github.com/pocketbase/pocketbase/releases

# Actualizar imagen en Fly.io:
# Cambiar la versión en fly.toml:
[build]
  image = "ghcr.io/muchobien/pocketbase:0.22.0"

fly deploy
```

## ⚠️ Limitaciones importantes

- **SQLite:** no escala bien para muchas escrituras concurrentes
- **Self-hosted:** tú eres responsable de los backups
- **1 instancia:** no tiene clustering (solo 1 instancia en Fly.io free)
- **Backups manuales:** hacer backups del volume de Fly.io regularmente

### Hacer backup

```bash
# Descargar el archivo de base de datos
fly ssh console -a mi-pocketbase
# Dentro del contenedor:
cp /pb_data/data.db /tmp/backup.db

# O usar el endpoint de backup de PocketBase:
# GET /api/backups (requiere admin token)
```
