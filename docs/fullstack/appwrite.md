---
sidebar_position: 2
title: Appwrite Cloud
---

# Appwrite Cloud

Backend as a Service open-source con plan cloud gratuito. Similar a Firebase pero con más control y posibilidad de self-hosting.

## Límites del plan gratuito (Free)

| Servicio | Límite gratuito |
|---|---|
| **Bases de datos** | 3 databases, 3 buckets |
| **Auth (MAU)** | 10,000 usuarios activos/mes |
| **Storage** | 2 GB |
| **Functions** | 750,000 ejecuciones/mes |
| **Messaging** | 1,000 mensajes/mes |
| **Realtime** | Conexiones ilimitadas |
| Organizaciones | 1 (free) |
| Proyectos | Múltiples en la organización |
| Miembros del equipo | 1 (free tier) |

## Crear proyecto

```
1. https://cloud.appwrite.io → Sign up
2. Create Organization → nombre
3. Create Project → nombre del proyecto
4. Seleccionar región
5. Desde el dashboard puedes crear:
   - Databases
   - Auth providers
   - Storage buckets
   - Functions
```

## Instalar SDK

```bash
# Web/Node.js
npm install appwrite        # cliente (browser/frontend)
npm install node-appwrite   # servidor (backend/Node.js)
```

## Inicializar cliente (frontend)

```typescript
// lib/appwrite.ts
import { Client, Databases, Account, Storage } from 'appwrite'

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

export const databases = new Databases(client)
export const account = new Account(client)
export const storage = new Storage(client)
```

## Inicializar cliente (backend/servidor)

```typescript
// lib/appwrite-server.ts
import { Client, Databases, Users } from 'node-appwrite'

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!)  // API Key del servidor

export const databases = new Databases(client)
export const users = new Users(client)
```

## Crear base de datos y colecciones

```
Dashboard → Databases → Create Database
→ Database ID: mi-database (o auto-generar)
→ Name: Mi Base de Datos

→ Create Collection → nombre: usuarios
→ Add Attribute:
   - nombre (String, required, size: 255)
   - email (Email, required)
   - activo (Boolean, default: true)
→ Permissions: configurar quién puede acceder
```

## Operaciones CRUD

```typescript
import { databases } from '@/lib/appwrite'
import { ID, Query } from 'appwrite'

const DATABASE_ID = 'mi-database'
const COLLECTION_ID = 'usuarios'

// CREATE
const usuario = await databases.createDocument(
  DATABASE_ID,
  COLLECTION_ID,
  ID.unique(),  // o un ID específico
  {
    nombre: 'Juan',
    email: 'juan@email.com',
    activo: true
  }
)

// READ (uno)
const usuario = await databases.getDocument(
  DATABASE_ID,
  COLLECTION_ID,
  'DOCUMENT_ID'
)

// READ (lista con filtros)
const lista = await databases.listDocuments(
  DATABASE_ID,
  COLLECTION_ID,
  [
    Query.equal('activo', true),
    Query.orderDesc('$createdAt'),
    Query.limit(20),
    Query.offset(0),
    Query.search('nombre', 'Juan'),  // búsqueda full-text
  ]
)
console.log(lista.documents, lista.total)

// UPDATE
const actualizado = await databases.updateDocument(
  DATABASE_ID,
  COLLECTION_ID,
  'DOCUMENT_ID',
  { nombre: 'Juan Carlos' }
)

// DELETE
await databases.deleteDocument(DATABASE_ID, COLLECTION_ID, 'DOCUMENT_ID')
```

## Autenticación

```typescript
import { account } from '@/lib/appwrite'
import { ID } from 'appwrite'

// Registro
await account.create(ID.unique(), 'juan@email.com', 'contraseña123', 'Juan')

// Login
const session = await account.createEmailPasswordSession(
  'juan@email.com', 
  'contraseña123'
)

// Login con OAuth (Google, GitHub, etc.)
account.createOAuth2Session(
  'google',
  'https://mi-app.com/auth/success',
  'https://mi-app.com/auth/failure'
)

// Obtener usuario actual
const user = await account.get()

// Logout (sesión actual)
await account.deleteSession('current')

// Logout (todas las sesiones)
await account.deleteSessions()
```

## Storage (archivos)

```typescript
import { storage } from '@/lib/appwrite'
import { ID } from 'appwrite'

const BUCKET_ID = 'mi-bucket'

// Subir archivo
const archivo = await storage.createFile(
  BUCKET_ID,
  ID.unique(),
  file  // objeto File del input
)

// Obtener URL de preview (imágenes)
const url = storage.getFilePreview(
  BUCKET_ID,
  archivo.$id,
  800,  // width
  600,  // height
)

// Obtener URL de descarga
const downloadUrl = storage.getFileDownload(BUCKET_ID, archivo.$id)

// Eliminar archivo
await storage.deleteFile(BUCKET_ID, archivo.$id)
```

## Realtime

```typescript
import { client } from '@/lib/appwrite'
import { RealtimeResponseEvent } from 'appwrite'

// Suscribirse a cambios en una colección
const unsubscribe = client.subscribe(
  `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
  (response: RealtimeResponseEvent<any>) => {
    if (response.events.includes('databases.*.collections.*.documents.*.create')) {
      console.log('Documento creado:', response.payload)
    }
    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
      console.log('Documento actualizado:', response.payload)
    }
  }
)

// Desuscribirse
unsubscribe()
```

## Functions (código serverless)

```bash
# Instalar Appwrite CLI
npm install -g appwrite-cli
appwrite login

# Crear función
appwrite init function
# → Runtime: node-18.0
# → Name: mi-funcion
```

```javascript
// functions/mi-funcion/src/main.js
import { Client, Databases } from 'node-appwrite'

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'])

  const databases = new Databases(client)

  try {
    const data = JSON.parse(req.body)
    const doc = await databases.createDocument(
      'mi-database', 'registros', 'unique()', data
    )
    return res.json({ success: true, id: doc.$id })
  } catch (err) {
    error('Error: ' + err.message)
    return res.json({ success: false }, 500)
  }
}
```

## ⚠️ Limitaciones importantes

- **10k MAU:** para apps con más usuarios necesitas plan pagado
- **1 miembro en org free:** no es ideal para equipos
- **750k executions/mes:** para funciones muy frecuentes puede ser insuficiente
- **Ecosistema más pequeño que Firebase:** menos recursos y ejemplos disponibles
