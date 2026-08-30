// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Extraccion de metadatos de una URL de alojamiento (og:image, LD-JSON,
// scripts inline de Booking) y verificacion de disponibilidad.
// TODO(bloque 2): partir en scrape/metadata.js y scrape/availability.js.
import * as cheerio from 'cheerio'
import { cleanText, cleanUrl, hostname } from './text.js'
import { collectStructuredPrices, extractPriceCandidates, isOpaqueTravelPlatform } from './prices.js'
import { parseTripDates } from './dates.js'

export async function extractMetadata(url) {
  if (!url) return {}
  const host = hostname(url)
  const opaquePlatform = isOpaqueTravelPlatform(url)

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent':
          'Mozilla/5.0 compatible; ViajeFamiliaBot/1.0; +https://viaje-familia-sept-2026.web.app',
      },
      signal: AbortSignal.timeout(9000),
    })

    if (!response.ok) {
      return {
        host,
        siteName: host,
        sourceStatus: response.status,
        sourceNote: `La página respondió HTTP ${response.status}`,
      }
    }

    const html = (await response.text()).slice(0, 1_200_000)
    const $ = cheerio.load(html)
    const title = $('meta[property="og:title"]').attr('content') || $('title').text()
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      ''
    const image =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      ''
    const siteName = $('meta[property="og:site_name"]').attr('content') || host

    // Gather additional images for the carousel
    const extraImageSet = new Set()
    // 1. All og:image / og:image:url meta tags
    $('meta[property="og:image"], meta[property="og:image:url"], meta[property="og:image:secure_url"]').each((_, el) => {
      const src = cleanUrl($(el).attr('content') || '')
      if (src && src !== cleanUrl(image)) extraImageSet.add(src)
    })
    // 2. JSON-LD image arrays
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const ld = JSON.parse($(el).text().trim() || '{}')
        const candidates = Array.isArray(ld) ? ld : [ld]
        candidates.forEach((obj) => {
          const imgs = Array.isArray(obj?.image) ? obj.image : (obj?.image ? [obj.image] : [])
          imgs.forEach((img) => {
            const src = cleanUrl(typeof img === 'string' ? img : (img?.url || img?.contentUrl || ''))
            if (src) extraImageSet.add(src)
          })
        })
      } catch { /* ignore */ }
    })
    // 3. Booking.com: CDN image URLs embedded in inline scripts
    if (url.includes('booking.com') || url.includes('bstatic.com') || url.includes('airbnb.com')) {
      const scriptText = $('script:not([src])').map((_, el) => $(el).html() || '').get().join('\n')
      const cdnRe = /https?:\/\/[^"' ,\])}]+(?:bstatic\.com|airbnbstatic\.com)[^"' ,\])}]*\.(?:jpg|jpeg|webp)/gi
      const found = scriptText.match(cdnRe) || []
      found.slice(0, 12).forEach((src) => {
        const clean = cleanUrl(src)
        if (clean) extraImageSet.add(clean)
      })
    }
    const structuredPriceCandidates = $('script[type="application/ld+json"]')
      .map((_, node) => {
        try {
          return collectStructuredPrices(JSON.parse($(node).text().trim()))
        } catch {
          return []
        }
      })
      .get()
      .flat()
    const visiblePriceText = opaquePlatform
      ? ''
      : $('body').text().replace(/\s+/g, ' ').slice(0, 80_000)
    const availabilityText = $('body').text().replace(/\s+/g, ' ').slice(0, 30_000)
    const priceCandidates = [
      ...structuredPriceCandidates,
      ...extractPriceCandidates(visiblePriceText),
      ...(opaquePlatform ? [] : extractPriceCandidates(`${title} ${description}`)),
    ]

    const primaryImage = cleanUrl(image)
    const allImages = [primaryImage, ...extraImageSet].filter(Boolean)

    return {
      host,
      title: cleanText(title).replace(/\s+/g, ' '),
      description: cleanText(description).replace(/\s+/g, ' '),
      image: primaryImage,
      images: [...new Set(allImages)].slice(0, 8),
      siteName: cleanText(siteName, host),
      structuredPriceCandidates: [...new Set(structuredPriceCandidates.filter(Boolean))].slice(0, 10),
      priceCandidates: [...new Set(priceCandidates.filter(Boolean))].slice(0, 10),
      priceCandidateSource: opaquePlatform ? 'structured-only' : 'page-visible',
      availabilityText: cleanText(`${title} ${description} ${availabilityText}`),
      sourceStatus: response.status,
    }
  } catch (error) {
    return {
      host,
      siteName: host,
      sourceStatus: 'unavailable',
      sourceNote: error.message,
    }
  }
}

export function availabilityCheckUrl(input, groupProfile) {
  const rawUrl = cleanUrl(input.url)
  if (!rawUrl) return ''

  const dates = parseTripDates(input.dates)
  const adults = groupProfile.adults
  const children = groupProfile.childrenAges.length

  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()

    if (dates.checkin && dates.checkout) {
      parsed.searchParams.set('checkin', dates.checkin)
      parsed.searchParams.set('checkout', dates.checkout)
    }

    if (host.includes('booking.')) {
      parsed.searchParams.set('group_adults', String(adults))
      parsed.searchParams.set('group_children', String(children))
      parsed.searchParams.set('no_rooms', parsed.searchParams.get('no_rooms') || '1')
      parsed.searchParams.set('selected_currency', 'EUR')
      parsed.searchParams.delete('age')
      groupProfile.childrenAges.forEach((age) => parsed.searchParams.append('age', String(age)))
    }

    if (host.includes('airbnb.')) {
      parsed.searchParams.set('adults', String(adults))
      parsed.searchParams.set('children', String(children))
    }

    return parsed.toString()
  } catch {
    return rawUrl
  }
}

export function availabilityFromMetadata(input, metadata, checkUrl) {
  const checkedAt = new Date().toISOString()
  const host = hostname(input.url)
  const sourceText = cleanText(
    `${metadata.title || ''} ${metadata.description || ''} ${metadata.availabilityText || ''} ${metadata.sourceNote || ''}`,
  ).toLowerCase()
  const opaquePlatform = isOpaqueTravelPlatform(input.url)
  const negativeMatch = sourceText.match(
    /sin disponibilidad|no disponible|no hay disponibilidad|agotad[oa]s?|no quedan|sold out|unavailable|not available|no availability|fully booked|no se puede reservar/i,
  )
  const positiveMatch = sourceText.match(
    /disponible|ver disponibilidad|reservar|book now|reserve|available|availability/i,
  )

  if (negativeMatch) {
    return {
      status: 'unavailable',
      label: 'Parece no disponible',
      confidence: 'media',
      checkedAt,
      checkUrl,
      source: host,
      sourceStatus: metadata.sourceStatus || null,
      summary:
        'La página mostró señales de no disponibilidad. Conviene abrir el enlace con fechas para confirmar antes de descartarla.',
      signals: [`Señal detectada: "${negativeMatch[0]}"`],
    }
  }

  if (opaquePlatform) {
    return {
      status: 'unknown',
      label: 'Confirmar en plataforma',
      confidence: 'baja',
      checkedAt,
      checkUrl,
      source: host,
      sourceStatus: metadata.sourceStatus || null,
      summary:
        'La plataforma no permite confirmar disponibilidad de forma fiable desde la app. Dejé el enlace con fechas, grupo y moneda para revisarlo en un clic.',
      signals: positiveMatch
        ? [`La página respondió, pero la señal "${positiveMatch[0]}" no confirma stock real.`]
        : ['La página respondió, pero no entregó disponibilidad verificable.'],
    }
  }

  if (positiveMatch && metadata.sourceStatus === 200) {
    return {
      status: 'available',
      label: 'Parece disponible',
      confidence: 'media',
      checkedAt,
      checkUrl,
      source: host,
      sourceStatus: metadata.sourceStatus || null,
      summary:
        'La página respondió correctamente y mostró señales de reserva/disponibilidad. Aun así, confirma precio final antes de decidir.',
      signals: [`Señal detectada: "${positiveMatch[0]}"`],
    }
  }

  return {
    status: 'unknown',
    label: 'No se pudo confirmar',
    confidence: 'baja',
    checkedAt,
    checkUrl,
    source: host,
    sourceStatus: metadata.sourceStatus || null,
    summary:
      'No encontré señales suficientes para confirmar disponibilidad automática. Usa el enlace con fechas para revisarlo manualmente.',
    signals: metadata.sourceNote ? [metadata.sourceNote] : ['Sin señal concluyente en la página.'],
  }
}
