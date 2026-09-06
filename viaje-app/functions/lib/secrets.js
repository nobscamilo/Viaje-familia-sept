// Secretos del proyecto, declarados una sola vez.
// Cualquier funcion que los necesite importa de aqui y los lista en `secrets`.
import { defineSecret } from 'firebase-functions/params'

export const mapsApiKey = defineSecret('GOOGLE_MAPS_API_KEY')
export const geminiApiKey = defineSecret('GEMINI_API_KEY')

/** Modelo de Gemini. AGENTS.md prohibe Vertex AI: esto va contra AI Studio. */
export const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
