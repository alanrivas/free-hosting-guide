---
sidebar_position: 1
title: Cloudflare R2
---

# Cloudflare R2

Almacenamiento de objetos compatible con S3, **sin costo de egress (salida de datos)**. Ideal para guardar imágenes, videos, backups y cualquier archivo.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Storage | **10 GB/mes** |
| Operaciones Class A (writes, lists) | 1,000,000/mes |
| Operaciones Class B (reads) | 10,000,000/mes |
| **Egress (salida de datos)** | **GRATIS** ✅ |
| Compatible con API S3 | ✅ |
| Workers binding | ✅ |
| Acceso público | ✅ (bucket público) |

## Crear bucket

```
1. https://dash.cloudflare.com → R2 Object Storage
2. Create bucket
3. Configurar:
   - Bucket name: mis-archivos (solo minúsculas, guiones)
   - Location: Automatic (o elegir región)
4. Create bucket
```

## Acceso público (para imágenes públicas)

```
Bucket → Settings → Public Access → Allow Access → Enable
→ URL pública: https://pub-xxxx.r2.dev/nombre-archivo.jpg
```

## Usar desde Cloudflare Workers (binding)

```toml
# wrangler.toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "mis-archivos"
```

```typescript
// Subir archivo desde Worker
export default {
  async fetch(req: Request, env: Env) {
    if (req.method === 'PUT') {
      const key = new URL(req.url).pathname.slice(1)
      await env.BUCKET.put(key, req.body, {
        httpMetadata: {
          contentType: req.headers.get('content-type') ?? 'application/octet-stream'
        }
      })
      return new Response(`Subido: ${key}`, { status: 200 })
    }

    if (req.method === 'GET') {
      const key = new URL(req.url).pathname.slice(1)
      const objeto = await env.BUCKET.get(key)
      if (!objeto) return new Response('Not Found', { status: 404 })
      
      return new Response(objeto.body, {
        headers: {
          'Content-Type': objeto.httpMetadata?.contentType ?? 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000',
          'ETag': objeto.httpEtag,
        }
      })
    }

    return new Response('Method Not Allowed', { status: 405 })
  }
}
```

## Usar con AWS SDK (compatible con S3)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Obtener credenciales en: R2 → Manage R2 API Tokens → Create API Token
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = 'mis-archivos'

// Subir archivo
async function uploadFile(key: string, body: Buffer, contentType: string) {
  await R2.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return `https://pub-xxxx.r2.dev/${key}`  // URL pública si el bucket es público
}

// Generar URL firmada para upload directo desde el cliente (presigned URL)
async function generateUploadUrl(key: string, contentType: string) {
  const url = await getSignedUrl(
    R2,
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }  // válida por 1 hora
  )
  return url
}

// Generar URL firmada para descarga privada
async function generateDownloadUrl(key: string) {
  const url = await getSignedUrl(
    R2,
    new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    { expiresIn: 3600 }
  )
  return url
}

// Eliminar archivo
async function deleteFile(key: string) {
  await R2.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  }))
}
```

## Crear API Token de R2

```
R2 → Manage R2 API Tokens → Create API Token
→ Permissions: Object Read & Write
→ TTL: No limit (o expiración específica)
→ Copiar:
   - Access Key ID
   - Secret Access Key
   - Endpoint: https://ACCOUNT_ID.r2.cloudflarestorage.com
```

## Organizar archivos por carpetas (prefijos)

```typescript
// R2 no tiene carpetas reales, usa prefijos en el key
await uploadFile('avatares/usuario-123.jpg', buffer, 'image/jpeg')
await uploadFile('documentos/2024/reporte.pdf', buffer, 'application/pdf')
await uploadFile('productos/thumbnail-456.webp', buffer, 'image/webp')
```

## ⚠️ Limitaciones importantes

- **Sin transformación de imágenes:** no tiene resize/crop automático (usar Cloudflare Images: $5/mes, o imgproxy self-hosted)
- **Sin CDN automático para buckets privados:** los buckets privados requieren Workers para servir archivos
- **Latencia inicial:** R2 no tiene edge caching automático (usar Cloudflare Cache con Workers para CDN)
