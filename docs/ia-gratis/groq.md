---
sidebar_position: 2
title: Groq
---

# Groq

Groq no es solo una API de IA — es la API de inferencia **más rápida del mundo** gracias a su hardware especializado (LPU - Language Processing Unit). Ofrece modelos open source de alta calidad completamente gratis.

## Límites del plan gratuito

| Modelo | Requests/día | Tokens/min | Tokens/día |
|---|---|---|---|
| **llama-3.3-70b-versatile** | 14,400 | 12,000 | 100,000 |
| **llama-3.1-8b-instant** | 14,400 | 20,000 | 500,000 |
| **mixtral-8x7b-32768** | 14,400 | 5,000 | 500,000 |
| **gemma2-9b-it** | 14,400 | 15,000 | 500,000 |
| **llama-3.2-11b-vision-preview** | 7,000 | 7,000 | 500,000 |

:::tip ¿Cuál modelo elegir?
- **Tareas complejas** (razonamiento, código complejo): `llama-3.3-70b-versatile`
- **Respuestas rápidas** (chatbot en tiempo real): `llama-3.1-8b-instant`
- **Equilibrio velocidad/calidad**: `gemma2-9b-it`
:::

## Obtener API Key

```
1. https://console.groq.com → Sign up (gratis)
2. API Keys → Create API Key
3. Copiar la key: gsk_xxxxxxxxxxxxxxxxxxxxxxxxx
```

## Instalación

```bash
# SDK oficial de Groq (compatible con OpenAI SDK)
npm install groq-sdk

# También compatible con el SDK de OpenAI:
npm install openai
```

## Primera llamada

```typescript
// lib/groq.ts
import Groq from 'groq-sdk'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})
```

```typescript
import { groq } from './lib/groq'

const respuesta = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [
    {
      role: 'system',
      content: 'Eres un asistente de programación experto. Responde siempre en español.'
    },
    {
      role: 'user',
      content: '¿Cuál es la diferencia entre == y === en JavaScript?'
    }
  ],
  temperature: 0.3,
  max_tokens: 500,
})

console.log(respuesta.choices[0].message.content)
```

---

## Streaming (respuesta en tiempo real)

El streaming es esencial para una buena UX en chatbots. El texto aparece mientras se genera:

```typescript
// API Route en Next.js (App Router)
// app/api/chat/route.ts
import { groq } from '@/lib/groq'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

  const stream = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',   // Modelo rápido para streaming
    messages: [
      {
        role: 'system',
        content: 'Eres un asistente útil. Responde en español.'
      },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 1024,
    stream: true,                     // ← Activar streaming
  })

  // Crear un ReadableStream para enviar al cliente
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) {
          controller.enqueue(encoder.encode(text))
        }
      }
      controller.close()
    }
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }
  })
}
```

```tsx
// components/Chat.tsx - Frontend con streaming
'use client'
import { useState, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Agregar mensaje vacío del asistente que se irá llenando
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        // Actualizar el último mensaje del asistente progresivamente
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + text
          }
          return updated
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-xs'
                : 'bg-gray-100 mr-auto max-w-lg'
            }`}
          >
            {msg.content}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="bg-gray-100 p-3 rounded-lg w-16 animate-pulse">...</div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe un mensaje..."
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
```

---

## Conversaciones con historial

Para que el modelo recuerde el contexto de la conversación, hay que enviar todos los mensajes anteriores:

```typescript
// lib/conversation.ts
import { groq } from './groq'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

class Conversation {
  private messages: Message[] = []

  constructor(private systemPrompt: string) {
    this.messages.push({ role: 'system', content: systemPrompt })
  }

  async chat(userMessage: string): Promise<string> {
    this.messages.push({ role: 'user', content: userMessage })

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: this.messages,
      temperature: 0.7,
      max_tokens: 1024,
    })

    const assistantMessage = response.choices[0].message.content ?? ''
    this.messages.push({ role: 'assistant', content: assistantMessage })

    return assistantMessage
  }

  clearHistory() {
    this.messages = [this.messages[0]]  // Conservar solo el system prompt
  }

  getHistory() {
    return this.messages.slice(1)  // Sin el system prompt
  }
}

// Uso:
const conv = new Conversation('Eres un tutor de programación. Explica conceptos de forma simple.')
console.log(await conv.chat('¿Qué es una promesa en JavaScript?'))
console.log(await conv.chat('¿Y cómo se diferencia de async/await?'))
console.log(await conv.chat('Dame un ejemplo práctico'))
```

---

## Análisis de código

```typescript
// Usar Groq para revisar tu propio código
async function revisarCodigo(codigo: string, lenguaje: string) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Eres un code reviewer experto. Analiza el código que te muestren y:
1. Identifica bugs o problemas potenciales
2. Sugiere mejoras de rendimiento
3. Señala problemas de seguridad si los hay
4. Comenta sobre la legibilidad del código
Sé específico y conciso. Responde en español.`
      },
      {
        role: 'user',
        content: `Revisa este código en ${lenguaje}:\n\n\`\`\`${lenguaje}\n${codigo}\n\`\`\``
      }
    ],
    temperature: 0.2,   // Baja temperatura para análisis objetivo
    max_tokens: 1000,
  })

  return response.choices[0].message.content
}

// Uso:
const codigo = `
async function getUser(id) {
  const result = await db.query("SELECT * FROM users WHERE id = " + id)
  return result[0]
}
`

const revision = await revisarCodigo(codigo, 'javascript')
console.log(revision)
// → "⚠️ SQL Injection: La query concatena directamente el parámetro id..."
```

---

## Extracción de datos estructurados (JSON)

Una de las aplicaciones más útiles: extraer datos estructurados de texto sin formato:

```typescript
async function extraerDatosContacto(texto: string) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `Extrae información de contacto del texto y devuelve SOLO un JSON válido con esta estructura exacta:
{
  "nombre": string | null,
  "email": string | null,
  "telefono": string | null,
  "empresa": string | null
}
No incluyas texto adicional, solo el JSON.`
      },
      {
        role: 'user',
        content: texto
      }
    ],
    temperature: 0,   // Determinista para extracción de datos
    max_tokens: 200,
    response_format: { type: 'json_object' },   // Forzar respuesta JSON
  })

  return JSON.parse(response.choices[0].message.content ?? '{}')
}

// Uso:
const datos = await extraerDatosContacto(`
  Hola, soy María García de TechStartup S.A.
  Pueden contactarme en maria.garcia@techstartup.com
  o al +54 11 1234-5678
`)

console.log(datos)
// { nombre: "María García", email: "maria.garcia@techstartup.com", ... }
```

---

## Clasificación y moderación de contenido

```typescript
type Categoria = 'pregunta_tecnica' | 'queja' | 'elogio' | 'solicitud_feature' | 'otro'
type Sentimiento = 'positivo' | 'negativo' | 'neutro'

async function clasificarMensaje(mensaje: string): Promise<{
  categoria: Categoria
  sentimiento: Sentimiento
  urgente: boolean
  resumen: string
}> {
  const response = await groq.chat.completions.create({
    model: 'gemma2-9b-it',    // Modelo más rápido para clasificación
    messages: [
      {
        role: 'system',
        content: `Clasifica el mensaje del usuario y responde SOLO con JSON:
{
  "categoria": "pregunta_tecnica" | "queja" | "elogio" | "solicitud_feature" | "otro",
  "sentimiento": "positivo" | "negativo" | "neutro",
  "urgente": boolean,
  "resumen": "máximo 20 palabras"
}`
      },
      { role: 'user', content: mensaje }
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  })

  return JSON.parse(response.choices[0].message.content ?? '{}')
}

// Uso en un sistema de soporte:
const resultado = await clasificarMensaje(
  "Llevo 3 días sin poder acceder a mi cuenta y nadie me responde, esto es inaceptable"
)
// { categoria: 'queja', sentimiento: 'negativo', urgente: true, resumen: '...' }

if (resultado.urgente && resultado.sentimiento === 'negativo') {
  // → Notificar al equipo de soporte inmediatamente
}
```

---

## Rate limiting y manejo de errores

```typescript
import Groq from 'groq-sdk'
import { RateLimitError } from 'groq-sdk'

async function llamarGroqConRetry(
  messages: any[],
  maxReintentos = 3
): Promise<string> {
  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: 500,
      })
      return response.choices[0].message.content ?? ''

    } catch (error) {
      if (error instanceof RateLimitError) {
        if (intento === maxReintentos) throw error
        // Esperar antes de reintentar (backoff exponencial)
        const espera = Math.pow(2, intento) * 1000   // 2s, 4s, 8s...
        console.log(`Rate limit alcanzado. Esperando ${espera/1000}s...`)
        await new Promise(resolve => setTimeout(resolve, espera))
      } else {
        throw error
      }
    }
  }
  throw new Error('Máximo de reintentos alcanzado')
}
```

---

## Compatibilidad con OpenAI SDK

Groq es compatible con la API de OpenAI, por lo que puedes usar el SDK de OpenAI apuntando a Groq:

```typescript
import OpenAI from 'openai'

// Usar Groq con el SDK de OpenAI
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

// La sintaxis es idéntica
const response = await client.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'Hola' }],
})
```

Esto es útil si quieres poder cambiar fácilmente entre OpenAI, Groq y otros proveedores sin cambiar el código.

---

## ⚠️ Buenas prácticas

- **Nunca pongas la API key en el cliente/frontend** — solo en el servidor o variables de entorno
- **Usa la temperatura más baja posible** para tareas de análisis/extracción
- **Limita `max_tokens`** para controlar velocidad y evitar respuestas infinitas
- **Cachea respuestas repetitivas** con Redis/Upstash para no gastar cuota innecesariamente
- **El modelo 8B** es suficiente para la mayoría de tareas, usa el 70B solo cuando necesitas más razonamiento

## ⚠️ Limitaciones importantes

- **14,400 req/día** puede sonar mucho, pero con múltiples usuarios se agota: implementar caché y rate limiting propio
- **12,000 tokens/min** para el modelo 70B: en chats con contexto largo o muchos usuarios simultáneos hay que gestionar la cuota
- **No hay persistencia de conversaciones** en Groq: el historial debe manejarse en tu propio código/DB
- **Sin multimodal en el free tier**: Groq solo procesa texto (para imágenes usar Gemini)
- **Modelos open source ≠ GPT-4**: para tareas muy complejas de razonamiento, el 70B puede ser inferior a modelos propietarios
- **Sin fine-tuning gratuito**: no puedes entrenar el modelo con tus datos
