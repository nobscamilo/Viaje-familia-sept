// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Inferencia de precios: maneja formato europeo (1.234,56), datos estructurados
// LD-JSON y parametros de URL de Booking. Es la pieza mas valiosa del proyecto
// viejo: resuelve un problema real y esta probada contra plataformas opacas.
import { cleanNumber, cleanText, hostname } from './text.js'
import { parseTripDates } from './dates.js'

export function normalizePriceNumber(value) {
  const raw = cleanText(value)
    .replace(/[^\d.,\s]/g, '')
    .replace(/\s+/g, '')
  if (!raw) return null

  const hasComma = raw.includes(',')
  const hasDot = raw.includes('.')
  let normalized = raw

  if (hasComma && hasDot) {
    normalized = raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,/g, '')
  } else if (hasComma) {
    normalized = raw.replace(',', '.')
  } else if (hasDot && /\.\d{3}(\D|$)/.test(raw)) {
    normalized = raw.replace(/\./g, '')
  }

  const price = Number(normalized)
  if (!Number.isFinite(price) || price <= 0) return null
  // El proyecto viejo hacia `Math.round(price)` y perdia los centimos. Para
  // comparar opciones daba igual; para repartir gastos no: el apartamento de
  // Madrid cuesta 3.058,74 EUR y esa cifra tiene que cuadrar al centimo.
  // Redondear es decision de quien muestra el numero, no de quien lo parsea.
  return Math.round(price * 100) / 100
}

export function extractPriceCandidates(text) {
  const source = cleanText(text).replace(/\s+/g, ' ')
  const patterns = [
    /(?:€|eur|euros?)\s*(\d{1,3}(?:[.\s]\d{3})+|\d{2,6})(?:[,.]\d{2})?/gi,
    /(\d{1,3}(?:[.\s]\d{3})+|\d{2,6})(?:[,.]\d{2})?\s*(?:€|eur|euros?)/gi,
  ]
  const prices = patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => normalizePriceNumber(match[1])),
  )

  return [...new Set(prices.filter(Boolean))].slice(0, 10)
}

export function collectStructuredPrices(value, results = []) {
  if (results.length >= 20 || value === null || value === undefined) return results

  if (Array.isArray(value)) {
    value.forEach((item) => collectStructuredPrices(item, results))
    return results
  }

  if (typeof value !== 'object') return results

  Object.entries(value).forEach(([key, item]) => {
    const priceKey = /price|amount|cost|fare|rate/i.test(key)

    if (priceKey && (typeof item === 'string' || typeof item === 'number')) {
      const direct = normalizePriceNumber(String(item))
      if (direct && direct >= 20 && direct <= 100000) {
        results.push(direct)
      }
      results.push(...extractPriceCandidates(String(item)))
      return
    }

    collectStructuredPrices(item, results)
  })

  return results
}

export function isOpaqueTravelPlatform(url) {
  const raw = cleanText(url)
  const host = (raw.includes('://') ? hostname(raw) : raw).toLowerCase()
  return [
    'airbnb.',
    'booking.',
    'expedia.',
    'google.',
    'hotels.',
    'kayak.',
    'omio.',
    'skyscanner.',
    'travel.google',
    'trivago.',
    'vrbo.',
  ].some((pattern) => host.includes(pattern))
}

export function extractUrlPriceCandidates(url) {
  try {
    const parsed = new URL(cleanText(url))
    const bookingPriceBlocks = parsed.searchParams.getAll('sr_pri_blocks').join('_')
    const bookingMatches = [...bookingPriceBlocks.matchAll(/__(\d{4,})/g)]
      .map((match) => Math.round(Number(match[1]) / 100))
      .filter((value) => Number.isFinite(value) && value >= 20 && value <= 100000)

    return [...new Set(bookingMatches)].slice(0, 5)
  } catch {
    return []
  }
}

export function inferNights(dates) {
  const parsed = parseTripDates(dates)
  if (!parsed.checkin || !parsed.checkout) return 4

  const start = new Date(`${parsed.checkin}T00:00:00Z`)
  const end = new Date(`${parsed.checkout}T00:00:00Z`)
  const nights = Math.round((end - start) / 86_400_000)
  return nights > 0 && nights < 60 ? nights : 4
}

export function inferPrices(input, metadata = {}) {
  const explicitTotal = cleanNumber(input.priceTotal)
  const explicitNight = cleanNumber(input.priceNight)
  if (explicitTotal || explicitNight) {
    return {
      priceTotal: explicitTotal || null,
      priceNight: explicitNight || (explicitTotal ? Math.round(explicitTotal / inferNights(input.dates)) : null),
      confidence: 'manual',
    }
  }

  const opaquePlatform = isOpaqueTravelPlatform(input.url || metadata.host || metadata.siteName)
  const urlCandidates = extractUrlPriceCandidates(input.url)
  const manualTextCandidates = extractPriceCandidates(`${input.title} ${input.notes}`)
  const structuredCandidates = metadata.structuredPriceCandidates || []
  const candidates = [
    ...urlCandidates,
    ...structuredCandidates,
    ...(opaquePlatform ? [] : metadata.priceCandidates || []),
    ...manualTextCandidates,
  ].filter(Boolean)
  if (!candidates.length) {
    return { priceTotal: null, priceNight: null, confidence: 'missing' }
  }

  const nights = inferNights(input.dates)
  const sorted = [...new Set(candidates)].sort((a, b) => a - b)
  const highest = sorted[sorted.length - 1]
  const lowest = sorted[0]

  if (input.category === 'lodging') {
    const likelyTotal = highest >= 900 ? highest : null
    const likelyNight = likelyTotal ? Math.round(likelyTotal / nights) : lowest
    return {
      priceTotal: likelyTotal || Math.round(likelyNight * nights),
      priceNight: likelyNight,
      confidence: likelyTotal ? 'detected-total' : 'detected-night',
    }
  }

  return {
    priceTotal: highest,
    priceNight: lowest,
    confidence: 'detected',
  }
}
