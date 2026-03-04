---
sidebar_position: 4
---

# 🤖 Proyecto 3: App con IA Integrada

:::info
**Dificultad:** ⭐⭐⭐ Alta | **Tiempo:** 4-5 horas | **Servicios:** Next.js, Groq, Neon, Vercel
:::

## Qué vas a construir

Un **asistente de conocimiento personal**: los usuarios guardan notas y documentos, y luego pueden hacerle preguntas a una IA que responde basándose **únicamente** en el contenido guardado usando búsqueda semántica (RAG).

```
Arquitectura:

Usuario escribe pregunta
       ↓
Next.js (Vercel)
       ↓
Gemini API ──→ Embedding de la pregunta
       ↓
Neon + pgvector ──→ Documentos similares
       ↓
Groq (LLaMA) ──→ Respuesta con contexto
       ↓
Streaming al navegador
```

## Lo que vas a aprender

- **Embeddings** — representar texto como vectores numéricos
- **Búsqueda vectorial** con `pgvector` en Neon
- **RAG** (Retrieval Augmented Generation) — técnica para reducir alucinaciones
- **Streaming de respuestas** con Groq y el SDK `ai`
- **Server Actions** de Next.js para lógica del lado servidor
- **Groq API** — inferencia LLM ultrarrápida y gratuita

## Paso 1: Crear el proyecto

```bash
npx create-next-app@latest asistente-ia --typescript --tailwind --app
cd asistente-ia
npm install groq-sdk @neondatabase/serverless ai
npm install @google/generative-ai
```

## Paso 2: Activar pgvector en Neon

En el **SQL Editor de Neon**, ejecuta:

```sql
-- Activar extensión pgvector
create extension if not exists vector;

-- Tabla de documentos con embeddings
create table documentos (
  id serial primary key,
  titulo text not null,
  contenido text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

-- Índice para búsqueda semántica eficiente
create index on documentos using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
```

:::info
**pgvector está disponible en el plan gratuito de Neon.** La extensión permite guardar vectores de hasta 2000 dimensiones y realizar búsquedas por similitud coseno, producto punto o distancia euclidiana. Usamos 768 dimensiones porque es lo que devuelve el modelo `text-embedding-004` de Google.
:::

## Paso 3: Generar embeddings

Crea `lib/embeddings.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function generarEmbedding(texto: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(texto)
  return result.embedding.values
}
```

:::tip
El modelo `text-embedding-004` de Google es **gratuito** con la API de Gemini (hasta 1500 requests/minuto en el plan free). Perfecto para proyectos de aprendizaje.
:::

## Paso 4: Guardar documentos con embeddings

Crea `app/actions/documentos.ts` como Server Action de Next.js:

```typescript
'use server'
import { neon } from '@neondatabase/serverless'
import { generarEmbedding } from '@/lib/embeddings'

const sql = neon(process.env.DATABASE_URL!)

export async function guardarDocumento(titulo: string, contenido: string) {
  const embedding = await generarEmbedding(contenido)
  
  const [doc] = await sql`
    insert into documentos (titulo, contenido, embedding)
    values (${titulo}, ${contenido}, ${JSON.stringify(embedding)}::vector)
    returning id, titulo, created_at
  `
  return doc
}

export async function buscarDocumentos(query: string, limite = 3) {
  const queryEmbedding = await generarEmbedding(query)
  
  const docs = await sql`
    select id, titulo, contenido,
           1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similitud
    from documentos
    where 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > 0.7
    order by similitud desc
    limit ${limite}
  `
  return docs
}

export async function listarDocumentos() {
  return await sql`
    select id, titulo, created_at
    from documentos
    order by created_at desc
    limit 20
  `
}
```

:::info
El operador `<=>` calcula la **distancia coseno** entre vectores. Un valor de `1 - distancia > 0.7` significa más del 70% de similitud semántica, lo que es un umbral razonable para resultados relevantes.
:::

## Paso 5: Chat con contexto (RAG)

Crea `app/actions/chat.ts`:

```typescript
'use server'
import Groq from 'groq-sdk'
import { buscarDocumentos } from './documentos'
import { createStreamableValue } from 'ai/rsc'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function chatConContexto(pregunta: string) {
  const stream = createStreamableValue('')
  
  ;(async () => {
    // 1. Buscar documentos relevantes
    const docs = await buscarDocumentos(pregunta)
    
    // 2. Construir contexto con los documentos encontrados
    const contexto = docs
      .map((d: any) => `[${d.titulo}]\n${d.contenido}`)
      .join('\n\n---\n\n')
    
    // 3. Llamar a Groq con el contexto como parte del prompt
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que responde preguntas basándose ÚNICAMENTE en los documentos proporcionados.
Si la información no está en los documentos, di "No tengo información sobre eso en mis documentos."

Documentos disponibles:
${contexto || 'No hay documentos guardados todavía.'}`,
        },
        { role: 'user', content: pregunta },
      ],
      stream: true,
      max_tokens: 500,
    })
    
    // 4. Transmitir la respuesta en streaming
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content || ''
      stream.update(delta)
    }
    
    stream.done()
  })()
  
  return { output: stream.value }
}
```

## Paso 6: Interfaz de usuario

Crea `app/page.tsx` con dos secciones: guardar documentos y chatear:

```typescript
'use client'
import { useState } from 'react'
import { useStreamableValue } from 'ai/rsc'
import { guardarDocumento } from './actions/documentos'
import { chatConContexto } from './actions/chat'

export default function Home() {
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [pregunta, setPregunta] = useState('')
  const [streamValue, setStreamValue] = useState<any>(null)
  const [respuesta] = useStreamableValue(streamValue)
  const [guardando, setGuardando] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    await guardarDocumento(titulo, contenido)
    setTitulo('')
    setContenido('')
    setMensajeExito('¡Documento guardado!')
    setGuardando(false)
    setTimeout(() => setMensajeExito(''), 3000)
  }

  const handlePreguntar = async (e: React.FormEvent) => {
    e.preventDefault()
    const { output } = await chatConContexto(pregunta)
    setStreamValue(output)
  }

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-12">
      <h1 className="text-3xl font-bold">🤖 Asistente de Conocimiento</h1>

      {/* Sección: Guardar documentos */}
      <section className="border rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">📄 Agregar documento</h2>
        <form onSubmit={handleGuardar} className="space-y-3">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título del documento"
            required
            className="w-full border rounded-lg px-3 py-2"
          />
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            placeholder="Contenido del documento..."
            required
            rows={5}
            className="w-full border rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            disabled={guardando}
            className="bg-green-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar documento'}
          </button>
          {mensajeExito && <p className="text-green-600">{mensajeExito}</p>}
        </form>
      </section>

      {/* Sección: Chat con IA */}
      <section className="border rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">💬 Pregúntale a la IA</h2>
        <form onSubmit={handlePreguntar} className="flex gap-2">
          <input
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder="¿Qué quieres saber?"
            required
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg"
          >
            Preguntar
          </button>
        </form>
        {respuesta && (
          <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap">
            {respuesta}
          </div>
        )}
      </section>
    </main>
  )
}
```

## Paso 7: Variables de entorno y deploy

Crea `.env.local`:

```
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
```

Para obtener las claves:
- **Groq:** [console.groq.com](https://console.groq.com) → API Keys
- **Gemini:** [aistudio.google.com](https://aistudio.google.com) → Get API Key
- **Neon:** panel de tu proyecto → Connection Details

Para deploy en Vercel:

```bash
vercel
# Configurar las mismas variables de entorno en el dashboard de Vercel
```

## Cómo funciona el RAG

**RAG (Retrieval Augmented Generation)** es una técnica que combina búsqueda de información con generación de texto:

```
Pregunta del usuario
       ↓
Convertir pregunta → embedding (Gemini text-embedding-004)
       ↓
Buscar documentos similares en Neon (pgvector, similitud coseno)
       ↓
Construir prompt con contexto relevante
       ↓
Enviar a Groq (LLaMA 3.1 8B) → respuesta en streaming
       ↓
Mostrar respuesta al usuario en tiempo real
```

:::info
**¿Por qué RAG?** Los LLMs pueden "alucinar" — inventar información que suena plausible pero es falsa. Al pasarle el contexto relevante directamente en el prompt y pedirle que solo responda con esa información, reducimos drásticamente las alucinaciones. El modelo actúa como un "lector inteligente" de tus documentos.
:::

## Tabla de modelos disponibles en Groq (free tier)

| Modelo | Velocidad | Contexto | Mejor para |
|---|---|---|---|
| `llama-3.1-8b-instant` | ⚡⚡⚡ Muy rápido | 128K tokens | Respuestas rápidas, chat |
| `llama-3.1-70b-versatile` | ⚡⚡ Rápido | 128K tokens | Respuestas más elaboradas |
| `mixtral-8x7b-32768` | ⚡⚡ Rápido | 32K tokens | Razonamiento, código |
| `gemma2-9b-it` | ⚡⚡⚡ Muy rápido | 8K tokens | Tareas simples |

## ✅ Checklist de verificación

- [ ] `pgvector` activo en Neon (ejecutar `create extension vector` sin errores)
- [ ] Documentos se guardan con embeddings (verificar en Neon que la columna `embedding` tiene datos)
- [ ] Búsqueda semántica devuelve resultados relevantes (probar con queries relacionados)
- [ ] El chat cita solo información de los documentos guardados
- [ ] Preguntar sobre un tema no guardado devuelve "No tengo información..."
- [ ] Respuestas llegan en streaming (el texto aparece letra por letra)
- [ ] Deploy en Vercel funcionando con las 3 variables de entorno
