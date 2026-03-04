---
sidebar_position: 6
title: Upstash (Redis)
---

# Upstash

Redis serverless con REST API. Ideal para caché, rate limiting, colas y sesiones. Funciona perfecto en entornos serverless donde las conexiones TCP persistentes son un problema.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Motor | **Redis** (compatible con comandos Redis estándar) |
| Comandos | **10,000/día** |
| Storage | 256 MB |
| Databases | 1 (free) |
| Kafka Topics | 10,000 mensajes/día |
| **REST API** | ✅ (ideal para serverless) |
| Regiones | US East, EU West, Asia Pacific |
| Persistencia | ✅ (AOF) |

## Crear base de datos

```
1. https://upstash.com → Create Database
2. Configurar:
   - Name: mi-cache
   - Type: Regional (una región) o Global (multi-región, más lento write)
   - Region: elegir la más cercana
   - TLS: ✅ activar
3. Copiar credenciales:
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN
```

## Instalar cliente

```bash
# Cliente oficial de Upstash (usa REST API, funciona en serverless)
npm install @upstash/redis

# Para usar con driver Redis estándar (conexión TCP):
npm install ioredis
```

## Conexión con @upstash/redis

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

## Operaciones básicas

```typescript
import { redis } from '@/lib/redis'

// SET / GET
await redis.set('clave', 'valor')
await redis.set('clave', 'valor', { ex: 3600 })  // expira en 1 hora
const valor = await redis.get<string>('clave')

// SET con JSON
await redis.set('usuario:123', { nombre: 'Juan', email: 'juan@email.com' })
const usuario = await redis.get<{ nombre: string, email: string }>('usuario:123')

// DEL
await redis.del('clave')
await redis.del('clave1', 'clave2', 'clave3')

// EXISTS
const existe = await redis.exists('clave')  // retorna 1 o 0

// EXPIRE (cambiar TTL de clave existente)
await redis.expire('clave', 600)  // 10 minutos

// TTL (tiempo restante)
const segundos = await redis.ttl('clave')
```

## Casos de uso comunes

### Caché de API

```typescript
// middleware/cache.ts
import { redis } from '@/lib/redis'

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  // Intentar obtener del caché
  const cached = await redis.get<T>(key)
  if (cached !== null) return cached

  // Si no está en caché, obtener datos reales
  const data = await fetcher()
  
  // Guardar en caché
  await redis.set(key, data, { ex: ttl })
  
  return data
}

// Uso:
const usuarios = await withCache(
  'usuarios:activos',
  300,  // 5 minutos de TTL
  () => db.query('SELECT * FROM usuarios WHERE activo = true')
)
```

### Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

// 10 requests por IP cada 10 segundos
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

// En tu middleware de API:
export async function apiMiddleware(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  
  const { success, limit, remaining, reset } = await ratelimit.limit(ip)
  
  if (!success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      }
    })
  }
  
  // Continuar con la request...
}
```

```bash
npm install @upstash/ratelimit
```

### Sesiones y tokens

```typescript
// Guardar sesión
await redis.set(
  `session:${sessionId}`,
  JSON.stringify({ userId, email, roles }),
  { ex: 86400 }  // 24 horas
)

// Obtener sesión
const session = await redis.get<SessionData>(`session:${sessionId}`)

// Invalidar sesión (logout)
await redis.del(`session:${sessionId}`)
```

### Contadores y leaderboards

```typescript
// Contador de visitas
await redis.incr('visitas:pagina-inicio')
await redis.incrby('visitas:pagina-inicio', 5)
const visitas = await redis.get<number>('visitas:pagina-inicio')

// Sorted Set (leaderboard)
await redis.zadd('puntuaciones', { score: 1500, member: 'juan' })
await redis.zadd('puntuaciones', { score: 2300, member: 'ana' })

// Top 10
const top10 = await redis.zrange('puntuaciones', 0, 9, { rev: true, withScores: true })

// Rango de un usuario específico
const rango = await redis.zrank('puntuaciones', 'juan')
```

### Pub/Sub para notificaciones

```typescript
// Publisher
await redis.publish('notificaciones', JSON.stringify({
  tipo: 'nuevo-mensaje',
  userId: '123',
  contenido: 'Tienes un nuevo mensaje'
}))

// Subscriber (solo funciona con conexión TCP, no REST)
// Usar ioredis para esto
```

## Integración con Vercel (automática)

```
Vercel → Storage → Upstash → Create
→ Vercel inyecta automáticamente las variables de entorno
```

## Sugerencia: separar entornos con prefijos

```typescript
const ENV = process.env.NODE_ENV === 'production' ? 'prod' : 'dev'

// Usar prefijo en todas las claves
await redis.set(`${ENV}:usuario:${id}`, datos)
const datos = await redis.get(`${ENV}:usuario:${id}`)
```

## ⚠️ Limitaciones importantes

- **10,000 comandos/día:** se agota fácilmente con caché de alta frecuencia; usar TTLs más largos
- **1 sola DB free:** no puedes tener dev y producción separados (usa prefijos de clave)
- **256 MB:** suficiente para caché pero no para almacenamiento principal
- **Comandos REST:** ligeramente más lento que conexión TCP directa (1-2ms adicionales)
