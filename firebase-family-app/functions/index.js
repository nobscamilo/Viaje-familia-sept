// v2026-05-19b — scoreBreakdown + why personalizado en sugerencias IA (force redeploy)
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { SchemaType, VertexAI } from '@google-cloud/vertexai'
import * as cheerio from 'cheerio'

initializeApp()

setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 10,
})

const mapsApiKey = defineSecret('GOOGLE_MAPS_API_KEY')
const db = getFirestore()

const ifemaCoords = { latitude: 40.4625, longitude: -3.6155 }
const cityCenters = {
  madrid: ifemaCoords,
  barcelona: { latitude: 41.3874, longitude: 2.1686 },
  valencia: { latitude: 39.4699, longitude: -0.3763 },
  sevilla: { latitude: 37.3891, longitude: -5.9845 },
  paris: { latitude: 48.8566, longitude: 2.3522 },
  lisboa: { latitude: 38.7223, longitude: -9.1393 },
  bilbao: { latitude: 43.263, longitude: -2.935 },
  leon: { latitude: 42.5987, longitude: -5.5671 },
  valladolid: { latitude: 41.6523, longitude: -4.7245 },
  santander: { latitude: 43.4623, longitude: -3.8099 },
  zaragoza: { latitude: 41.6488, longitude: -0.8891 },
  cordoba: { latitude: 37.8882, longitude: -4.7794 },
  granada: { latitude: 37.1773, longitude: -3.5986 },
  malaga: { latitude: 36.7213, longitude: -4.4214 },
}
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
const vertexLocation = process.env.VERTEX_LOCATION || 'europe-west1'
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const suggestionResultLimit = 50
const maxSuggestionResultLimit = 100
const placesTextSearchLimit = 50

const functionOptions = {
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB',
  secrets: [mapsApiKey],
}

const tripsCollection = 'trips'
const madridF1TripId = 'madrid-f1-sept-2026'
const adultMemberIds = new Set([
  'camilo',
  'juliana-bueno',
  'julian-papa',
  'cielo',
  'juliana-hermana',
  'fernando',
  'juliancho',
])

function scopedDocId(tripId, id) {
  return `${tripId}__${id}`.replaceAll('/', '-')
}

function isAdultMemberId(memberId) {
  return adultMemberIds.has(cleanText(memberId))
}

const optionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    thinkingProcess: { type: SchemaType.STRING },
    title: { type: SchemaType.STRING },
    source: { type: SchemaType.STRING },
    category: { type: SchemaType.STRING },
    city: { type: SchemaType.STRING },
    targetGroup: { type: SchemaType.STRING },
    priceNight: { type: SchemaType.NUMBER, nullable: true },
    priceTotal: { type: SchemaType.NUMBER, nullable: true },
    rating: { type: SchemaType.STRING },
    reviews: { type: SchemaType.NUMBER, nullable: true },
    capacity: { type: SchemaType.STRING },
    bathrooms: { type: SchemaType.NUMBER, nullable: true },
    transit: { type: SchemaType.STRING },
    aiScore: { type: SchemaType.NUMBER },
    highlights: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    cautions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    questions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    summary: { type: SchemaType.STRING },
  },
  required: [
    'thinkingProcess',
    'title',
    'source',
    'category',
    'city',
    'targetGroup',
    'rating',
    'capacity',
    'transit',
    'aiScore',
    'highlights',
    'cautions',
    'questions',
    'summary',
  ],
}

const lodgingSearchSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    searchQueries: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    comparisonCriteria: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    recommendedNextSteps: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    redFlags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    'summary',
    'searchQueries',
    'comparisonCriteria',
    'recommendedNextSteps',
    'redFlags',
  ],
}

const foodSearchSchema = {
  type: SchemaType.OBJECT,
  properties: {
    thinkingProcess: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    rankedPlaces: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          placeId: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          why: {
            type: SchemaType.STRING,
            description: 'Razón concreta y personalizada (1-2 oraciones) de por qué este lugar encaja para este grupo. Menciona detalles específicos: capacidad, distancia, niños, menú, horario, o por qué supera a otros candidatos.',
          },
          caution: { type: SchemaType.STRING },
          scoreBreakdown: {
            type: SchemaType.ARRAY,
            description: '3-4 dimensiones de score específicas para la categoría (ej. Precio, Capacidad, Ubicación, Reseñas). Cada una con valor v (0-10) y max 10.',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                v: { type: SchemaType.NUMBER },
                max: { type: SchemaType.NUMBER },
                note: { type: SchemaType.STRING },
              },
              required: ['label', 'v', 'max', 'note'],
            },
          },
          tags: {
            type: SchemaType.ARRAY,
            description: '2-3 tags cortos y específicos que describen lo más relevante del lugar para este grupo (ej. "Mesa para 9", "A 5 min del metro", "Menú niños").',
            items: { type: SchemaType.STRING },
          },
          estimatedPriceRange: {
            type: SchemaType.OBJECT,
            description: 'Rango de precio estimado basado en tu conocimiento general. Restaurante: precio plato principal + bebida por persona. Ej: {min:18,max:30,currency:"EUR",unit:"persona",label:"18-30€/p"}.',
            properties: {
              min: { type: SchemaType.NUMBER },
              max: { type: SchemaType.NUMBER },
              currency: { type: SchemaType.STRING },
              unit: { type: SchemaType.STRING },
              label: { type: SchemaType.STRING },
            },
            required: ['min', 'max', 'currency', 'unit', 'label'],
          },
        },
        required: ['placeId', 'name', 'score', 'why', 'caution', 'scoreBreakdown', 'tags'],
      },
    },
  },
  required: ['thinkingProcess', 'summary', 'rankedPlaces'],
}

const transferSearchSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    comparisonCriteria: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    recommendedNextSteps: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    budgetNotes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ['summary', 'comparisonCriteria', 'recommendedNextSteps', 'budgetNotes'],
}

const itinerarySchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    days: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          date: { type: SchemaType.STRING },
          city: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          familyPlan: { type: SchemaType.STRING },
          f1Plan: { type: SchemaType.STRING },
          foodIdea: { type: SchemaType.STRING },
          routeNotes: { type: SchemaType.STRING },
          backup: { type: SchemaType.STRING },
          energyLevel: { type: SchemaType.STRING },
          subgroupPlans: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                groupId: { type: SchemaType.STRING },
                groupName: { type: SchemaType.STRING },
                timeWindow: { type: SchemaType.STRING },
                plan: { type: SchemaType.STRING },
                budgetNote: { type: SchemaType.STRING },
              },
              required: ['groupId', 'groupName', 'timeWindow', 'plan', 'budgetNote'],
            },
          },
        },
        required: [
          'date',
          'city',
          'title',
          'familyPlan',
          'f1Plan',
          'foodIdea',
          'routeNotes',
          'backup',
          'energyLevel',
          'subgroupPlans',
        ],
      },
    },
    openQuestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ['title', 'summary', 'days', 'openQuestions'],
}

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para usar la IA.')
  }

  return {
    uid: request.auth.uid,
    email: request.auth.token.email || null,
    name: request.auth.token.name || request.auth.token.email || 'Familiar',
  }
}

function cleanText(value, fallback = '') {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, 4000)
}

function cleanTripId(value, fallback = madridF1TripId) {
  const tripId = cleanText(value, fallback)
  return tripId.replaceAll('/', '-')
}

function cleanJoinCode(value) {
  return cleanText(value).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 24)
}

function memberEntry(user, role = 'member') {
  return {
    displayName: user.name || user.email || 'Familiar',
    photoURL: null,
    email: user.email || null,
    role,
    joinedAt: new Date().toISOString(),
  }
}

function publicTripPayload(tripId, data = {}, uid = '') {
  const memberIds = data.memberIds || Object.keys(data.members || {})
  return stripUndefined({
    id: tripId,
    name: data.name,
    description: data.description,
    destination: data.destination,
    startDate: data.startDate,
    endDate: data.endDate,
    emoji: data.emoji,
    joinCode: data.joinCode,
    members: data.members || {},
    memberIds,
    memberCount: memberIds.length,
    alreadyMember: uid ? memberIds.includes(uid) : false,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
  })
}

async function findTripByJoinCode(joinCode) {
  const snapshot = await db
    .collection(tripsCollection)
    .where('joinCode', '==', cleanJoinCode(joinCode))
    .limit(1)
    .get()

  if (snapshot.empty) return null
  const doc = snapshot.docs[0]
  return { id: doc.id, ref: doc.ref, data: doc.data() }
}

async function requireTripMember(tripId, user) {
  const cleanId = cleanTripId(tripId)
  const snap = await db.collection(tripsCollection).doc(cleanId).get()
  if (!snap.exists) throw new HttpsError('not-found', 'El viaje no existe.')

  const trip = snap.data()
  const memberIds = trip.memberIds || Object.keys(trip.members || {})
  if (!memberIds.includes(user.uid)) {
    throw new HttpsError('permission-denied', 'No tienes acceso a este viaje.')
  }

  return { id: cleanId, ref: snap.ref, data: trip }
}

async function tripScopedDoc(collectionName, tripId, logicalId) {
  const directRef = db.collection(collectionName).doc(scopedDocId(tripId, logicalId))
  const directSnap = await directRef.get()
  if (directSnap.exists) return { ref: directRef, snap: directSnap }

  const snapshot = await db
    .collection(collectionName)
    .where('tripId', '==', tripId)
    .where('id', '==', logicalId)
    .limit(1)
    .get()

  if (!snapshot.empty) {
    const snap = snapshot.docs[0]
    return { ref: snap.ref, snap }
  }

  return { ref: directRef, snap: directSnap }
}

function cleanUrl(value) {
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

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Propuesta familiar'
  }
}

function slug(value) {
  return cleanText(value, 'opcion')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function cityKey(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function destinationForCity(city) {
  return cityCenters[cityKey(city)] || ifemaCoords
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min))
}

function cleanSuggestionLimit(value) {
  return clamp(Math.round(Number(value) || suggestionResultLimit), suggestionResultLimit, maxSuggestionResultLimit)
}

function cleanNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null
}

function normalizePriceNumber(value) {
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
  return Number.isFinite(price) && price > 0 ? Math.round(price) : null
}

function extractPriceCandidates(text) {
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

function collectStructuredPrices(value, results = []) {
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

function isOpaqueTravelPlatform(url) {
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

function extractUrlPriceCandidates(url) {
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

function inferNights(dates) {
  const parsed = parseTripDates(dates)
  if (!parsed.checkin || !parsed.checkout) return 4

  const start = new Date(`${parsed.checkin}T00:00:00Z`)
  const end = new Date(`${parsed.checkout}T00:00:00Z`)
  const nights = Math.round((end - start) / 86_400_000)
  return nights > 0 && nights < 60 ? nights : 4
}

function inferPrices(input, metadata = {}) {
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

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)]),
  )
}

export const resolveTripInvite = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const joinCode = cleanJoinCode(request.data?.joinCode)
  if (!joinCode) throw new HttpsError('invalid-argument', 'Se requiere código de invitación.')

  const trip = await findTripByJoinCode(joinCode)
  if (!trip) return { trip: null }

  const invite = publicTripPayload(trip.id, trip.data, user.uid)
  delete invite.members
  return {
    trip: invite,
  }
})

export const joinTripByCode = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const joinCode = cleanJoinCode(request.data?.joinCode)
  if (!joinCode) throw new HttpsError('invalid-argument', 'Se requiere código de invitación.')

  const trip = await findTripByJoinCode(joinCode)
  if (!trip) throw new HttpsError('not-found', `Código de invitación "${joinCode}" no encontrado.`)

  const members = trip.data.members || {}
  const existingRole = members[user.uid]?.role || 'member'
  await trip.ref.set(
    {
      memberIds: FieldValue.arrayUnion(user.uid),
      members: { [user.uid]: memberEntry(user, existingRole) },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  const updated = {
    ...trip.data,
    memberIds: [...new Set([...(trip.data.memberIds || Object.keys(members)), user.uid])],
    members: {
      ...members,
      [user.uid]: memberEntry(user, existingRole),
    },
  }

  return { trip: publicTripPayload(trip.id, updated, user.uid) }
})

function getMapsKey() {
  try {
    return process.env.GOOGLE_MAPS_API_KEY || mapsApiKey.value()
  } catch {
    return ''
  }
}

async function extractMetadata(url) {
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

function availabilityCheckUrl(input, groupProfile) {
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

function availabilityFromMetadata(input, metadata, checkUrl) {
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

async function searchPlaces(textQuery, maxResultCount = 5) {
  const key = getMapsKey()
  if (!key || !textQuery) return []
  const safeMaxResultCount = clamp(maxResultCount, 1, placesTextSearchLimit)

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.priceLevel,places.types,places.photos',
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'es',
      regionCode: 'ES',
      maxResultCount: safeMaxResultCount,
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Places respondió HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.places || []
}

function suggestionSearchQueries(kind, notes, city) {
  return [
    `${notes} en ${city}`,
    `${kind} mejor valorados en ${city}`,
    `${kind} con muchas reseñas en ${city}`,
    `${kind} recomendados para familias en ${city}`,
  ]
    .map((queryText) => cleanText(queryText))
    .filter((queryText, index, list) => queryText && list.indexOf(queryText) === index)
}

async function searchSuggestionCandidates(kind, notes, city, resultLimit) {
  const seen = new Set()
  const candidates = []
  const errors = []

  for (const queryText of suggestionSearchQueries(kind, notes, city)) {
    if (candidates.length >= resultLimit) break
    try {
      const results = await searchPlaces(queryText, resultLimit)
      for (const place of results) {
        const key = place.id || place.placeId || place.place_id || place.displayName?.text
        if (!key || seen.has(key)) continue
        seen.add(key)
        candidates.push(place)
        if (candidates.length >= resultLimit) break
      }
    } catch (error) {
      errors.push(error)
    }
  }

  if (!candidates.length && errors.length) {
    throw errors[0]
  }

  return candidates
}

function photoCredit(photo) {
  const names = (photo?.authorAttributions || [])
    .map((author) => cleanText(author.displayName))
    .filter(Boolean)
    .slice(0, 2)

  return names.length ? `Foto: ${names.join(', ')}` : 'Foto: Google Maps'
}

async function getPlacePhotoUri(photoName) {
  const key = getMapsKey()
  if (!key || !photoName) return ''

  const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`)
  url.searchParams.set('maxWidthPx', '1200')
  url.searchParams.set('maxHeightPx', '800')
  url.searchParams.set('skipHttpRedirect', 'true')
  url.searchParams.set('key', key)

  const response = await fetch(url, { signal: AbortSignal.timeout(7000) })
  if (!response.ok) return ''

  const data = await response.json().catch(() => ({}))
  return data.photoUri || ''
}

function normalizePlace(place) {
  const name = place.displayName?.text || place.name || 'Lugar sugerido'
  const placeId = place.id || place.placeId || place.place_id || slug(name)
  const location = place.location
    ? {
        lat: place.location.latitude,
        lng: place.location.longitude,
      }
    : null

  const photos = place.photos || []
  const photo = photos[0] || null

  return {
    placeId,
    name,
    formattedAddress: place.formattedAddress || place.formatted_address || '',
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || place.user_ratings_total || null,
    googleMapsUri:
      place.googleMapsUri ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
    location,
    types: place.types || [],
    photoName: photo?.name || '',
    photoNames: photos.slice(0, 5).map((p) => p.name).filter(Boolean),
    photoCredit: photo ? photoCredit(photo) : '',
  }
}

async function withPlacePhotos(normalized) {
  // Fetch a small photo set in parallel; ranking should stay fast even with 10 places.
  const photoNames = normalized.photoNames?.length
    ? normalized.photoNames
    : normalized.photoName
      ? [normalized.photoName]
      : []
  const photoUris = await Promise.all(
    photoNames.map((name) => getPlacePhotoUri(name).catch(() => '')),
  ).then((uris) => uris.filter(Boolean))

  return stripUndefined({
    ...normalized,
    photoUri: photoUris[0] || '',
    photoUris,
  })
}

async function normalizePlaceWithPhoto(place) {
  return withPlacePhotos(normalizePlace(place))
}

async function computeRoute(origin, travelMode, destination = ifemaCoords) {
  const key = getMapsKey()
  if (!key || !origin?.lat || !origin?.lng) return null

  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.localizedValues,routes.legs.localizedValues',
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: destination,
        },
      },
      travelMode,
      languageCode: 'es-ES',
      units: 'METRIC',
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) return null

  const data = await response.json()
  const route = data.routes?.[0]
  if (!route) return null

  return {
    mode: travelMode,
    duration: route.localizedValues?.duration?.text || route.duration || '',
    distance: route.localizedValues?.distance?.text || `${route.distanceMeters || 0} m`,
    distanceMeters: route.distanceMeters || null,
  }
}

async function computeRoutes(origin, destination = ifemaCoords) {
  const modes = ['TRANSIT', 'WALK', 'DRIVE']
  const results = await Promise.all(
    modes.map(async (mode) => {
      try {
        return [mode, await computeRoute(origin, mode, destination)]
      } catch {
        return [mode, null]
      }
    }),
  )

  return Object.fromEntries(results.filter(([, route]) => route))
}

function routeSummary(routes) {
  const transit = routes.TRANSIT?.duration
  const walk = routes.WALK?.duration
  const drive = routes.DRIVE?.duration
  const parts = []
  if (transit) parts.push(`TP ${transit}`)
  if (walk) parts.push(`andando ${walk}`)
  if (drive) parts.push(`coche ${drive}`)
  return parts.join(' · ') || 'Ruta por calcular'
}

function categoryCodePrefix(category) {
  return {
    lodging: 'H',
    activities: 'P',
    food: 'C',
    transport: 'T',
  }[category] || 'O'
}

async function nextOptionCode(category, tripId) {
  const prefix = categoryCodePrefix(category)
  const snapshot = await db
    .collection('tripOptions')
    .where('tripId', '==', tripId)
    .select('code')
    .get()
  const used = snapshot.docs
    .map((doc) => cleanText(doc.data().code))
    .filter((code) => code.startsWith(prefix))
    .map((code) => Number(code.replace(prefix, '')))
    .filter((number) => Number.isFinite(number))
  const next = used.length ? Math.max(...used) + 1 : 1
  return `${prefix}${next}`
}

function normalizeGroupProfile(value = {}) {
  const childrenAges = Array.isArray(value.childrenAges)
    ? value.childrenAges
        .map((age) => Number(age))
        .filter((age) => Number.isFinite(age) && age > 0 && age < 18)
    : []
  const memberIds = Array.isArray(value.memberIds)
    ? value.memberIds.map((memberId) => cleanText(memberId)).filter(Boolean).slice(0, 20)
    : []
  const adults = Math.max(1, Number(value.adults) || 7)

  return {
    id: cleanText(value.id, 'familia-sept-2026'),
    name: cleanText(value.name, 'Familia septiembre 2026'),
    adults,
    childrenAges,
    totalTravelers: Number(value.totalTravelers) || adults + childrenAges.length,
    memberIds,
    members: Array.isArray(value.members)
      ? value.members.map((member) => cleanText(member)).filter(Boolean).slice(0, 20)
      : [],
    date: cleanText(value.date),
    startTime: cleanText(value.startTime),
    endTime: cleanText(value.endTime),
    focus: cleanText(value.focus || value.note),
    budgetOptions: Array.isArray(value.budgetOptions)
      ? value.budgetOptions.slice(0, 20).map((option) => ({
          id: cleanText(option.id),
          title: cleanText(option.title),
          category: cleanText(option.category),
          city: cleanText(option.city),
          total: cleanNumber(option.total),
          perPerson: cleanNumber(option.perPerson),
        }))
      : [],
    note: cleanText(value.note),
  }
}

function normalizeItinerarySubgroups(value) {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 12)
    .map((group) => normalizeGroupProfile(group))
    .filter((group) => group.name)
}

function parseTripDates(value) {
  const text = cleanText(value).toLowerCase()
  const year = text.match(/\b(20\d{2})\b/)?.[1] || '2026'
  const monthMap = {
    ene: '01',
    enero: '01',
    feb: '02',
    febrero: '02',
    mar: '03',
    marzo: '03',
    abr: '04',
    abril: '04',
    may: '05',
    mayo: '05',
    jun: '06',
    junio: '06',
    jul: '07',
    julio: '07',
    ago: '08',
    agosto: '08',
    sep: '09',
    septiembre: '09',
    oct: '10',
    octubre: '10',
    nov: '11',
    noviembre: '11',
    dic: '12',
    diciembre: '12',
  }
  const monthKey = Object.keys(monthMap).find((key) => text.includes(key))
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((day) => day >= 1 && day <= 31)

  if (!monthKey || days.length < 2) return { checkin: '', checkout: '' }

  return {
    checkin: `${year}-${monthMap[monthKey]}-${String(days[0]).padStart(2, '0')}`,
    checkout: `${year}-${monthMap[monthKey]}-${String(days[1]).padStart(2, '0')}`,
  }
}

function heuristicScore(input, place, routes, priceNight) {
  let score = 64
  if (input.category === 'lodging') score += 8
  if (input.city === 'Madrid') score += 5
  if (input.targetGroup === 'family') score += 5
  if (place?.rating >= 4.4) score += 6
  if (place?.userRatingCount >= 100) score += 3
  if (priceNight && priceNight >= 300 && priceNight <= 600) score += 8
  if (routes.TRANSIT?.duration && !routes.TRANSIT.duration.includes('h')) score += 5
  return clamp(score, 35, 96)
}

function buildFallbackAnalysis(input, metadata, place, routes) {
  const prices = inferPrices(input, metadata)
  const priceNight = prices.priceNight
  const priceTotal = prices.priceTotal
  const score = heuristicScore(input, place, routes, priceNight)
  const totalTravelers = input.groupProfile?.totalTravelers || 9

  return {
    thinkingProcess: 'Análisis de respaldo generado de manera local sin servicios externos.',
    title:
      input.title ||
      metadata.title ||
      place?.name ||
      `Opción de ${input.url ? hostname(input.url) : input.city}`,
    source: metadata.siteName || (input.url ? hostname(input.url) : 'Propuesta familiar'),
    category: input.category,
    city: input.city,
    targetGroup: input.targetGroup,
    priceNight,
    priceTotal,
    rating: place?.rating ? `${place.rating}/5` : 'Pendiente de validar',
    reviews: place?.userRatingCount || null,
    capacity: input.targetGroup === 'f1' ? 'Subgrupo F1' : `Por verificar para ${totalTravelers} personas`,
    transit: routeSummary(routes),
    aiScore: score,
    highlights: [
      place?.formattedAddress || metadata.description || 'Información inicial capturada',
      routeSummary(routes),
      prices.confidence === 'missing'
        ? 'Precio no visible automáticamente; conviene copiarlo desde la plataforma'
        : `Precio detectado con confianza ${prices.confidence}`,
      input.notes || 'Pendiente de revisar disponibilidad y fotos',
    ].filter(Boolean),
    cautions: [
      'Confirmar precio final, impuestos y política de cancelación',
      'Validar capacidad real, camas, baños y comodidad para niños',
    ],
    questions: [
      '¿El precio corresponde exactamente a las fechas del viaje?',
      '¿Permite check-in y logística cómoda para el grupo?',
    ],
    summary:
      'Análisis preliminar generado con metadatos públicos, Maps y reglas familiares; requiere revisión final.',
  }
}

function optionFromAnalysis(input, analysis, metadata, place, routes, user, code) {
  const createdAt = Date.now()
  const title = cleanText(analysis.title, input.title || metadata.title || 'Nueva opción')
  const id = `${input.category}-${slug(title)}-${createdAt}`
  const prices = inferPrices(input, metadata)
  const analysisNight = cleanNumber(analysis.priceNight)
  const analysisTotal = cleanNumber(analysis.priceTotal)
  const safePriceNight = prices.priceNight || (prices.confidence === 'missing' ? null : analysisNight)
  const safePriceTotal = prices.priceTotal || (prices.confidence === 'missing' ? null : analysisTotal)

  return stripUndefined({
    id,
    tripId: input.tripId,
    code,
    category: input.category,
    title,
    source: cleanText(analysis.source, metadata.siteName || hostname(input.url)),
    city: cleanText(analysis.city, input.city),
    status: input.isAdultContributor ? 'active' : 'pending',
    url: input.url,
    // For lodging: Booking/Airbnb photo is more accurate (Maps returns generic area photos).
    // For food/activities: Maps photo is fine since Places matches are more precise.
    image: input.category === 'lodging'
      ? (metadata.image || place?.photoUri || '')
      : (place?.photoUri || metadata.image || ''),
    alternateImage: input.category === 'lodging'
      ? (metadata.image ? place?.photoUri || '' : '')
      : (place?.photoUri ? metadata.image || '' : ''),
    imageCredit: input.category === 'lodging' ? '' : (place?.photoCredit || ''),
    // photos[]: full gallery — site images first for lodging, then Maps photos (deduped)
    photos: [...new Set(
      input.category === 'lodging'
        ? [...(metadata.images?.length ? metadata.images : [metadata.image]), ...(place?.photoUris || [])].filter(Boolean)
        : [...(place?.photoUris || []), ...(metadata.images?.length ? metadata.images : [metadata.image])].filter(Boolean)
    )].slice(0, 8),
    priceNight: safePriceNight,
    priceTotal: safePriceTotal,
    priceConfidence: prices.confidence,
    rating: cleanText(analysis.rating, 'Pendiente'),
    reviews: analysis.reviews ?? null,
    capacity: cleanText(analysis.capacity, 'Por verificar'),
    bathrooms: analysis.bathrooms ?? null,
    transit: cleanText(analysis.transit, routeSummary(routes)),
    targetGroup: cleanText(analysis.targetGroup, input.targetGroup),
    aiScore: clamp(analysis.aiScore, 25, 99),
    map: { x: 52, y: 50 },
    coords: place?.location || null,
    highlights: (analysis.highlights || []).slice(0, 4),
    cautions: (analysis.cautions || []).slice(0, 4),
    aiSummary: analysis.summary || '',
    aiThinkingProcess: analysis.thinkingProcess || '',
    aiQuestions: analysis.questions || [],
    routeModes: routes,
    groupProfile: input.groupProfile,
    contributorMemberId: input.selectedMemberId || null,
    createdBy: user.uid,
    createdByName: user.name,
  })
}

/**
 * Builds a dynamic trip-context block for AI prompts.
 * Derives F1 subgroup from `subgroups` array so prompts are not hardcoded
 * to specific member names or trip titles.
 */
function buildTripContext(groupProfile, subgroups = [], city = '') {
  const f1Sub = subgroups.find(
    (sub) => /\bf1\b/i.test(String(sub.id || '')) || /\bF1\b/.test(String(sub.name || '')),
  )
  const lines = [
    `Grupo: ${groupProfile.name}, ${groupProfile.totalTravelers} personas ` +
      `(${groupProfile.adults} adultos, ${groupProfile.childrenAges.length} niños` +
      `${groupProfile.childrenAges.length ? ` edades ${groupProfile.childrenAges.join(', ')}` : ''}).`,
  ]
  if (groupProfile.date) lines.push(`Fechas del grupo: ${groupProfile.date}.`)
  if (groupProfile.focus) lines.push(`Foco: ${groupProfile.focus}.`)
  if (f1Sub) {
    const members = f1Sub.memberIds?.length ? f1Sub.memberIds.join(', ') : f1Sub.name
    const isMadrid = /madrid/i.test(city)
    if (isMadrid) {
      lines.push(
        `Subgrupo F1 (SOLO para Madrid, 11-13 sep — la carrera es en IFEMA/MADRING): ${members}. Esos días el grupo se divide: F1 van a la carrera, el resto necesita planes alternos en paralelo. FUERA de Madrid o del 11-13 sep, el grupo viaja y planifica JUNTO.`,
      )
    } else if (city) {
      lines.push(
        `IMPORTANTE: El viaje incluye un subgrupo F1, pero la carrera de Fórmula 1 es ÚNICAMENTE en Madrid (11-13 sep). En ${city} NO hay evento F1 — el grupo viaja y planifica COMPLETAMENTE JUNTO como ${groupProfile.totalTravelers} personas. No dividas el grupo ni planifiques planes F1 para esta ciudad.`,
      )
    } else {
      lines.push(
        `Nota: hay un subgrupo F1 en el viaje. La carrera F1 es SOLO en Madrid (11-13 sep). Para otras ciudades el grupo viaja junto.`,
      )
    }
  }
  return lines.map((line, i) => (i === 0 ? line : `- ${line}`)).join('\n')
}

async function generateJson(schema, prompt, fallback, { maxTokens = 4096 } = {}) {
  if (!projectId) return fallback

  try {
    const vertex = new VertexAI({ project: projectId, location: vertexLocation })
    const model = vertex.getGenerativeModel({
      model: geminiModel,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    })
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    })
    const text =
      result.response?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || ''
    return JSON.parse(text.replace(/^```json|```$/g, '').trim())
  } catch (error) {
    console.error('[generateJson] Vertex AI error:', error?.message || error)
    return {
      ...fallback,
      aiFallbackReason: error.message,
    }
  }
}

function platformLinks(search, groupProfile) {
  const city = encodeURIComponent(search.city || 'Madrid')
  const dates = parseTripDates(search.dates)
  const adults = groupProfile.adults
  const children = groupProfile.childrenAges.length
  const total = groupProfile.totalTravelers
  const query = encodeURIComponent(
    `${search.city || 'Madrid'} alojamiento ${total} personas ${search.dates || ''}`,
  )
  const bookingDates = dates.checkin && dates.checkout
    ? `&checkin=${dates.checkin}&checkout=${dates.checkout}`
    : ''
  const airbnbDates = dates.checkin && dates.checkout
    ? `&checkin=${dates.checkin}&checkout=${dates.checkout}`
    : ''
  const bookingAges = groupProfile.childrenAges.map((age) => `&age=${age}`).join('')
  const googleDates = dates.checkin && dates.checkout
    ? ` ${dates.checkin} ${dates.checkout}`
    : ''

  return [
    {
      label: 'Booking',
      url: `https://www.booking.com/searchresults.es.html?ss=${city}${bookingDates}&group_adults=${adults}&group_children=${children}${bookingAges}&no_rooms=1`,
    },
    {
      label: 'Airbnb',
      url: `https://www.airbnb.com/s/${city}/homes?adults=${adults}&children=${children}${airbnbDates}`,
    },
    {
      label: total > 6 ? 'Google Travel 6 personas' : 'Google Travel',
      url: `https://www.google.com/travel/search?q=${query}${encodeURIComponent(googleDates)}&adults=${Math.min(total, 6)}`,
    },
    ...(total > 6
      ? [
          {
            label: `Google Travel resto (${total - 6})`,
            url: `https://www.google.com/travel/search?q=${encodeURIComponent(`${search.city || 'Madrid'} alojamiento ${total - 6} personas${googleDates}`)}&adults=${total - 6}`,
          },
        ]
      : []),
  ]
}

function omioSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function omioLinks(transfer) {
  const origin = omioSlug(transfer.origin || 'Madrid')
  const destination = omioSlug(transfer.destination || 'Paris')

  return [
    { label: 'Omio comparar', url: `https://www.omio.es/viajes/${origin}/${destination}` },
    { label: 'Tren', url: `https://www.omio.es/trenes/${origin}/${destination}` },
    { label: 'Bus', url: `https://www.omio.es/autobuses/${origin}/${destination}` },
    { label: 'Avión', url: `https://www.omio.es/vuelos/${origin}/${destination}` },
  ]
}

export const analyzeTripOption = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const tripId = cleanTripId(request.data?.tripId)
  await requireTripMember(tripId, user)
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []

  const input = {
    tripId,
    title: cleanText(request.data?.title),
    url: cleanUrl(request.data?.url),
    category: cleanText(request.data?.category, 'lodging'),
    city: cleanText(request.data?.city, 'Madrid'),
    targetGroup: cleanText(request.data?.targetGroup, 'family'),
    notes: cleanText(request.data?.notes),
    dates: cleanText(request.data?.dates, '10-14 sep 2026'),
    priceTotal: cleanNumber(request.data?.priceTotal),
    priceNight: cleanNumber(request.data?.priceNight),
    selectedMemberId: cleanText(request.data?.selectedMemberId),
    groupProfile,
    subgroups,
  }
  input.isAdultContributor = isAdultMemberId(input.selectedMemberId)

  if (!input.url && !input.title && !input.notes) {
    throw new HttpsError('invalid-argument', 'Envía al menos un link, nombre o nota.')
  }

  const jobRef = db.collection('analysisJobs').doc(scopedDocId(tripId, `analysis-${Date.now()}`))
  await jobRef.set({
    type: 'tripOption',
    status: 'running',
    tripId,
    input,
    createdBy: user.uid,
    createdByName: user.name,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  const metadata = await extractMetadata(input.url)
  const placeQuery = [input.title || metadata.title, input.city, input.category === 'food' ? 'restaurante' : '']
    .filter(Boolean)
    .join(' ')
  const rawPlaces = await searchPlaces(placeQuery, 1).catch(() => [])
  const place = rawPlaces[0] ? await normalizePlaceWithPhoto(rawPlaces[0]) : null
  const routeDestination = destinationForCity(input.city)
  const routes = place?.location ? await computeRoutes(place.location, routeDestination) : {}
  const fallback = buildFallbackAnalysis(input, metadata, place, routes)
  const prompt = `
Eres el copiloto IA de un viaje familiar. Analiza la opción propuesta con ojo crítico y práctico.

Contexto del viaje:
- ${buildTripContext(groupProfile, subgroups, input.city)}
- Presupuesto hospedaje orientativo: 300 a 600 EUR/noche total.
- Prioridad: alojamiento completo, logística fácil con niños, espacios comunes, buena conectividad al punto central.
- No inventes precios. Solo llena priceNight y priceTotal si input.priceNight/input.priceTotal o metadata.priceCandidates traen una cifra explícita; si no hay precio visible, deja ambos en null y ponlo como duda.
- bathrooms: extrae el número de baños del título, descripción o metadata. Si no aparece explícito, deja en null.

En tu propiedad "thinkingProcess", explica paso a paso tu razonamiento lógico e intelectual (de al menos 2 párrafos cortos en español): evalúa la capacidad de camas/baños para las 9 personas, analiza la conveniencia de la ubicación y el transporte público hacia el punto central, y justifica la puntuación de viabilidad y precio. Sé directo, honesto y detallado.

Analiza esta opción y responde SOLO el JSON del esquema:
${JSON.stringify({ input, metadata, place, routes })}
`
  const analysis = await generateJson(optionSchema, prompt, fallback)
  const code = await nextOptionCode(input.category, tripId)
  const option = optionFromAnalysis(input, analysis, metadata, place, routes, user, code)

  await db
    .collection('tripOptions')
    .doc(scopedDocId(tripId, option.id))
    .set(
      {
        ...option,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  await jobRef.set(
    {
      ...stripUndefined({
        status: 'complete',
        metadata,
        place,
        routes,
        analysis,
        optionId: option.id,
        tripId,
      }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return stripUndefined({ jobId: jobRef.id, option, analysis, metadata, routes })
})

// Re-run AI analysis on an existing option and patch only the AI/enrichment fields
export const reanalyzeTripOption = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const optionId = cleanText(request.data?.optionId)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []

  if (!optionId) throw new HttpsError('invalid-argument', 'Se requiere optionId.')
  await requireTripMember(tripId, user)

  const { ref: docRef, snap } = await tripScopedDoc('tripOptions', tripId, optionId)
  if (!snap.exists) throw new HttpsError('not-found', 'La opción no existe.')

  const existing = snap.data()
  const input = {
    tripId,
    title: existing.title || '',
    url: existing.url || '',
    category: existing.category || 'lodging',
    city: existing.city || 'Madrid',
    targetGroup: existing.targetGroup || 'family',
    priceNight: existing.priceNight || null,
    priceTotal: existing.priceTotal || null,
    notes: '',
    isAdultContributor: true,
    selectedMemberId: user.uid,
    groupProfile,
  }

  const [metadata, routeDestination] = await Promise.all([
    input.url ? extractMetadata(input.url) : Promise.resolve({}),
    Promise.resolve(cityCenters[input.city?.toLowerCase()] || ifemaCoords),
  ])

  const placeQuery = `${input.title} ${input.city}`
  const place = await searchPlaces(placeQuery, 1).then((r) => normalizePlaceWithPhoto(r[0])).catch(() => null)
  const routes = place?.location ? await computeRoutes(place.location, routeDestination) : {}

  const prompt = `
Eres el copiloto IA de un viaje familiar. Re-analiza esta opción con la información actualizada.

Contexto del viaje:
- ${buildTripContext(groupProfile, subgroups, input.city)}
- Presupuesto hospedaje orientativo: 300 a 600 EUR/noche total.
- Prioridad: alojamiento completo, logística fácil con niños, espacios comunes, buena conectividad al punto central.
- No inventes precios. Solo llena priceNight y priceTotal si hay cifra explícita; si no, deja en null.
- bathrooms: extrae el número de baños del título, descripción o metadata. Si no aparece explícito, deja en null.

En tu propiedad "thinkingProcess", detalla tu proceso intelectual de evaluación de esta opción (mínimo 2 párrafos cortos en español): analiza la idoneidad para las 9 personas del grupo, calcula la viabilidad logística de transporte público y evalúa críticamente la relación calidad-precio.

Analiza esta opción y responde SOLO el JSON del esquema:
${JSON.stringify({ input, metadata, place, routes })}
`

  const fallback = buildFallbackAnalysis(input, metadata, place, routes)
  const analysis = await generateJson(optionSchema, prompt, fallback)

  const patch = stripUndefined({
    aiScore: clamp(analysis.aiScore, 25, 99),
    aiSummary: analysis.summary || '',
    aiThinkingProcess: analysis.thinkingProcess || '',
    highlights: (analysis.highlights || []).slice(0, 4),
    cautions: (analysis.cautions || []).slice(0, 4),
    aiQuestions: analysis.questions || [],
    bathrooms: analysis.bathrooms ?? null,
    tripId,
    transit: cleanText(analysis.transit, existing.transit),
    coords: place?.location || existing.coords || null,
    image: existing.category === 'lodging'
      ? (existing.image || place?.photoUri || '')
      : (place?.photoUri || existing.image || ''),
    alternateImage: existing.category === 'lodging'
      ? (existing.image ? place?.photoUri || '' : existing.alternateImage || '')
      : (place?.photoUri ? existing.image || '' : existing.alternateImage || ''),
    imageCredit: existing.category === 'lodging' ? '' : (place?.photoCredit || existing.imageCredit || ''),
    // Refresh gallery — site images first for lodging, then Maps photos (deduped)
    photos: [...new Set(
      existing.category === 'lodging'
        ? [...(metadata.images?.length ? metadata.images : [existing.image]), ...(place?.photoUris || [])].filter(Boolean)
        : [...(place?.photoUris || []), ...(metadata.images?.length ? metadata.images : [existing.image])].filter(Boolean)
    )].slice(0, 8),
    updatedAt: FieldValue.serverTimestamp(),
  })

  await docRef.set(patch, { merge: true })

  return { optionId, patch: { ...patch, updatedAt: Date.now() } }
})

export const verifyTripOptionAvailability = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  await requireTripMember(tripId, user)
  const input = {
    tripId,
    optionId: cleanText(request.data?.optionId),
    title: cleanText(request.data?.title),
    url: cleanUrl(request.data?.url),
    city: cleanText(request.data?.city, 'Madrid'),
    dates: cleanText(request.data?.dates, '10-14 sep 2026'),
  }

  if (!input.url) {
    throw new HttpsError('invalid-argument', 'La opción no tiene un link válido para verificar.')
  }

  const checkUrl = availabilityCheckUrl(input, groupProfile)
  const metadata = await extractMetadata(checkUrl || input.url)
  const availability = stripUndefined(
    availabilityFromMetadata(input, metadata, checkUrl || input.url),
  )

  if (input.optionId) {
    const { ref: optionRef, snap } = await tripScopedDoc('tripOptions', tripId, input.optionId)
    if (!snap.exists) throw new HttpsError('not-found', 'La opción no existe en este viaje.')
    await optionRef.set(
      {
        tripId,
        availability,
        updatedBy: user.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  }

  return availability
})

export const suggestLodgingSearch = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []
  await requireTripMember(tripId, user)
  const search = {
    id: `search-${Date.now()}`,
    tripId,
    type: 'lodging',
    city: cleanText(request.data?.city, 'Madrid'),
    dates: cleanText(request.data?.dates, '10-14 sep 2026'),
    notes: cleanText(
      request.data?.notes,
      `${groupProfile.totalTravelers} personas, presupuesto 300-600 EUR/noche, buena movilidad familiar`,
    ),
    status: 'ready',
    platforms: ['Booking', 'Airbnb', 'Google Travel'],
    groupProfile,
  }
  const fallback = {
    summary: `Búsqueda preparada para ${search.city}: priorizar apartamentos completos para ${groupProfile.totalTravelers} personas y buena conexión familiar.`,
    searchQueries: [
      `${search.city} apartamento ${groupProfile.totalTravelers} personas ${search.dates}`,
      `${search.city} alojamiento familiar 4 habitaciones`,
      `${search.city} cerca metro apartamento grupo`,
    ],
    comparisonCriteria: [
      'Precio total por noche dentro de 300-600 EUR',
      `Capacidad real para ${groupProfile.totalTravelers} personas y baños suficientes`,
      'Ruta a IFEMA/MADRING en transporte público',
      'Fotos claras de habitaciones, cocina y zonas comunes',
    ],
    recommendedNextSteps: [
      'Abrir los enlaces, escoger 2-3 candidatos y enviarlos a la app para análisis profundo',
      'Confirmar cancelación, impuestos y hora de check-in',
    ],
    redFlags: [
      'Precio sin impuestos o cargos de limpieza',
      'Sofás cama como única capacidad para niños/adultos',
      'Ubicación sin metro/cercanías cómodo',
    ],
  }
  const prompt = `
Genera una estrategia de búsqueda de hospedaje para el viaje familiar.
${buildTripContext(groupProfile, subgroups, search.city)}
Datos de búsqueda:
${JSON.stringify(search)}
Responde SOLO JSON según el esquema. No inventes disponibilidad exacta.
`
  const analysis = await generateJson(lodgingSearchSchema, prompt, fallback)
  const payload = stripUndefined({
    ...search,
    links: platformLinks(search, groupProfile),
    analysis,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('searchRequests')
    .doc(scopedDocId(tripId, search.id))
    .set(
      {
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  return payload
})

export const suggestLodgingPlaces = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const city = cleanText(request.data?.city, 'Madrid')
  const dates = cleanText(request.data?.dates, '')
  const resultLimit = cleanSuggestionLimit(request.data?.limit)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const childrenStr = groupProfile.childrenAges.length > 0 ? `Niños: edades ${groupProfile.childrenAges.join(', ')}.` : 'Sin niños.'
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []
  await requireTripMember(tripId, user)

  const notes = `apartamentos o hoteles para ${groupProfile.totalTravelers} personas, familia con niños, bien valorados y ubicación central`
  const rawPlaces = await searchSuggestionCandidates('alojamiento', notes, city, resultLimit).catch((error) => {
    throw new HttpsError('unavailable', error.message)
  })
  const places = rawPlaces.map((place) => normalizePlace(place))
  const placesForRanking = places.map((place) => ({
    placeId: place.placeId,
    name: place.name,
    formattedAddress: place.formattedAddress,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    types: place.types,
  }))

  const search = { city, dates, notes, type: 'lodging' }
  const links = platformLinks(search, groupProfile)

  const fallback = {
    summary: `Encontré ${places.length} opciones de alojamiento en ${city}. Compara en Booking y Airbnb antes de decidir.`,
    rankedPlaces: places.map((place) => ({
      placeId: place.placeId,
      name: place.name,
      score: clamp(Math.round((place.rating || 4) * 18), 50, 95),
      why: `En ${city} con ${groupProfile.totalTravelers} personas — verifica capacidad y política de cancelación.`,
      caution: `Verificar capacidad para ${groupProfile.totalTravelers} personas y política de cancelación`,
      scoreBreakdown: [
        { label: 'Reseñas', v: Math.round((place.rating || 4) * 2), max: 10 },
        { label: 'Capacidad', v: 7, max: 10 },
        { label: 'Ubicación', v: 7, max: 10 },
        { label: 'Precio', v: 6, max: 10 },
      ],
      tags: [`${groupProfile.totalTravelers} personas`, place.formattedAddress ? place.formattedAddress.split(',')[0] : city, 'Verificar disponibilidad'],
      estimatedPriceRange: { min: 80, max: 200, currency: 'EUR', unit: 'noche', label: '80-200€/noche' },
    })),
  }
  const prompt = `
Eres un experto en alojamientos familiares. Ordena y evalúa estas opciones para ${groupProfile.name} — ${groupProfile.totalTravelers} personas en ${city}.
${dates ? `Fechas: ${dates}.` : ''}
${childrenStr}
${buildTripContext(groupProfile, subgroups, city)}

En tu propiedad "thinkingProcess" general (en la raíz del JSON, mínimo 2 párrafos cortos en español): realiza un análisis estratégico comparando las opciones presentadas. Explica cuál es la más viable para un grupo de 9 personas, qué retos de capacidad detectas y cómo influye el transporte en esta ciudad.

Para CADA opción en "rankedPlaces", genera:
- "why": razón concreta y específica (1-2 oraciones) de por qué este alojamiento encaja para ESTE grupo. Menciona capacidad, distancia a lugares clave, facilidad con niños, o ventajas frente a otros candidatos. NO uses frases genéricas como "buena opción" o "bien ubicado".
- "scoreBreakdown": 4 dimensiones relevantes para hospedaje familiar: "Precio" (relación calidad-precio), "Capacidad" (cabe el grupo sin problemas), "Ubicación" (cercanía a transporte y atracciones), "Reseñas" (rating Google y volumen). Cada una con valor v de 0-10 y una "note" corta (1 frase, ≤15 palabras) justificando objetivamente el puntaje.
- "tags": 2-3 etiquetas cortas y específicas como "Apto 9 personas", "A 3 min del metro", "Cocina equipada".
- "estimatedPriceRange": Precio estimado por noche para el grupo en ${city}, basado en tu conocimiento general del tipo de alojamiento (hotel, apartamento, hostal). Ej: {min:120,max:250,currency:"EUR",unit:"noche",label:"120-250€/noche"}. NOTA: Son estimaciones orientativas, no precios exactos.

Prioriza: rating Google Maps ≥ 4.3, volumen de reseñas, capacidad real para el grupo, sin hostels solo adultos.
Lugares candidatos:
${JSON.stringify(placesForRanking)}
Responde SOLO JSON según el esquema.
`
  const analysis = await generateJson(foodSearchSchema, prompt, fallback)
  const rankedById = new Map((analysis.rankedPlaces || []).map((place) => [place.placeId, place]))
  const rankedPlacesBase = places
    .map((place) => ({
      ...place,
      ...(rankedById.get(place.placeId) || {}),
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, resultLimit)
  const rankedPlaces = await Promise.all(
    rankedPlacesBase.map((place, index) => (index < 20 ? withPlacePhotos(place) : stripUndefined(place))),
  )

  const id = `lodging-${slug(city)}-${Date.now()}`
  const payload = stripUndefined({
    id,
    tripId,
    type: 'lodging',
    city,
    dates,
    notes,
    status: 'ready',
    groupProfile,
    places: rankedPlaces,
    links,
    analysis,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('searchRequests')
    .doc(scopedDocId(tripId, id))
    .set(
      {
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  return payload
})

export const suggestFoodPlaces = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const city = cleanText(request.data?.city, 'Madrid')
  const kind = cleanText(request.data?.kind, 'Comida')
  const notes = cleanText(request.data?.notes, 'restaurantes familiares bien valorados')
  const dates = cleanText(request.data?.dates, '')
  const resultLimit = cleanSuggestionLimit(request.data?.limit)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []
  await requireTripMember(tripId, user)
  const rawPlaces = await searchSuggestionCandidates(kind, notes, city, resultLimit).catch((error) => {
    throw new HttpsError('unavailable', error.message)
  })
  const places = rawPlaces.map((place) => normalizePlace(place))
  const placesForRanking = places.map((place) => ({
    placeId: place.placeId,
    name: place.name,
    formattedAddress: place.formattedAddress,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    types: place.types,
  }))
  const isFood = /comida|restaurante|cena|almuerzo|desayuno/i.test(kind)
  const isActivity = /actividad|plan|excursión|tour|museo|parque|ticket/i.test(kind)
  const childrenStr2 = groupProfile.childrenAges.length > 0 ? `Niños: edades ${groupProfile.childrenAges.join(', ')}.` : 'Sin niños.'

  const fallback = {
    summary: `Encontré ${places.length} candidatos de ${kind.toLowerCase()} en ${city}; ordenar por rating, reseñas y facilidad para grupo.`,
    rankedPlaces: places.map((place) => ({
      placeId: place.placeId,
      name: place.name,
      score: clamp(Math.round((place.rating || 4) * 18), 50, 95),
      why: `Opción destacada en ${city} para ${groupProfile.totalTravelers} personas — revisa capacidad y disponibilidad.`,
      caution: `Confirmar reserva para ${groupProfile.totalTravelers} personas y menú para niños`,
      scoreBreakdown: isFood
        ? [
            { label: 'Reseñas', v: Math.round((place.rating || 4) * 2), max: 10 },
            { label: 'Para grupo', v: 7, max: 10 },
            { label: 'Niños OK', v: groupProfile.childrenAges.length > 0 ? 7 : 5, max: 10 },
            { label: 'Precio', v: 6, max: 10 },
          ]
        : [
            { label: 'Reseñas', v: Math.round((place.rating || 4) * 2), max: 10 },
            { label: 'Niños', v: groupProfile.childrenAges.length > 0 ? 7 : 5, max: 10 },
            { label: 'Logística', v: 7, max: 10 },
            { label: 'Costo', v: 6, max: 10 },
          ],
      tags: [`${groupProfile.totalTravelers} personas`, place.formattedAddress ? place.formattedAddress.split(',')[0] : city],
      estimatedPriceRange: isFood
        ? { min: 15, max: 35, currency: 'EUR', unit: 'persona', label: '15-35€/p' }
        : { min: 10, max: 25, currency: 'EUR', unit: 'persona', label: '10-25€/p' },
    })),
  }
  const prompt = `
Eres un experto en viajes familiares. Evalúa y ordena estas opciones de "${kind}" para ${groupProfile.name} — ${groupProfile.totalTravelers} personas en ${city}.
${childrenStr2}
${buildTripContext(groupProfile, subgroups, city)}

En tu propiedad "thinkingProcess" general (en la raíz del JSON, mínimo 2 párrafos cortos en español): realiza un análisis general de las opciones para comer/planes. Explica qué opciones destacan para 9 personas, qué tan amigable es el ambiente para los niños de estas edades y qué precauciones de reserva recomiendas tomar.

Para CADA opción en "rankedPlaces", genera:
- "why": razón CONCRETA y personalizada (1-2 oraciones) de por qué esta opción encaja para ESTE grupo. Sé específico: menciona si tiene menú infantil, si acepta grupos grandes, si es fácil logísticamente, cuánto tarda, si vale la pena el precio. NUNCA uses frases genéricas como "buena opción" o "bien valorado".
${isFood
  ? '- "scoreBreakdown": 4 dimensiones: "Precio" (relación calidad-precio), "Para grupo" (apto para grupo grande), "Niños OK" (amigable con niños), "Reseñas" (calidad y volumen en Google). Cada una con valor v de 0-10 y una "note" corta (1 frase, ≤15 palabras) justificando el puntaje.'
  : isActivity
    ? '- "scoreBreakdown": 4 dimensiones: "Niños" (apto para niños de las edades del grupo), "Logística" (fácil de organizar sin complicaciones), "Costo" (valor por el precio), "Reseñas" (calidad en Google). Cada una con valor v de 0-10 y una "note" corta (1 frase, ≤15 palabras) justificando el puntaje.'
    : '- "scoreBreakdown": 4 dimensiones relevantes para esta categoría. Cada una con valor v de 0-10 y una "note" corta justificando el puntaje.'}
- "tags": 2-3 etiquetas cortas y específicas que describan lo más relevante (ej. "Mesa para 9", "Sin reserva previa", "Menú niños", "A 10 min andando").
- "estimatedPriceRange": Precio estimado basado en tu conocimiento general del tipo de lugar y la ciudad ${city}. ${isFood ? `Para restaurante: precio plato principal + bebida por persona. Ej: {min:18,max:30,currency:"EUR",unit:"persona",label:"18-30€/p"}.` : `Para actividad: precio entrada por adulto. Ej: {min:10,max:20,currency:"EUR",unit:"persona",label:"10-20€/p"}.`} NOTA: Son estimaciones orientativas, no precios exactos.

${isFood ? 'Enfócate en restaurantes: menú, reserva, espacio para grupo, apto niños. Evita planes turísticos.' : ''}
${isActivity ? 'Enfócate en horarios, entradas, duración y ritmo familiar. Evita restaurantes.' : ''}
Lugares candidatos:
${JSON.stringify(placesForRanking)}
Responde SOLO JSON según el esquema.
`
  const analysis = await generateJson(foodSearchSchema, prompt, fallback)
  const rankedById = new Map((analysis.rankedPlaces || []).map((place) => [place.placeId, place]))
  const rankedPlacesBase = places
    .map((place) => ({
      ...place,
      ...(rankedById.get(place.placeId) || {}),
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, resultLimit)
  const rankedPlaces = await Promise.all(
    rankedPlacesBase.map((place, index) => (index < 20 ? withPlacePhotos(place) : stripUndefined(place))),
  )

  const id = `food-${slug(city)}-${Date.now()}`
  const payload = stripUndefined({
    id,
    tripId,
    type: 'food',
    city,
    dates,
    notes,
    status: 'ready',
    groupProfile,
    places: rankedPlaces,
    analysis,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('searchRequests')
    .doc(scopedDocId(tripId, id))
    .set(
      {
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  return payload
})

export const suggestTransferSearch = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  await requireTripMember(tripId, user)
  const transfer = {
    id: `transfer-${Date.now()}`,
    tripId,
    type: 'transport',
    origin: cleanText(request.data?.origin, 'Madrid'),
    destination: cleanText(request.data?.destination, 'París'),
    date: cleanText(request.data?.date, '14 sep 2026'),
    notes: cleanText(request.data?.notes, 'Comparar tren, bus y avión'),
    pricePerPerson: cleanNumber(request.data?.pricePerPerson),
    status: 'ready',
    groupProfile,
  }
  const fallback = {
    summary: `Búsqueda Omio preparada para ${transfer.origin} → ${transfer.destination}. Compara tren, bus y avión antes de fijar presupuesto.`,
    comparisonCriteria: [
      'Precio por persona',
      'Duración total puerta a puerta',
      'Número de cambios o escalas',
      'Equipaje incluido',
      'Hora de salida y llegada con niños',
    ],
    recommendedNextSteps: [
      'Abrir Omio comparar y revisar tren, bus y avión',
      'Copiar el precio por persona visto y agregar el traslado al presupuesto',
    ],
    budgetNotes: [
      `Grupo: ${groupProfile.totalTravelers} personas`,
      'El presupuesto usará precio por persona multiplicado por el grupo',
    ],
  }
  const prompt = `
Prepara una guía de comparación de traslado para un viaje familiar.
Ruta: ${transfer.origin} a ${transfer.destination}.
Fecha: ${transfer.date}.
Grupo: ${groupProfile.name}, ${groupProfile.totalTravelers} personas.
Canal de búsqueda: Omio, comparando tren, bus y avión.
Notas: ${transfer.notes}
Responde SOLO JSON según el esquema. No inventes tarifas exactas si no están en la entrada.
`
  const analysis = await generateJson(transferSearchSchema, prompt, fallback)
  const payload = stripUndefined({
    ...transfer,
    links: omioLinks(transfer),
    analysis,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('searchRequests')
    .doc(scopedDocId(tripId, transfer.id))
    .set(
      {
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  return payload
})

export const generateItinerary = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const city = cleanText(request.data?.city, 'Madrid')
  const dates = cleanText(request.data?.dates, '10-14 sep 2026')
  const tripTotalDates = cleanText(request.data?.tripTotalDates, dates)
  const routeMode = cleanText(request.data?.routeMode, 'TRANSIT')
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const subgroups = normalizeItinerarySubgroups(request.data?.subgroups)
  // citySchedule: [{city, dates, notes, isBase}] — passed from frontend activeTravelCities
  const cityScheduleRaw = Array.isArray(request.data?.citySchedule) ? request.data.citySchedule : []
  await requireTripMember(tripId, user)
  const [optionsSnapshot, citiesSnapshot] = await Promise.all([
    db
      .collection('tripOptions')
      .where('tripId', '==', tripId)
      .where('status', 'in', ['active', 'pending'])
      .limit(20)
      .get(),
    db.collection('travelCities').where('tripId', '==', tripId).limit(12).get(),
  ])
  const options = optionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const citiesFromDb = citiesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

  // Merge client-side citySchedule with Firestore cities for completeness.
  // Client data wins when a city appears in both (it has more context: dates, notes).
  const cityScheduleMap = new Map(cityScheduleRaw.map((c) => [c.city?.toLowerCase(), c]))
  citiesFromDb.forEach((dbCity) => {
    const key = dbCity.city?.toLowerCase()
    if (key && !cityScheduleMap.has(key)) {
      cityScheduleMap.set(key, { city: dbCity.city, dates: dbCity.dates || '', notes: dbCity.notes || '', isBase: dbCity.isBase || false })
    }
  })
  const citySchedule = [...cityScheduleMap.values()].filter((c) => c.city)
  // Keep legacy `cities` for backward compat in fallback/payload
  const cities = citiesFromDb
  const f1FallbackSub = subgroups.find(
    (sub) => /\bf1\b/i.test(String(sub.id || '')) || /\bF1\b/.test(String(sub.name || '')),
  )
  const f1FallbackLine = f1FallbackSub
    ? `${f1FallbackSub.name || 'Subgrupo F1'} van a la carrera; el resto sigue plan alterno.`
    : 'Subgrupo F1 va a la carrera; el resto sigue plan alterno.'

  const fallback = {
    title: `Itinerario familiar ${city}`,
    summary: `Plan base con bloques suaves. ${f1FallbackLine}`,
    days: [
      {
        date: 'Jue 10 sep',
        city: 'Madrid',
        title: 'Llegada + instalación',
        familyPlan: 'Check-in, compra básica y cena fácil cerca del hospedaje.',
        f1Plan: 'Revisar ruta a IFEMA/MADRING y horarios de acceso.',
        foodIdea: 'Cena simple cerca del alojamiento.',
        routeNotes: `Calcular rutas en modo ${routeMode}.`,
        backup: 'Descanso si el viaje llega pesado.',
        energyLevel: 'Baja',
        subgroupPlans: subgroups.map((group) => ({
          groupId: group.id,
          groupName: group.name,
          timeWindow: [group.startTime, group.endTime].filter(Boolean).join('-'),
          plan: group.focus || 'Mantener agenda propia sin forzar al grupo completo.',
          budgetNote: group.budgetOptions.length
            ? `${group.budgetOptions.length} partidas de subpresupuesto a respetar.`
            : 'Subpresupuesto pendiente.',
        })),
      },
      {
        date: 'Vie 11 sep',
        city: 'Madrid',
        title: 'F1 + plan alterno suave',
        familyPlan: 'Retiro, Prado por bloques o paseo central con pausas.',
        f1Plan: f1FallbackLine,
        foodIdea: 'Comida flexible con reserva si es posible.',
        routeNotes: 'Evitar transbordos largos con niños.',
        backup: 'Plan corto de parque y helado.',
        energyLevel: 'Media',
        subgroupPlans: subgroups.map((group) => ({
          groupId: group.id,
          groupName: group.name,
          timeWindow: [group.startTime, group.endTime].filter(Boolean).join('-'),
          plan: group.focus || 'Plan paralelo con hora de reunión clara.',
          budgetNote: group.budgetOptions.length
            ? `${group.budgetOptions.length} partidas de subpresupuesto a respetar.`
            : 'Subpresupuesto pendiente.',
        })),
      },
    ],
    openQuestions: ['Elegir hospedaje final', 'Confirmar ciudad posterior al 14 de septiembre'],
  }
  // Build a human-readable city calendar for the prompt
  const cityCalendarLines = citySchedule.length
    ? citySchedule
        .map((c) => `• ${c.city}${c.dates ? ` → ${c.dates}` : ' → fechas por confirmar'}${c.notes ? ` (${c.notes})` : ''}`)
        .join('\n')
    : `• ${city} → ${tripTotalDates}`

  const prompt = `
Genera un itinerario familiar práctico. No hagas marketing; debe servir para decidir.
Contexto:
- ${buildTripContext(groupProfile, subgroups, '')}
- Fechas del viaje COMPLETO: ${tripTotalDates}. IMPORTANTE: el itinerario DEBE limitarse estrictamente a este rango. NO generes días antes ni después de estas fechas. El número total de días en el JSON debe coincidir exactamente con los días del viaje completo.
- Modo de ruta preferido: ${routeMode}.
- CALENDARIO MULTI-CIUDAD OBLIGATORIO. Asigna CADA día a la ciudad que le corresponde según este calendario. El campo "city" de cada entrada del array "days" debe ser la ciudad correcta para esa fecha:
${cityCalendarLines}
  Si un día cae dentro del rango de una ciudad, su campo city = esa ciudad. No inventes ciudades no listadas.
  Si el grupo viaja de una ciudad a otra ese día, indícalo en familyPlan/routeNotes y asigna city a la ciudad de destino.
- Subgrupos, horarios y subpresupuestos que debes respetar:
${JSON.stringify(subgroups)}
- Si un subgrupo tiene fecha/hora, usa subgroupPlans en el día correspondiente. No mezcles comida con planes: las comidas van en foodIdea o budgetNote, los planes en familyPlan/f1Plan/subgroupPlans.
- Opciones actuales confirmadas (úsalas cuando encajen con la ciudad y el día):
${JSON.stringify(options.slice(0, 14))}
Responde SOLO JSON según el esquema.
`
  const itinerary = await generateJson(itinerarySchema, prompt, fallback)
  const id = `itinerary-${slug(city)}-${Date.now()}`
  const payload = stripUndefined({
    id,
    tripId,
    city,
    dates,
    tripTotalDates,
    citySchedule: citySchedule.length ? citySchedule : undefined,
    routeMode,
    groupProfile,
    subgroups,
    ...itinerary,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('itineraries')
    .doc(scopedDocId(tripId, id))
    .set(
      {
        ...payload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  return payload
})


// ─── suggestDayTrips ────────────────────────────────────────────────────────
// Given a base city (home / no lodging needed), suggests day-trip routes:
// short loops that depart and return to the base the same day.
export const suggestDayTrips = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const baseCity = cleanText(request.data?.baseCity, 'Guardo')
  const baseCountry = cleanText(request.data?.baseCountry, 'España')
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []
  await requireTripMember(tripId, user)

  const tripCtx = buildTripContext(groupProfile, subgroups, baseCity)

  const fallback = {
    suggestions: [
      {
        id: `dt-${Date.now()}`,
        label: `${baseCity} → explorar zona`,
        route: `${baseCity} → pueblo cercano → ${baseCity}`,
        notes: 'Excursión de día por la zona',
        durationHours: 6,
      },
    ],
  }

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      thinkingProcess: { type: SchemaType.STRING },
      suggestions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            id: { type: SchemaType.STRING, description: 'unique slug, e.g. dt-aguilar-cervera' },
            label: { type: SchemaType.STRING, description: 'Short human label, e.g. "Aguilar + Cervera"' },
            route: {
              type: SchemaType.STRING,
              description: 'Full route string with times, e.g. "Guardo → Aguilar de Campoo (10:00 almuerzo) → Cervera de Pisuerga (14:00 cena) → Guardo"',
            },
            notes: {
              type: SchemaType.STRING,
              description: 'What to do / see / eat at each stop. 1-3 sentences.',
            },
            durationHours: {
              type: SchemaType.NUMBER,
              description: 'Estimated total hours for the round trip',
            },
          },
          required: ['id', 'label', 'route', 'notes', 'durationHours'],
        },
      },
    },
    required: ['thinkingProcess', 'suggestions'],
  }

  const isGuardo = baseCity.toLowerCase().includes('guardo')
  const specificGuardoGuidance = isGuardo
    ? '\nNOTA ESPECIAL PARA GUARDO: Al usuario le encanta la idea de desplazarse en coche por Cantabria y la costa, volviendo el mismo día. Sugiere explícitamente una ruta de día hacia la costa de Cantabria, por ejemplo: "Guardo → Comillas (11:00 visitar El Capricho de Gaudí) → Santander (14:00 comida frente al mar y paseo por El Sardinero) → Guardo", y otras rutas espectaculares por la zona (como Potes/Picos de Europa, la ruta del Románico Palentino, o la Montaña Palentina).\n'
    : ''

  const prompt = `
Eres un experto en viajes familiares por España.

${tripCtx}

${specificGuardoGuidance}

Ciudad base (casa, sin hospedaje): ${baseCity}, ${baseCountry}.
El grupo vive o se aloja en ${baseCity} y quiere hacer excursiones de un solo día —
salen por la mañana y regresan a dormir a ${baseCity}.

En tu propiedad "thinkingProcess" (mínimo 1 párrafo en español): analiza la geografía general desde ${baseCity}, describe los tiempos de desplazamiento razonables para el grupo de 9 personas y explica cómo equilibrar cultura, paisajes y la fatiga con niños de 5 y 9 años.

Sugiere entre 3 y 5 rutas de día distintas desde ${baseCity}.
Requisitos de cada ruta:
- Solo incluye pueblos/ciudades que se puedan visitar en un día desde ${baseCity}. Normalmente hasta 1.5h de trayecto, pero ampliable hasta 2.5h para visitas excepcionales de día completo a la costa (ej. Santander, Comillas - El Capricho de Gaudí, etc.), volviendo el mismo día a dormir a ${baseCity}.
- Propone qué hacer, dónde comer y qué ver en cada parada.
- Adapta los planes para que sean aptos para niños y adultos.
- Indica la duración total estimada de la excursión.
- Incluye hora orientativa de cada parada en el campo "route".
- Escribe en español, tono informal y familiar.

Devuelve JSON con el esquema indicado.
`.trim()

  return generateJson(schema, prompt, fallback)
})

// ─── generateText ────────────────────────────────────────────────────────────
// Like generateJson but returns a plain string; used by chatWithPlanner.
async function generateText(systemPrompt, history = [], userMessage = '', fallback = '') {
  if (!projectId) return fallback
  try {
    const vertex = new VertexAI({ project: projectId, location: vertexLocation })
    const model = vertex.getGenerativeModel({
      model: geminiModel,
      generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
      systemInstruction: systemPrompt,
    })
    // Build multi-turn contents from history + new message
    const contents = [
      ...history.map((turn) => ({
        role: turn.role,
        parts: [{ text: turn.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ]
    const result = await model.generateContent({ contents })
    return (
      result.response?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || fallback
    )
  } catch (error) {
    return `${fallback} (error: ${error.message})`
  }
}


// ─── buildTripWindow ─────────────────────────────────────────────────────────
// Returns a plain-text description of the fixed + free trip windows so the AI
// knows which dates are locked (main event) and which are available ("después").
function buildTripWindow(tripDoc, clientCtx = {}) {
  const mainCity = clientCtx.mainCity || tripDoc?.destination || tripDoc?.name || 'Madrid'
  const start = clientCtx.mainStart || tripDoc?.startDate || ''
  const end = clientCtx.mainEnd || tripDoc?.endDate || ''
  const returnDate = clientCtx.returnDate || ''

  const lines = []

  if (start && end) {
    lines.push(`VIAJE PRINCIPAL (INAMOVIBLE): ${mainCity} del ${start} al ${end}.`)
    lines.push(`No se puede cambiar ni reducir esta etapa.`)
  }

  if (end && returnDate) {
    lines.push(`VENTANA DISPONIBLE PARA CIUDADES ADICIONALES: del ${end} al ${returnDate}.`)
    lines.push(`Todas las sugerencias de ciudades extra deben caber en este período.`)
  } else if (end) {
    lines.push(`VENTANA DISPONIBLE: a partir del ${end} (fecha de regreso aún no definida).`)
  }

  if (lines.length === 0) return ''
  return lines.join('\n')
}

// ─── assessTripPlan
// Given a list of trip cities, returns a structured analysis with priorities,
// viability scores, day distribution, and transfer suggestions.
export const assessTripPlan = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []
  // Optional client-side trip context (speeds things up, no extra Firestore read needed)
  const clientCtx = request.data?.tripContext || {}
  await requireTripMember(tripId, user)

  // Fetch cities + trip doc in parallel
  const [citiesSnap, tripSnap] = await Promise.all([
    db.collection('travelCities').where('tripId', '==', tripId).limit(40).get(),
    db.collection('trips').doc(tripId).get(),
  ])
  const allCities = citiesSnap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((c) => c.status !== 'removed')

  // Deduplicate by city name (case-insensitive). Among duplicates keep the one
  // with the highest readiness score (most data filled in).
  const cityMap = new Map()
  for (const c of allCities) {
    const key = String(c.city || '').trim().toLowerCase()
    if (!key) continue
    const existing = cityMap.get(key)
    if (!existing || (c.readiness || 0) > (existing.readiness || 0)) {
      cityMap.set(key, c)
    }
  }
  const cities = Array.from(cityMap.values())

  if (!cities.length) {
    return { priorities: [], overview: 'No hay ciudades añadidas todavía.', warnings: [] }
  }

  const tripDoc = tripSnap.data() || {}
  const tripCtx = buildTripContext(groupProfile, subgroups, '')
  const windowCtx = buildTripWindow(tripDoc, clientCtx)
  const baseCities = cities.filter((c) => c.isBase)
  const normalCities = cities.filter((c) => !c.isBase)

  const cityList = cities
    .map((c) => {
      const tag = c.isBase ? '[BASE/CASA — sin pernoctar]' : '[PERNOCTAR]'
      const dates = c.dates && !['Fechas por definir', 'Base / casa'].includes(c.dates) ? ` · ${c.dates}` : ''
      const transfer = c.transfer && !['Traslado por definir', 'Sin traslado (base)'].includes(c.transfer) ? ` · traslado: ${c.transfer}` : ''
      const angle = c.angle && c.angle !== 'Pendiente de analizar con IA' ? ` — ${c.angle}` : ''
      return `- ${c.city} (${c.country}) ${tag}${dates}${transfer}${angle}`
    })
    .join('\n')

  const fallback = {
    priorities: cities.map((c, i) => ({
      city: c.city,
      rank: i + 1,
      viability: 'media',
      suggestedDays: c.isBase ? 0 : 3,
      reasoning: 'Pendiente de análisis IA.',
      transfers: [],
    })),
    overview: 'Análisis IA no disponible. Asegúrate de que las funciones estén desplegadas.',
    warnings: [],
  }

  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      overview: { type: SchemaType.STRING, description: 'Resumen ejecutivo del plan (2-3 frases).' },
      priorities: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            city: { type: SchemaType.STRING },
            rank: { type: SchemaType.NUMBER, description: '1 = máxima prioridad' },
            viability: { type: SchemaType.STRING, enum: ['alta', 'media', 'baja', 'no-recomendada'] },
            suggestedDays: { type: SchemaType.NUMBER, description: 'Días a pasar en la ciudad. 0 si es base o day-trip desde base.' },
            reasoning: { type: SchemaType.STRING, description: 'Max 1 frase corta (≤20 palabras) explicando la recomendación.' },
            transfers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Opciones de traslado recomendadas.' },
          },
          required: ['city', 'rank', 'viability', 'suggestedDays', 'reasoning', 'transfers'],
        },
      },
      warnings: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: 'Problemas detectados: demasiadas ciudades, distancias inviables, días insuficientes, etc.',
      },
    },
    required: ['overview', 'priorities', 'warnings'],
  }

  const prompt = `
Eres un experto planificador de viajes familiares por España y Europa.

${tripCtx}

${windowCtx ? `CONTEXTO DE FECHAS DEL VIAJE:\n${windowCtx}` : ''}

Ciudades en el plan "Después" (${cities.length} total: ${baseCities.length} base, ${normalCities.length} para pernoctar):
${cityList}

TAREA: Analiza la viabilidad de este plan teniendo en cuenta la ventana de tiempo disponible y devuelve:
1. Un resumen ejecutivo de 2-3 frases.
2. Cada ciudad con: rango de prioridad (1 = visitar primero), viabilidad, días recomendados, razonamiento y traslados.
3. Advertencias si hay problemas.

CRITERIOS IMPORTANTES:
- Las ciudades [BASE/CASA] tienen 0 días de pernoctar — el grupo ya tiene alojamiento ahí.
- Para ciudades cercanas a la base (≤1.5h), recomienda day-trips en lugar de pernoctar.
- Ten en cuenta la ventana disponible — si hay 10 días y 5 ciudades de pernoctar, advierte que es demasiado.
- Prioriza calidad de la experiencia sobre cantidad de ciudades.
- El grupo viaja con niños — evita planes con demasiado desplazamiento en un día.
- Los traslados deben ser realistas (AVE, bus, coche).
- Escribe en español, tono cercano y familiar.

Devuelve JSON con el esquema indicado.
`.trim()

  return generateJson(schema, prompt, fallback, { maxTokens: 16384 })
})

// ─── chatWithPlanner ─────────────────────────────────────────────────────────
// Conversational trip planner with full trip date context.
export const chatWithPlanner = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const tripId = cleanTripId(request.data?.tripId)
  const groupProfile = normalizeGroupProfile(request.data?.groupProfile)
  const subgroups = Array.isArray(request.data?.subgroups)
    ? request.data.subgroups.map((g) => normalizeGroupProfile(g))
    : []
  const history = Array.isArray(request.data?.history) ? request.data.history : []
  const message = cleanText(request.data?.message, '')
  const clientCtx = request.data?.tripContext || {}
  await requireTripMember(tripId, user)

  if (!message.trim()) return { reply: '' }

  // Fetch cities + trip doc in parallel
  const [citiesSnap, tripSnap] = await Promise.all([
    db.collection('travelCities').where('tripId', '==', tripId).limit(20).get(),
    db.collection('trips').doc(tripId).get(),
  ])
  const cities = citiesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const tripDoc = tripSnap.data() || {}

  const tripCtx = buildTripContext(groupProfile, subgroups, '')
  const windowCtx = buildTripWindow(tripDoc, clientCtx)

  const cityList = cities.length
    ? cities
        .map((c) => {
          const tag = c.isBase ? '[BASE/CASA]' : '[PERNOCTAR]'
          const dates = c.dates && !['Fechas por definir', 'Base / casa'].includes(c.dates) ? ` · ${c.dates}` : ''
          const trips = Array.isArray(c.dayTrips) && c.dayTrips.length
            ? ` · excursiones: ${c.dayTrips.map((t) => t.label).join(', ')}`
            : ''
          return `- ${c.city} (${c.country}) ${tag}${dates}${trips}`
        })
        .join('\n')
    : '(sin ciudades añadidas todavía)'

  const systemPrompt = `
Eres el planificador de viaje familiar de la app. Ayudas a decidir qué ciudades visitar, cómo organizar los días, qué traslados usar y qué planes son viables.

${tripCtx}

${windowCtx ? `FECHAS DEL VIAJE:\n${windowCtx}` : ''}

Ciudades actuales en el plan:
${cityList}

INSTRUCCIONES:
- Responde en español, tono informal y directo (como un amigo experto en viajes).
- Da opiniones claras: "sí vale", "no merece la pena", "depende de X".
- Sé concreto: sugiere traslados reales, horarios orientativos, qué hacer en cada parada.
- Recuerda siempre la ventana de fechas disponible al sugerir planes.
- El grupo viaja con niños — sin planes agotadores.
- Máximo 3-4 párrafos cortos. Sin listas largas ni bullets excesivos.
`.trim()

  const safeHistory = history.slice(-10).map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    content: String(turn.content || ''),
  }))

  const reply = await generateText(systemPrompt, safeHistory, message, 'No pude generar respuesta. Intenta de nuevo.')
  return { reply }
})
