---
sidebar_position: 4
title: MongoDB Atlas
---

# MongoDB Atlas

Base de datos NoSQL orientada a documentos. El cluster **M0 gratuito** es perfecto para desarrollo y proyectos pequeños.

## Límites del plan gratuito (M0 Shared)

| Parámetro | Valor |
|---|---|
| Motor | **MongoDB** (NoSQL, documentos JSON) |
| Storage | **512 MB** |
| RAM | Compartida (no garantizada) |
| Clusters M0 | **1 por proyecto** |
| Proyectos | Ilimitados |
| Organizaciones | Ilimitadas |
| Atlas Search | ✅ Incluido |
| Atlas App Services | ✅ (Functions, Triggers, GraphQL) |
| Operaciones | Limitadas pero adecuadas para dev |
| Backup | ❌ No en M0 |

## Crear cuenta y cluster

```
1. https://cloud.mongodb.com → Create Account
2. New Project → nombre del proyecto
3. Build a Database → M0 Free
4. Cloud Provider: AWS / GCP / Azure (cualquiera sirve para free)
5. Region: elegir la más cercana
6. Cluster Name: Cluster0 (o el que prefieras)
7. Create Cluster (tarda ~3 minutos)
```

## Configurar acceso

### Crear usuario de base de datos
```
Security → Database Access → Add New Database User
→ Authentication: Password
→ Username: mi-usuario
→ Password: contraseña-segura (guardarla)
→ Role: Atlas admin (para dev) o Read and write to any database
```

### Configurar acceso de red
```
Security → Network Access → Add IP Address
→ Para desarrollo: "Allow Access from Anywhere" (0.0.0.0/0)
→ Para producción: solo agregar IPs específicas
```

## Obtener connection string

```
Database → Connect → Drivers
→ Driver: Node.js
→ Version: 5.5 o latest
→ Copiar: mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/
```

## Conexión con Mongoose

```bash
npm install mongoose
```

```typescript
// db/mongoose.ts
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

// Singleton para evitar múltiples conexiones (importante en serverless)
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
```

## Definir modelos con Mongoose

```typescript
// models/Usuario.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IUsuario extends Document {
  nombre: string
  email: string
  activo: boolean
  createdAt: Date
}

const UsuarioSchema = new Schema<IUsuario>({
  nombre: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  activo: { type: Boolean, default: true },
}, {
  timestamps: true  // agrega createdAt y updatedAt automáticamente
})

// Índices para mejorar performance
UsuarioSchema.index({ email: 1 })
UsuarioSchema.index({ createdAt: -1 })

export const Usuario = mongoose.models.Usuario || 
  mongoose.model<IUsuario>('Usuario', UsuarioSchema)
```

## Operaciones CRUD

```typescript
import { connectDB } from '@/db/mongoose'
import { Usuario } from '@/models/Usuario'

// CREATE
await connectDB()
const usuario = await Usuario.create({
  nombre: 'Juan',
  email: 'juan@email.com'
})

// READ
const todos = await Usuario.find({ activo: true })
  .sort({ createdAt: -1 })
  .limit(10)
  .lean()  // retorna objetos JS planos (más rápido)

const uno = await Usuario.findById(id)
const porEmail = await Usuario.findOne({ email: 'juan@email.com' })

// UPDATE
const actualizado = await Usuario.findByIdAndUpdate(
  id,
  { $set: { nombre: 'Juan Carlos' } },
  { new: true, runValidators: true }
)

// DELETE
await Usuario.findByIdAndDelete(id)

// Actualizar múltiples
await Usuario.updateMany(
  { activo: false },
  { $set: { deletedAt: new Date() } }
)
```

## Queries avanzadas

```typescript
// Filtros
const resultados = await Usuario.find({
  nombre: /juan/i,        // regex (case insensitive)
  activo: true,
  createdAt: { $gte: new Date('2024-01-01') }
})

// Aggregation pipeline
const stats = await Usuario.aggregate([
  { $match: { activo: true } },
  { $group: { 
    _id: '$ciudad', 
    total: { $sum: 1 },
    emails: { $push: '$email' }
  }},
  { $sort: { total: -1 } }
])

// Población de referencias
const PostSchema = new Schema({
  titulo: String,
  autor: { type: Schema.Types.ObjectId, ref: 'Usuario' }
})

const posts = await Post.find().populate('autor', 'nombre email')
```

## Atlas Search (búsqueda full-text)

```
Atlas → Search → Create Search Index
→ Collection: usuarios
→ Index name: default
→ Dynamic mapping: on
```

```typescript
// Buscar con Atlas Search
const resultados = await Usuario.aggregate([
  {
    $search: {
      index: 'default',
      text: {
        query: 'juan developer',
        path: ['nombre', 'bio'],
        fuzzy: { maxEdits: 1 }  // tolerancia a errores tipográficos
      }
    }
  },
  { $limit: 10 }
])
```

## Proyectos y organizaciones

```
Organización
├── Proyecto A (Cluster M0 gratis)
│   ├── Database: app-produccion
│   └── Database: app-desarrollo
└── Proyecto B (Cluster M0 gratis)
    └── Database: otro-proyecto
```

- Cada proyecto puede tener **1 cluster M0 gratis**
- Las organizaciones y proyectos son **ilimitados** (pero 1 cluster free por proyecto)
- Para exportar datos: Atlas → Collections → Export to JSON/CSV

## ⚠️ Limitaciones importantes

- **512 MB:** se llena rápido con imágenes o datos binarios (usar GridFS o almacenamiento externo)
- **Sin transacciones en M0:** las transacciones ACID requieren cluster de pago
- **RAM compartida:** rendimiento no garantizado bajo carga
- **Sin backup automático en M0:** exportar datos periódicamente
