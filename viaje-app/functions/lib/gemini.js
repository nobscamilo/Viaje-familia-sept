// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Cliente de Gemini via GOOGLE AI STUDIO.
// AGENTS.md prohibe Vertex AI de forma explicita: no introducir @google-cloud/vertexai.
import { GoogleGenAI } from '@google/genai'
import { geminiModel } from './secrets.js'

export async function generateJson(schema, prompt, fallback, { maxTokens = 4096 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[generateJson] GEMINI_API_KEY is not defined in process.env')
    return fallback
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    const result = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        temperature: 0.25,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    })
    const text =
      result.text ||
      result.response?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() ||
      ''
    return JSON.parse(text.replace(/^```json|```$/g, '').trim())
  } catch (error) {
    console.error('[generateJson] Google Gen AI error:', error?.message || error)
    return {
      ...fallback,
      aiFallbackReason: error.message,
    }
  }
}

export async function generateText(systemPrompt, history = [], userMessage = '', fallback = '') {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[generateText] GEMINI_API_KEY is not defined in process.env')
    return fallback
  }

  try {
    const ai = new GoogleGenAI({ apiKey })
    
    // Map standard roles: assistant -> model
    const contents = [
      ...history.map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : turn.role,
        parts: [{ text: turn.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ]

    const result = await ai.models.generateContent({
      model: geminiModel,
      contents,
      config: {
        temperature: 0.5,
        maxOutputTokens: 1024,
        systemInstruction: systemPrompt,
      },
    })

    return (
      result.text ||
      result.response?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() ||
      fallback
    )
  } catch (error) {
    return `${fallback} (error: ${error.message})`
  }
}


// ─── buildTripWindow ─────────────────────────────────────────────────────────
// Returns a plain-text description of the fixed + free trip windows so the AI
// knows which dates are locked (main event) and which are available ("después").
