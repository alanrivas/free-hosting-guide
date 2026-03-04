---
sidebar_position: 2
title: Supabase Storage
---

# Supabase Storage

Almacenamiento de archivos integrado en Supabase. Ideal si ya usas Supabase como base de datos, ya que todo está en el mismo proyecto.

## Límites del plan gratuito

| Parámetro | Valor |
|---|---|
| Storage | **1 GB** |
| Transferencia (bandwidth) | 2 GB/mes |
| Tamaño máximo por archivo | 50 MB (free) |
| Transformación de imágenes | ✅ Incluida (resize, crop, format) |

## Crear bucket

```
Supabase Dashboard → Storage → New bucket
→ Name: avatares (o el nombre que necesites)
→ Public: ✅ si los archivos son públicos (imágenes de perfil, etc.)
           ❌ si son privados (documentos privados)
→ File size limit: en bytes (ej: 52428800 = 50 MB)
→ Allowed MIME types: image/jpeg, image/png, image/webp (opcional)
```

## Subir archivos desde JavaScript

```typescript
import { supabase } from '@/lib/supabase'

// Subir desde un input de archivo (browser)
async function subirAvatar(userId: string, file: File) {
  const extension = file.name.split('.').pop()
  const filePath = `${userId}/avatar.${extension}`

  const { data, error } = await supabase.storage
    .from('avatares')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: true  // sobreescribir si ya existe
    })

  if (error) throw error
  return data.path
}

// Subir desde buffer/base64 (Node.js)
import fs from 'fs'

const buffer = fs.readFileSync('./imagen.jpg')
const { data, error } = await supabase.storage
  .from('documentos')
  .upload('reporte-2024.pdf', buffer, {
    contentType: 'application/pdf'
  })
```

## Obtener URLs

```typescript
// URL pública (solo funciona si el bucket es público)
const { data } = supabase.storage
  .from('avatares')
  .getPublicUrl('usuario-123/avatar.jpg')

console.log(data.publicUrl)
// https://xxxx.supabase.co/storage/v1/object/public/avatares/usuario-123/avatar.jpg

// URL firmada (para archivos privados, válida por tiempo limitado)
const { data, error } = await supabase.storage
  .from('documentos')
  .createSignedUrl('reporte-privado.pdf', 3600)  // válida 1 hora

console.log(data?.signedUrl)

// Múltiples URLs firmadas
const { data } = await supabase.storage
  .from('documentos')
  .createSignedUrls(['archivo1.pdf', 'archivo2.pdf'], 3600)
```

## Transformación de imágenes (Supabase Image Transformation)

```typescript
// Redimensionar imagen automáticamente
const { data } = supabase.storage
  .from('avatares')
  .getPublicUrl('usuario-123/avatar.jpg', {
    transform: {
      width: 200,
      height: 200,
      resize: 'cover',      // cover, contain, fill
      format: 'webp',       // convertir a WebP automáticamente
      quality: 80           // calidad (1-100)
    }
  })
```

## Listar archivos

```typescript
// Listar archivos en un "directorio" (prefijo)
const { data, error } = await supabase.storage
  .from('avatares')
  .list('usuario-123/', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'created_at', order: 'desc' }
  })

data?.forEach(file => {
  console.log(file.name, file.metadata?.size)
})
```

## Eliminar archivos

```typescript
// Eliminar uno o varios archivos
const { error } = await supabase.storage
  .from('avatares')
  .remove(['usuario-123/avatar.jpg', 'usuario-456/avatar.png'])
```

## Políticas de seguridad (RLS para Storage)

```sql
-- Solo el dueño puede subir a su carpeta
CREATE POLICY "upload_propio" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatares' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Solo el dueño puede ver sus archivos (privados)
CREATE POLICY "ver_propio" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documentos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Lectura pública para el bucket de imágenes
CREATE POLICY "lectura_publica" ON storage.objects
FOR SELECT USING (bucket_id = 'publico');
```

## ⚠️ Limitaciones importantes

- **1 GB total:** se llena rápido con videos o muchas imágenes
- **2 GB bandwidth/mes:** puede ser insuficiente para apps con muchos archivos
- **50 MB por archivo:** no apto para videos largos (usar Cloudflare R2 o Backblaze B2)
- **Ligado al proyecto Supabase:** si pausas el proyecto, el storage también se pausa
