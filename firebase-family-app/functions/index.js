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
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
const vertexLocation = process.env.VERTEX_LOCATION || 'europe-west1'
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

const functionOptions = {
  region: 'europe-west1',
  timeoutSeconds: 120,
  memory: '512MiB',
  secrets: [mapsApiKey],
}

const optionSchema = {
  type: SchemaType.OBJECT,
  properties: {
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
    summary: { type: SchemaType.STRING },
    rankedPlaces: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          placeId: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          why: { type: SchemaType.STRING },
          caution: { type: SchemaType.STRING },
        },
        required: ['placeId', 'name', 'score', 'why', 'caution'],
      },
    },
  },
  required: ['summary', 'rankedPlaces'],
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || min))
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

function getMapsKey() {
  try {
    return process.env.GOOGLE_MAPS_API_KEY || mapsApiKey.value()
  } catch {
    return ''
  }
}

async function extractMetadata(url) {
  if (!url) return {}

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
    const siteName = $('meta[property="og:site_name"]').attr('content') || hostname(url)

    return {
      title: cleanText(title).replace(/\s+/g, ' '),
      description: cleanText(description).replace(/\s+/g, ' '),
      image: cleanUrl(image),
      siteName: cleanText(siteName, hostname(url)),
      sourceStatus: response.status,
    }
  } catch (error) {
    return {
      sourceStatus: 'unavailable',
      sourceNote: error.message,
    }
  }
}

async function searchPlaces(textQuery, maxResultCount = 5) {
  const key = getMapsKey()
  if (!key || !textQuery) return []

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri,places.priceLevel,places.types',
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'es',
      regionCode: 'ES',
      maxResultCount,
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Places respondió HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.places || []
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
  }
}

async function computeRoute(origin, travelMode) {
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
          latLng: ifemaCoords,
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

async function computeRoutes(origin) {
  const modes = ['TRANSIT', 'WALK', 'DRIVE']
  const results = await Promise.all(
    modes.map(async (mode) => {
      try {
        return [mode, await computeRoute(origin, mode)]
      } catch {
        return [mode, null]
      }
    }),
  )

  return Object.fromEntries(results.filter(([, route]) => route))
}

function estimatePriceFromText(text) {
  const match = cleanText(text).match(/(\d{2,5})(?:\s|\.|,)*(?:€|eur|euro)/i)
  return match ? Number(match[1]) : null
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
  const combinedText = `${input.notes} ${metadata.description || ''}`
  const priceNight = estimatePriceFromText(combinedText)
  const score = heuristicScore(input, place, routes, priceNight)

  return {
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
    priceTotal: priceNight ? priceNight * 4 : null,
    rating: place?.rating ? `${place.rating}/5` : 'Pendiente de validar',
    reviews: place?.userRatingCount || null,
    capacity: input.targetGroup === 'f1' ? 'Subgrupo F1' : 'Por verificar para 9 personas',
    transit: routeSummary(routes),
    aiScore: score,
    highlights: [
      place?.formattedAddress || metadata.description || 'Información inicial capturada',
      routeSummary(routes),
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

function optionFromAnalysis(input, analysis, metadata, place, routes, user) {
  const createdAt = Date.now()
  const title = cleanText(analysis.title, input.title || metadata.title || 'Nueva opción')
  const id = `${input.category}-${slug(title)}-${createdAt}`

  return stripUndefined({
    id,
    code: input.category === 'lodging' ? 'IA' : input.category === 'food' ? 'IC' : 'IP',
    category: input.category,
    title,
    source: cleanText(analysis.source, metadata.siteName || hostname(input.url)),
    city: cleanText(analysis.city, input.city),
    status: 'pending',
    url: input.url,
    image: metadata.image || '',
    priceNight: analysis.priceNight ?? null,
    priceTotal: analysis.priceTotal ?? null,
    rating: cleanText(analysis.rating, 'Pendiente'),
    reviews: analysis.reviews ?? null,
    capacity: cleanText(analysis.capacity, 'Por verificar'),
    transit: cleanText(analysis.transit, routeSummary(routes)),
    targetGroup: cleanText(analysis.targetGroup, input.targetGroup),
    aiScore: clamp(analysis.aiScore, 25, 99),
    map: { x: 52, y: 50 },
    coords: place?.location || null,
    highlights: (analysis.highlights || []).slice(0, 4),
    cautions: (analysis.cautions || []).slice(0, 4),
    aiSummary: analysis.summary || '',
    aiQuestions: analysis.questions || [],
    routeModes: routes,
    createdBy: user.uid,
    createdByName: user.name,
  })
}

async function generateJson(schema, prompt, fallback) {
  if (!projectId) return fallback

  try {
    const vertex = new VertexAI({ project: projectId, location: vertexLocation })
    const model = vertex.getGenerativeModel({
      model: geminiModel,
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 4096,
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
    return {
      ...fallback,
      aiFallbackReason: error.message,
    }
  }
}

function platformLinks(search) {
  const city = encodeURIComponent(search.city || 'Madrid')
  const query = encodeURIComponent(`${search.city || 'Madrid'} alojamiento 9 personas`)

  return [
    {
      label: 'Booking',
      url: `https://www.booking.com/searchresults.es.html?ss=${city}&group_adults=6&group_children=3`,
    },
    {
      label: 'Airbnb',
      url: `https://www.airbnb.com/s/${city}/homes?adults=6&children=3`,
    },
    {
      label: 'Google Travel',
      url: `https://www.google.com/travel/search?q=${query}`,
    },
  ]
}

export const analyzeTripOption = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const input = {
    title: cleanText(request.data?.title),
    url: cleanUrl(request.data?.url),
    category: cleanText(request.data?.category, 'lodging'),
    city: cleanText(request.data?.city, 'Madrid'),
    targetGroup: cleanText(request.data?.targetGroup, 'family'),
    notes: cleanText(request.data?.notes),
    dates: cleanText(request.data?.dates, '10-14 sep 2026'),
  }

  if (!input.url && !input.title && !input.notes) {
    throw new HttpsError('invalid-argument', 'Envía al menos un link, nombre o nota.')
  }

  const jobRef = db.collection('analysisJobs').doc()
  await jobRef.set({
    type: 'tripOption',
    status: 'running',
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
  const place = rawPlaces[0] ? normalizePlace(rawPlaces[0]) : null
  const routes = place?.location ? await computeRoutes(place.location) : {}
  const fallback = buildFallbackAnalysis(input, metadata, place, routes)
  const prompt = `
Eres el copiloto IA del viaje familiar de Camilo a Madrid/F1 2026.

Contexto fijo:
- Viajeros: 9 personas.
- F1: Camilo, Juliana Bueno y Fernando.
- Madrid/F1: 10 al 14 de septiembre de 2026.
- Presupuesto hospedaje orientativo: 300 a 600 EUR/noche total.
- Prioridad: alojamiento completo, logística fácil con niños, espacios comunes, ruta razonable a IFEMA/MADRING.

Analiza esta opción y responde SOLO el JSON del esquema:
${JSON.stringify({ input, metadata, place, routes })}
`
  const analysis = await generateJson(optionSchema, prompt, fallback)
  const option = optionFromAnalysis(input, analysis, metadata, place, routes, user)

  await db
    .collection('tripOptions')
    .doc(option.id)
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
      }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return stripUndefined({ jobId: jobRef.id, option, analysis, metadata, routes })
})

export const suggestLodgingSearch = onCall(functionOptions, async (request) => {
  const user = requireAuth(request)
  const search = {
    id: `search-${Date.now()}`,
    type: 'lodging',
    city: cleanText(request.data?.city, 'Madrid'),
    dates: cleanText(request.data?.dates, '10-14 sep 2026'),
    notes: cleanText(
      request.data?.notes,
      '9 personas, presupuesto 300-600 EUR/noche, buena movilidad familiar',
    ),
    status: 'ready',
    platforms: ['Booking', 'Airbnb', 'Google Travel'],
  }
  const fallback = {
    summary: `Búsqueda preparada para ${search.city}: priorizar apartamentos completos para 9 personas y buena conexión familiar.`,
    searchQueries: [
      `${search.city} apartamento 9 personas ${search.dates}`,
      `${search.city} alojamiento familiar 4 habitaciones`,
      `${search.city} cerca metro apartamento grupo`,
    ],
    comparisonCriteria: [
      'Precio total por noche dentro de 300-600 EUR',
      'Capacidad real para 9 personas y baños suficientes',
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
Familia: 9 viajeros, niños de 18, 9 y 5 años. F1 solo para Camilo, Juliana Bueno y Fernando.
Datos de búsqueda:
${JSON.stringify(search)}
Responde SOLO JSON según el esquema. No inventes disponibilidad exacta.
`
  const analysis = await generateJson(lodgingSearchSchema, prompt, fallback)
  const payload = stripUndefined({
    ...search,
    links: platformLinks(search),
    analysis,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('searchRequests')
    .doc(search.id)
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
  const city = cleanText(request.data?.city, 'Madrid')
  const notes = cleanText(request.data?.notes, 'restaurantes familiares bien valorados')
  const rawPlaces = await searchPlaces(`${notes} en ${city}`, 8).catch((error) => {
    throw new HttpsError('unavailable', error.message)
  })
  const places = rawPlaces.map(normalizePlace)
  const fallback = {
    summary: `Encontré ${places.length} lugares candidatos en ${city}; ordenar por rating, reseñas y facilidad para grupo.`,
    rankedPlaces: places.map((place) => ({
      placeId: place.placeId,
      name: place.name,
      score: clamp(Math.round((place.rating || 4) * 18), 50, 95),
      why: place.formattedAddress || 'Buena opción para revisar en Maps',
      caution: 'Confirmar reserva para 9 personas y menú para niños',
    })),
  }
  const prompt = `
Ordena estas opciones de comida para una familia de 9 personas en ${city}.
Niños: 18, 9 y 5 años. Prioriza reservas fáciles, comida flexible, buena ubicación y reseñas.
Lugares de Google Places:
${JSON.stringify(places)}
Responde SOLO JSON según el esquema.
`
  const analysis = await generateJson(foodSearchSchema, prompt, fallback)
  const rankedById = new Map((analysis.rankedPlaces || []).map((place) => [place.placeId, place]))
  const rankedPlaces = places
    .map((place) => ({
      ...place,
      ...(rankedById.get(place.placeId) || {}),
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0))

  const id = `food-${slug(city)}-${Date.now()}`
  const payload = stripUndefined({
    id,
    type: 'food',
    city,
    notes,
    status: 'ready',
    places: rankedPlaces,
    analysis,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('searchRequests')
    .doc(id)
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
  const city = cleanText(request.data?.city, 'Madrid')
  const dates = cleanText(request.data?.dates, '10-14 sep 2026')
  const routeMode = cleanText(request.data?.routeMode, 'TRANSIT')
  const [optionsSnapshot, citiesSnapshot] = await Promise.all([
    db.collection('tripOptions').where('status', 'in', ['active', 'pending']).limit(20).get(),
    db.collection('travelCities').limit(12).get(),
  ])
  const options = optionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const cities = citiesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  const fallback = {
    title: `Itinerario familiar ${city}`,
    summary:
      'Plan base con bloques suaves, F1 separado para Camilo, Juliana Bueno y Fernando, y alternativas familiares.',
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
      },
      {
        date: 'Vie 11 sep',
        city: 'Madrid',
        title: 'F1 + plan alterno suave',
        familyPlan: 'Retiro, Prado por bloques o paseo central con pausas.',
        f1Plan: 'Camilo, Juliana Bueno y Fernando van a F1.',
        foodIdea: 'Comida flexible con reserva si es posible.',
        routeNotes: 'Evitar transbordos largos con niños.',
        backup: 'Plan corto de parque y helado.',
        energyLevel: 'Media',
      },
    ],
    openQuestions: ['Elegir hospedaje final', 'Confirmar ciudad posterior al 14 de septiembre'],
  }
  const prompt = `
Genera un itinerario familiar práctico. No hagas marketing; debe servir para decidir.
Contexto:
- Familia de 9 personas.
- Camilo, Juliana Bueno y Fernando van a F1; el resto necesita planes alternos.
- Niños: Juliancho 18, Juanfe 9, Guillermo 5.
- Ciudad base solicitada: ${city}.
- Fechas: ${dates}.
- Modo de ruta preferido: ${routeMode}.
- Opciones actuales:
${JSON.stringify(options.slice(0, 14))}
- Ciudades candidatas posteriores:
${JSON.stringify(cities)}
Responde SOLO JSON según el esquema.
`
  const itinerary = await generateJson(itinerarySchema, prompt, fallback)
  const id = `itinerary-${slug(city)}-${Date.now()}`
  const payload = stripUndefined({
    id,
    city,
    dates,
    routeMode,
    ...itinerary,
    createdBy: user.uid,
    createdByName: user.name,
  })

  await db
    .collection('itineraries')
    .doc(id)
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
