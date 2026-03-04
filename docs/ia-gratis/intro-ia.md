---
sidebar_position: 1
title: IA Gratuita para Devs
---

# 🤖 APIs de Inteligencia Artificial Gratuitas

El acceso a modelos de IA de calidad ya no requiere pagar. Hoy existen varias opciones completamente gratuitas que te permiten integrar LLMs en tus proyectos de práctica y aprendizaje.

---

## ¿Qué es un LLM y por qué importa?

Un **LLM** (Large Language Model) es un modelo de inteligencia artificial capaz de:
- Generar texto coherente y contextual
- Responder preguntas complejas
- Analizar y resumir documentos
- Generar y revisar código
- Traducir idiomas
- Clasificar y estructurar información

Integrar un LLM en tu app te permite crear funcionalidades que antes requerían equipos especializados: chatbots, asistentes, búsqueda semántica, generación de contenido, análisis de datos, etc.

---

## El ecosistema de IA gratuita

```
┌─────────────────────────────────────────────────────────────────┐
│                   OPCIONES GRATUITAS                            │
│                                                                 │
│  GROQ          → Inferencia ultra-rápida de modelos open source │
│                  (LLaMA 3, Mixtral, Gemma)                      │
│                                                                 │
│  Google Gemini → Modelos de Google, generoso free tier          │
│                  (gemini-1.5-flash, gemini-2.0-flash)           │
│                                                                 │
│  Hugging Face  → Inferencia de modelos open source              │
│                  (miles de modelos disponibles)                 │
│                                                                 │
│  OpenRouter    → Acceso unificado a múltiples modelos           │
│                  (algunos modelos son gratuitos)                │
│                                                                 │
│  Ollama        → Correr modelos LOCAL (en tu máquina)           │
│                  100% privado, sin límites, sin internet         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comparativa de servicios gratuitos

| Servicio | Modelos | Límite free | Velocidad | Mejor para |
|---|---|---|---|---|
| **Groq** | LLaMA 3.3 70B, Mixtral, Gemma 2 | 14,400 req/día | Ultra rápida | Prototipos, chatbots |
| **Google Gemini** | Gemini 1.5 Flash, 2.0 Flash | 1,500 req/día | Rápida | Multimodal, largo contexto |
| **Hugging Face** | Miles de modelos | 1,000 req/día | Media | Modelos especializados |
| **OpenRouter** | Claude, LLaMA, Gemini, etc. | Modelos gratis incluidos | Varía | Multi-modelo |
| **Ollama** | LLaMA 3, Mistral, Phi, Qwen | Sin límite (local) | Depende del hardware | Privacidad |

---

## Conceptos clave de los LLMs

### Tokens

Los LLMs no procesan palabras sino **tokens** (trozos de texto):
- 1 token ≈ 4 caracteres en inglés / 3 en español
- 1,000 tokens ≈ 750 palabras
- Los límites de las APIs se expresan en **tokens por minuto (TPM)** o por día

### Context Window (ventana de contexto)

La cantidad máxima de texto que el modelo puede procesar en una llamada:

| Modelo | Context Window |
|---|---|
| Gemini 1.5 Flash | 1,000,000 tokens (~750,000 palabras) |
| Gemini 2.0 Flash | 1,000,000 tokens |
| LLaMA 3.3 70B (Groq) | 128,000 tokens |
| Mixtral 8x7B (Groq) | 32,000 tokens |

### Temperature

Controla la "creatividad" de las respuestas:

| Valor | Comportamiento | Uso recomendado |
|---|---|---|
| `0.0` | Determinista, siempre igual | Código, análisis, tareas exactas |
| `0.3 - 0.7` | Balance | Asistentes conversacionales |
| `1.0+` | Creativo y variado | Escritura creativa, brainstorming |

### System prompt vs User prompt

```
System prompt → instrucciones permanentes al modelo
  "Eres un asistente experto en TypeScript. Sé conciso y preciso."

User prompt → pregunta o tarea del usuario
  "¿Cómo filtro un array y devuelvo solo los mayores a 10?"

Assistant response → respuesta del modelo
  "const mayores = numeros.filter(n => n > 10)"
```

### Streaming

En vez de esperar la respuesta completa, el modelo envía el texto **token a token** mientras lo genera. Fundamental para UIs de chat donde quieres que el texto aparezca progresivamente.

---

## Proyectos que puedes construir gratis

| Proyecto | Servicios necesarios | Dificultad |
|---|---|---|
| Chatbot básico | Groq o Gemini + cualquier frontend | Principiante |
| Asistente con contexto de DB | Groq + Neon/Supabase | Intermedio |
| Analizador de documentos (PDF) | Gemini (largo contexto) + Supabase Storage | Intermedio |
| Generador de código con tests | Groq (LLaMA 70B) | Intermedio |
| Buscador semántico | Hugging Face (embeddings) + Supabase pgvector | Avanzado |
| App de traducción | Groq o Gemini | Principiante |
| Clasificador de contenido | Groq | Intermedio |
| Resumen de artículos | Gemini + Cloudflare Workers | Intermedio |

En las siguientes páginas veremos **Groq** y **Google Gemini** en detalle con ejemplos completos.
