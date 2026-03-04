---
sidebar_position: 3
title: Google Gemini
---

# Google Gemini API

La API de IA de Google con el contexto más largo disponible gratuitamente (1 millón de tokens). Ideal para trabajar con documentos, imágenes, audio y videos — todo en el mismo modelo.

## Límites del plan gratuito

| Modelo | Requests/min | Requests/día | Tokens/min |
|---|---|---|---|
| **gemini-2.0-flash** | 15 | 1,500 | 1,000,000 |
| **gemini-1.5-flash** | 15 | 1,500 | 1,000,000 |
| **gemini-1.5-flash-8b** | 15 | 1,500 | 1,000,000 |
| **gemini-1.5-pro** | 2 | 50 | 32,000 |

:::tip ¿Cuál modelo elegir?
- **La mayoría de tareas**: `gemini-2.0-flash` (más nuevo, más rápido)
- **Documentos muy largos o mucho contexto**: `gemini-1.5-flash`
- **Tareas complejas con razonamiento**: `gemini-1.5-pro` (aunque solo 50 req/día gratis)
:::

## La ventaja principal: contexto de 1 millón de tokens

Para entender la magnitud:

```
1,000,000 tokens ≈
  - 750,000 palabras en inglés
  - ~1,500 páginas de texto
  - El código completo de un proyecto mediano
  - Varias horas de transcripción de audio
  - Docenas de documentos PDF
```

Casos de uso que esto habilita:
- Analizar un codebase completo y hacer preguntas sobre él
- Subir un PDF extenso y resumirlo o hacer Q&A sobre su contenido
- Analizar una conversación larga completa
- Procesar logs extensos y detectar patrones

## Obtener API Key

```
1. https://aistudio.google.com → Sign in con cuenta Google
2. "Get API key" → Create API key in new project
3. Copiar la key: AIzaSy...
```

La key es gratuita. No se necesita tarjeta de crédito para el free tier.

## Instalación

```bash
npm install @google/generative-ai
```

## Primera llamada

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const geminiFlash = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 2048,
  }
})

export const geminiPro = genAI.getGenerativeModel({
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 4096,
  }
})
```

```typescript
import { geminiFlash } from './lib/gemini'

const result = await geminiFlash.generateContent(
  '¿Qué es la programación funcional? Explícala en 3 puntos clave.'
)

console.log(result.response.text())
```

---

## Streaming

```typescript
// app/api/gemini/route.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest } from 'next/server'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const { prompt, history } = await req.json()

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  // Iniciar chat con historial previo
  const chat = model.startChat({
    history: history ?? [],
    generationConfig: {
      maxOutputTokens: 2048,
    },
  })

  const result = await chat.sendMessageStream(prompt)

  // Crear stream de respuesta
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        controller.enqueue(encoder.encode(text))
      }
      controller.close()
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
```

---

## Multimodal: analizar imágenes

Gemini puede ver y analizar imágenes. Esto es exclusivo de modelos multimodales:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import path from 'path'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

// Analizar imagen desde archivo local
async function analizarImagen(imagePath: string, pregunta: string) {
  const imageData = fs.readFileSync(imagePath)
  const base64Image = imageData.toString('base64')
  const mimeType = 'image/jpeg'  // o image/png, image/webp

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType,
      }
    },
    pregunta
  ])

  return result.response.text()
}

// Analizar imagen desde URL
async function analizarImagenURL(imageUrl: string, pregunta: string) {
  const response = await fetch(imageUrl)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64,
        mimeType: 'image/jpeg',
      }
    },
    pregunta
  ])

  return result.response.text()
}

// Casos de uso:
await analizarImagen('./factura.jpg', 'Extrae el número de factura, fecha y total')
await analizarImagen('./diagrama.png', 'Describe este diagrama de arquitectura')
await analizarImagen('./codigo-screenshot.png', 'Hay algún bug en este código?')
```

### En una API REST con upload de imagen

```typescript
// app/api/analizar-imagen/route.ts
import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const imagen = formData.get('imagen') as File
  const pregunta = formData.get('pregunta') as string

  const buffer = await imagen.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType: imagen.type } },
    pregunta || '¿Qué hay en esta imagen?'
  ])

  return Response.json({ respuesta: result.response.text() })
}
```

---

## Analizar documentos PDF (largo contexto)

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function analizarPDF(pdfPath: string, pregunta: string) {
  const pdfData = fs.readFileSync(pdfPath)
  const base64PDF = pdfData.toString('base64')

  // gemini-1.5-flash tiene contexto de 1M tokens, ideal para PDFs largos
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64PDF,
        mimeType: 'application/pdf',
      }
    },
    pregunta
  ])

  return result.response.text()
}

// Ejemplos de uso:
const contrato = await analizarPDF(
  './contrato.pdf',
  'Resume los puntos más importantes de este contrato en bullet points'
)

const reporte = await analizarPDF(
  './reporte-financiero.pdf',
  'Extrae todos los datos numéricos relevantes en formato JSON'
)

const manual = await analizarPDF(
  './manual-tecnico.pdf',
  '¿Cuáles son los pasos para instalar el software?'
)
```

---

## Generación de contenido estructurado (JSON)

```typescript
import { SchemaType } from '@google/generative-ai'

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: {
    responseMimeType: 'application/json',    // Forzar respuesta JSON
    responseSchema: {                         // Definir el schema esperado
      type: SchemaType.OBJECT,
      properties: {
        titulo: { type: SchemaType.STRING },
        resumen: { type: SchemaType.STRING },
        palabrasClave: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING }
        },
        dificultad: {
          type: SchemaType.STRING,
          enum: ['principiante', 'intermedio', 'avanzado']
        },
        tiempoLectura: { type: SchemaType.NUMBER }
      },
      required: ['titulo', 'resumen', 'palabrasClave', 'dificultad', 'tiempoLectura']
    }
  }
})

async function analizarArticulo(texto: string) {
  const result = await model.generateContent(
    `Analiza este artículo técnico y devuelve la metadata solicitada:\n\n${texto}`
  )
  return JSON.parse(result.response.text())
}

const metadata = await analizarArticulo(`
  En este tutorial aprenderemos a implementar autenticación con JWT en Node.js...
  (texto del artículo)
`)

console.log(metadata)
// {
//   titulo: "Autenticación con JWT en Node.js",
//   resumen: "...",
//   palabrasClave: ["jwt", "nodejs", "autenticacion"],
//   dificultad: "intermedio",
//   tiempoLectura: 8
// }
```

---

## Sistema de Q&A sobre tu base de datos de conocimiento

```typescript
// Un asistente que responde preguntas sobre tu documentación
async function asistenteDocs(
  pregunta: string,
  documentos: string[]
) {
  const contexto = documentos.join('\n\n---\n\n')

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',  // Contexto largo para muchos documentos
    systemInstruction: `Eres un asistente que responde preguntas basándose ÚNICAMENTE
    en los documentos proporcionados. Si la respuesta no está en los documentos,
    di claramente que no tienes esa información. Responde en español, de forma
    clara y concisa. Cita el documento fuente cuando sea posible.`
  })

  const result = await model.generateContent(
    `Documentos de referencia:\n${contexto}\n\nPregunta: ${pregunta}`
  )

  return result.response.text()
}

// Uso con tu documentación:
const docs = [
  fs.readFileSync('./docs/api-reference.md', 'utf-8'),
  fs.readFileSync('./docs/getting-started.md', 'utf-8'),
  fs.readFileSync('./docs/faq.md', 'utf-8'),
]

const respuesta = await asistenteDocs(
  '¿Cómo configuro la autenticación?',
  docs
)
```

---

## Embeddings (búsqueda semántica)

Los embeddings convierten texto en vectores numéricos que capturan el significado semántico, permitiendo búsquedas por similitud conceptual en vez de palabras exactas:

```typescript
// Obtener embedding de un texto
async function getEmbedding(texto: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(texto)
  return result.embedding.values
}

// Calcular similitud entre dos textos (cosine similarity)
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

// Sistema de búsqueda semántica simple (sin vector DB)
async function busquedaSemantica(
  query: string,
  documentos: string[]
): Promise<{ documento: string; similitud: number }[]> {
  const queryEmbedding = await getEmbedding(query)

  const resultados = await Promise.all(
    documentos.map(async (doc) => ({
      documento: doc,
      similitud: cosineSimilarity(queryEmbedding, await getEmbedding(doc))
    }))
  )

  return resultados
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, 5)  // Top 5 más relevantes
}

// Uso:
const preguntas_frecuentes = [
  'Cómo puedo cambiar mi contraseña?',
  'Dónde veo mis facturas?',
  'Cómo cancelo mi suscripción?',
  'Cuáles son los métodos de pago aceptados?',
]

const resultados = await busquedaSemantica(
  'quiero actualizar mi clave de acceso',  // Pregunta del usuario
  preguntas_frecuentes
)
// → Encuentra "Cómo puedo cambiar mi contraseña?" como más relevante
//   aunque no usa las mismas palabras
```

:::tip Embedding + Supabase pgvector
Para búsqueda semántica en producción, guarda los embeddings en Supabase con la extensión `pgvector`:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE documentos (
  id BIGSERIAL PRIMARY KEY,
  contenido TEXT,
  embedding vector(768)  -- dimensión de text-embedding-004
);
CREATE INDEX ON documentos USING ivfflat (embedding vector_cosine_ops);
```
Supabase tiene pgvector disponible en el plan gratuito.
:::

---

## Manejo de errores y cuota

```typescript
import { GoogleGenerativeAIError } from '@google/generative-ai'

async function geminiConManejo(prompt: string) {
  try {
    const result = await geminiFlash.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    if (error instanceof GoogleGenerativeAIError) {
      // 429: Rate limit
      if (error.message.includes('429')) {
        console.error('Límite de requests alcanzado. Esperar 1 minuto.')
        await new Promise(r => setTimeout(r, 60000))
        return geminiConManejo(prompt)  // Reintentar
      }

      // 400: Contenido bloqueado por safety filters
      if (error.message.includes('SAFETY')) {
        return 'No puedo responder a esa pregunta.'
      }

      // 503: Modelo no disponible
      if (error.message.includes('503')) {
        console.error('Modelo temporalmente no disponible. Intentar más tarde.')
      }
    }
    throw error
  }
}
```

---

## Comparativa: Groq vs Gemini

| | Groq | Gemini |
|---|---|---|
| **Velocidad** | Ultra-rápida (LPU) | Rápida |
| **Contexto** | 128k tokens | 1M tokens |
| **Multimodal** | Solo texto | Texto + imagen + PDF + audio |
| **Modelo open source** | Sí (LLaMA, Mixtral) | No (propietario) |
| **JSON mode** | Sí | Sí (con schema) |
| **Streaming** | Sí | Sí |
| **Embeddings** | No | Sí (text-embedding-004) |
| **Req/día gratis** | 14,400 | 1,500 |
| **Mejor para** | Chatbots rápidos, clasificación | Documentos, imágenes, largo contexto |

**Recomendación:** usa **Groq** para la mayoría de tareas de texto por su velocidad y límite más generoso; usa **Gemini** cuando necesites analizar imágenes, PDFs o contextos muy largos.

## ⚠️ Limitaciones importantes

- **1,500 req/día** es significativamente menor que Groq: ideal para uso personal o prototipos con pocos usuarios
- **15 req/min** en el free tier: para apps con múltiples usuarios simultáneos implementar rate limiting propio
- **Contexto de 1M tokens** es el límite técnico, pero en el tier gratuito puede haber restricciones prácticas de velocidad
- **Sin SLA en el free tier**: los tiempos de respuesta pueden variar, no apto para producción crítica
- **Embeddings tienen cuota separada**: monitorear el uso de `text-embedding-004` si se usa para búsqueda semántica
- **Sin fine-tuning gratuito**: el ajuste fino de Gemini es solo en planes de pago
- **Datos de entrenamiento**: revisar los términos de uso — en el tier gratuito Google puede usar las interacciones para mejorar modelos
