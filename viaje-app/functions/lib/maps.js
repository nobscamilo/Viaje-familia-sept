// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Google Places (Text Search + Photos) y Routes API.
// TODO(bloque 2): partir en maps/places.js y maps/routes.js.
import { cityKey, clamp, cleanText, slug, stripUndefined } from './text.js'
import { mapsApiKey } from './secrets.js'

/**
 * Destino por defecto de las rutas: el circuito de IFEMA.
 *
 * En el proyecto anterior esta constante vivia lejos, en la cabecera del
 * archivo de 2.595 lineas, y al rescatar el modulo se quedo colgando. La
 * funcion compilaba y reventaba en tiempo de ejecucion.
 *
 * Formato {latitude, longitude} porque es lo que espera la Routes API.
 */
export const ifemaCoords = { latitude: 40.4653, longitude: -3.6161 }

/** Del valor de la API al nombre que entiende la interfaz. */
const MODO_ES = { TRANSIT: 'transporte', DRIVE: 'coche', WALK: 'andando', BICYCLE: 'bici' }

/** De {lat,lng} —lo que devuelve normalizePlace— al formato de Routes. */
export const aLatLng = (p) =>
  p && typeof p.lat === 'number' ? { latitude: p.lat, longitude: p.lng } : p

/**
 * Tope de resultados de Places por busqueda.
 *
 * Faltaba: `searchPlaces` hacia `clamp(n, 1, placesTextSearchLimit)` con la
 * constante sin definir, asi que el tope salia `undefined`, el clamp devolvia
 * NaN y la API respondia sin resultados. La busqueda "funcionaba" y no
 * encontraba nada nunca — el peor tipo de fallo, porque no rompe.
 */
const placesTextSearchLimit = 20

/** Centros de las ciudades del viaje, para acotar rutas y busquedas. */
const cityCenters = {
  madrid: { latitude: 40.4168, longitude: -3.7038 },
  barcelona: { latitude: 41.3874, longitude: 2.1686 },
  paris: { latitude: 48.8566, longitude: 2.3522 },
  bilbao: { latitude: 43.2630, longitude: -2.9350 },
}

/** Punto de referencia de una ciudad; por defecto, el circuito. */
export function destinationForCity(city) {
  return cityCenters[cityKey(city)] || ifemaCoords
}

/**
 * Paris no esta en Espana, y `regionCode` lo daba por hecho.
 *
 * La busqueda iba con `regionCode: 'ES'` fijo para las cuatro ciudades del
 * viaje, tres dias de las cuales son en Francia.
 */
const cityRegions = { paris: 'FR' }
export function regionForCity(city) {
  return cityRegions[cityKey(city)] || 'ES'
}

/**
 * El radio del sesgo de busqueda, en metros.
 *
 * 25 km cubre cualquiera de las cuatro ciudades y sus alrededores sin llegar
 * a la siguiente provincia. No es un tope duro: Places lo usa como sesgo, no
 * como filtro, asi que un sitio famoso un poco mas lejos sigue apareciendo.
 */
const RADIO_CIUDAD = 25_000

export function getMapsKey() {
  try {
    return process.env.GOOGLE_MAPS_API_KEY || mapsApiKey.value()
  } catch {
    return ''
  }
}

/**
 * Busca sitios, SESGADA a una ciudad.
 *
 * El 30 de agosto de 2026 se midio lo que devolvia sin sesgo, y es de las
 * cosas mas caras que ha tenido esta app:
 *
 *   «Sol»       -> Bar el Sol, Velilla del Rio Carrion, a 282 km de IFEMA
 *   «circuito»  -> Karting El Pinar, Leon, a 286 km
 *   «el hotel»  -> Hotel El Tremazal, Guardo, a 279 km
 *
 * Los tres caen cerca de Guardo: sin sesgo, Places resuelve hacia donde
 * parece venir la peticion. El copiloto calculaba rutas desde un pueblo de
 * Palencia y las daba por buenas — de ahi salio un «15 horas y 7 minutos»
 * para ir de Sol a IFEMA.
 *
 * `ciudad` es el nombre tal cual sale en la agenda: «Madrid», «Barcelona»,
 * «Paris», «Bilbao». Sin ciudad se busca como antes, que es mejor que fallar,
 * pero quien llame deberia darla siempre.
 */
export async function searchPlaces(textQuery, maxResultCount = 5, ciudad = null) {
  const key = getMapsKey()
  if (!key || !textQuery) return []
  const safeMaxResultCount = clamp(maxResultCount, 1, placesTextSearchLimit)
  const centro = ciudad ? cityCenters[cityKey(ciudad)] : null

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,'
        + 'places.userRatingCount,places.googleMapsUri,places.priceLevel,places.types,'
        // El horario no es un adorno: un 4,8 cerrado el lunes es un 0.
        + 'places.photos,places.regularOpeningHours',
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'es',
      regionCode: regionForCity(ciudad),
      maxResultCount: safeMaxResultCount,
      ...(centro
        ? { locationBias: { circle: { center: centro, radius: RADIO_CIUDAD } } }
        : {}),
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Places respondió HTTP ${response.status}`)
  }

  const data = await response.json()
  return data.places || []
}

export function suggestionSearchQueries(kind, notes, city) {
  return [
    `${notes} en ${city}`,
    `${kind} mejor valorados en ${city}`,
    `${kind} con muchas reseñas en ${city}`,
    `${kind} recomendados para familias en ${city}`,
  ]
    .map((queryText) => cleanText(queryText))
    .filter((queryText, index, list) => queryText && list.indexOf(queryText) === index)
}

export async function searchSuggestionCandidates(kind, notes, city, resultLimit) {
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

export function photoCredit(photo) {
  const names = (photo?.authorAttributions || [])
    .map((author) => cleanText(author.displayName))
    .filter(Boolean)
    .slice(0, 2)

  return names.length ? `Foto: ${names.join(', ')}` : 'Foto: Google Maps'
}

export async function getPlacePhotoUri(photoName) {
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

export function normalizePlace(place) {
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
    horario: place.regularOpeningHours || null,
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

export async function withPlacePhotos(normalized) {
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

export async function normalizePlaceWithPhoto(place) {
  return withPlacePhotos(normalizePlace(place))
}

/**
 * Cuando se viaja, en RFC3339. Null si no se sabe o si ya pasó.
 *
 * La Routes API exige que `departureTime` sea futuro; con una fecha pasada
 * responde 400 y nos quedariamos sin ruta. Mejor calcular para ahora que no
 * calcular.
 */
export function momentoDeSalida(dia, hora = '12:00') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '')) return null
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/.test(hora ?? '') ? hora : '12:00'
  // Las horas del viaje son de Madrid y Paris: +02:00 en septiembre.
  const t = new Date(`${dia}T${hhmm}:00+02:00`)
  if (Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) return null
  return t.toISOString()
}

/**
 * Ruta entre dos puntos, PARA UN MOMENTO CONCRETO.
 *
 * Sin `cuando`, la Routes API calcula para ahora, y en transporte publico eso
 * no es un matiz: medido el 30 de agosto de 2026, Sol -> IFEMA daba
 * **1 h 10 min** a medianoche y **39 minutos** el domingo de carrera a las
 * 13:00. La app estaba dando un numero 31 minutos peor justo en lo unico que
 * sirve para planificar un dia que aun no ha llegado.
 *
 * Y en coche hay que pedir ademas `TRAFFIC_AWARE`: con `departureTime` sobre
 * el modo por defecto la API responde
 * «Timestamp cannot be set for TRAFFIC_UNAWARE routing mode».
 */
export async function computeRoute(origin, travelMode, destination = ifemaCoords, cuando = null) {
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
      ...(cuando ? { departureTime: cuando } : {}),
      // El trafico solo se puede pedir en coche y en moto; en el resto de
      // modos la API rechaza la peticion entera.
      ...(cuando && travelMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) return null

  const data = await response.json()
  const route = data.routes?.[0]
  if (!route) return null

  return {
    mode: travelMode,
    // En español y con el nombre que lee la interfaz. Antes solo salia `mode`
    // en ingles, la tarjeta leia `modo`, y las tres rutas de una respuesta
    // aparecian con el mismo icono de tren diciendo «RUTA»: en coche, en bici
    // y en metro, identicas.
    modo: MODO_ES[travelMode] ?? 'ruta',
    cuando,
    duration: route.localizedValues?.duration?.text || route.duration || '',
    // «39 min» sirve para leer; para encadenar el reloj de una ruta hacen
    // falta numeros. La API los da como «2345s».
    durationSeconds: Number.parseInt(String(route.duration ?? ''), 10) || null,
    distance: route.localizedValues?.distance?.text || `${route.distanceMeters || 0} m`,
    distanceMeters: route.distanceMeters || null,
  }
}

export async function computeRoutes(origin, destination = ifemaCoords) {
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

export function routeSummary(routes) {
  const transit = routes.TRANSIT?.duration
  const walk = routes.WALK?.duration
  const drive = routes.DRIVE?.duration
  const parts = []
  if (transit) parts.push(`TP ${transit}`)
  if (walk) parts.push(`andando ${walk}`)
  if (drive) parts.push(`coche ${drive}`)
  return parts.join(' · ') || 'Ruta por calcular'
}

/**
 * Convierte un sitio escrito a mano en direccion y coordenadas.
 *
 * Devuelve null sin ruido si Places no encuentra nada o si falla: un plan sin
 * pin sigue siendo un plan util, y romper el «agregar al plan» porque el mapa
 * no pudo resolver una direccion seria cambiar algo que funciona por algo que
 * decora.
 */
export async function resolverSitio(texto, ciudad = null) {
  if (!texto) return null
  try {
    // Sin `ciudad` esta era la ultima puerta por la que seguia entrando el
    // fallo de Guardo: se arreglo la busqueda del copiloto y se dejo sin
    // sesgo justo la llamada que ESCRIBE el pin en la agenda.
    const [primero] = await searchPlaces(texto, 1, ciudad)
    if (!primero) return null
    const p = normalizePlace(primero)
    if (!p.location) return null
    return {
      address: (p.formattedAddress || texto).slice(0, 200),
      coords: { lat: p.location.lat, lng: p.location.lng },
    }
  } catch {
    return null
  }
}
