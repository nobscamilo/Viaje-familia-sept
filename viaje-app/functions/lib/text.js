// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Utilidades puras de texto y saneado de entrada. Sin dependencias.

export function cleanText(value, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, 4000)
}

// Antes: `fallback = madridF1TripId`. La app nueva no tiene ningun viaje
// cableado por defecto, asi que el fallback es explicito o vacio.
export function cleanTripId(value, fallback = '') {
  const tripId = cleanText(value, fallback)
  return tripId.replaceAll('/', '-')
}

export function cleanJoinCode(value) {
  return cleanText(value).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 24)
}

export function cleanUrl(value) {
  const url = cleanText(value)
  if (!url) return ''

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Propuesta familiar'
  }
}

export function slug(value) {
  return cleanText(value, 'opcion')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export function cityKey(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

// `destinationForCity` vivia aqui y usaba dos constantes que no existian en
// este modulo (`cityCenters`, `ifemaCoords`). Se ha movido a maps.js, que es
// donde vive la geografia y donde esas constantes si estan definidas.

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min))
}

/** Cuantas sugerencias pedir. Minimo util 5, tope 50 para no dispararse. */
const suggestionResultLimit = 5
const maxSuggestionResultLimit = 50

export function cleanSuggestionLimit(value) {
  return clamp(
    Math.round(Number(value) || suggestionResultLimit),
    suggestionResultLimit,
    maxSuggestionResultLimit,
  )
}

export function cleanNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

export function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)]),
  )
}
