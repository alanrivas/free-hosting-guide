---
sidebar_position: 3
title: Backblaze B2
---

# Backblaze B2

Almacenamiento de objetos compatible con S3, con **10 GB gratis permanentes**. Muy económico si necesitas escalar (solo $6/TB/mes).

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Storage | **10 GB** |
| Descargas (egress) | 1 GB/día **gratis** |
| Egress hacia Cloudflare | **GRATIS** (Bandwidth Alliance) ✅ |
| Compatible con API S3 | ✅ |
| Operaciones | Ilimitadas (con límites diarios generosos) |

:::tip Truco: egress gratis con Cloudflare
Si sirves los archivos de B2 a través de **Cloudflare** (como proxy), el egress es **completamente gratis** gracias a la Bandwidth Alliance entre ambas empresas.
:::

## Crear cuenta y bucket

```
1. https://www.backblaze.com/b2/cloud-storage.html → Sign Up Free
2. Account → Buckets → Create a Bucket
3. Configurar:
   - Bucket Unique Name: mis-archivos-publicos
   - Files in Bucket are: Public (para archivos públicos)
   - Default Encryption: Enable (recomendado)
4. Create Bucket
```

## Crear Application Key

```
Account → App Keys → Add a New Application Key
→ Name of Key: mi-app-key
→ Allow access to Bucket: mis-archivos-publicos (o All)
→ Type of Access: Read and Write
→ Copiar:
   - keyID (es el Access Key ID)
   - applicationKey (es el Secret, solo se muestra una vez)
```

## Conectar con AWS SDK (S3-compatible)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const B2 = new S3Client({
  endpoint: 'https://s3.us-west-004.backblazeb2.com',  // varía según región del bucket
  region: 'us-west-004',  // varía según región
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APPLICATION_KEY!,
  },
})

const BUCKET = 'mis-archivos-publicos'

// Subir archivo
async function upload(key: string, body: Buffer, contentType: string) {
  await B2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))

  // URL pública (si el bucket es público)
  return `https://f004.backblazeb2.com/file/${BUCKET}/${key}`
}

// Descargar archivo
async function download(key: string) {
  const result = await B2.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }))
  return result.Body
}

// URL firmada para upload directo (presigned URL)
async function presignedUpload(key: string, contentType: string) {
  return getSignedUrl(
    B2,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 3600 }
  )
}

// Listar archivos
async function listFiles(prefix?: string) {
  const result = await B2.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: prefix,
    MaxKeys: 100,
  }))
  return result.Contents ?? []
}

// Eliminar
async function deleteFile(key: string) {
  await B2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
```

## Obtener el endpoint de tu bucket

```
Backblaze Dashboard → Buckets → tu bucket → Bucket Settings
→ Endpoint: s3.us-west-004.backblazeb2.com  ← usar esto
→ S3 Endpoint: https://s3.us-west-004.backblazeb2.com
```

## Configurar Cloudflare como proxy (egress gratis)

1. Agregar tu dominio a Cloudflare (plan free)
2. Crear un CNAME en Cloudflare:
```
CNAME  archivos  →  f004.backblazeb2.com  (Proxy: ✅ Orange cloud)
```
3. Crear una **Transform Rule** en Cloudflare:
```
Rewrite URL: 
  If: hostname equals archivos.tu-dominio.com
  Path rewrite: /file/NOMBRE-BUCKET/ + request path
```

Ahora tus archivos se sirven desde `https://archivos.tu-dominio.com/imagen.jpg` sin costo de egress.

## ⚠️ Limitaciones importantes

- **1 GB/día de descarga gratis** sin Cloudflare
- **Interfaz menos moderna** que Cloudflare R2 o Supabase
- **Configurar correctamente el endpoint:** varía según la región del bucket
- **No tiene Workers/Edge Functions:** solo almacenamiento puro
