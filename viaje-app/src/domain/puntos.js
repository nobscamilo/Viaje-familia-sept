/**
 * De la agenda a puntos en un mapa.
 *
 * Las coordenadas no se calculan aqui ni en la app: se geocodificaron una vez
 * con `scripts/geocodificar.mjs` y viven en `src/data/coordenadas.js`. Un
 * evento sin coordenadas simplemente no sale en el mapa, y eso no es un fallo.
 */
import { COORDENADAS } from '../data/coordenadas.js'
import { diaDelViaje } from './dates.js'

const ORDEN = (a, b) => String(a.start).localeCompare(String(b.start))

/**
 * De donde salen las coordenadas de un evento, en este orden:
 *
 * 1. `evento.coords`, que es lo que guarda el copiloto cuando alguien le pide
 *    agregar un plan: la Cloud Function resuelve el sitio contra Places y
 *    escribe la latitud y la longitud en el propio documento.
 * 2. `coordenadas.js`, la tabla precalculada de los momentos que venian con
 *    el viaje desde el principio.
 *
 * Primero lo del evento a proposito: si alguien corrige el sitio de un plan,
 * lo suyo manda sobre la tabla.
 */
function coordsDe(evento) {
  const c = evento.coords
  if (Number.isFinite(c?.lat) && Number.isFinite(c?.lng)) {
    return { lat: c.lat, lng: c.lng, etiqueta: evento.address ?? evento.title }
  }
  return COORDENADAS[evento.id] ?? null
}

/** Todos los eventos que se pueden pintar, en orden. */
export function puntosDelViaje(timeline) {
  return [...timeline]
    .map((e) => ({ evento: e, c: coordsDe(e) }))
    .filter(({ c }) => c)
    .sort((a, b) => ORDEN(a.evento, b.evento))
    .map(({ evento: e, c }, i) => ({
      id: e.id,
      numero: i + 1,
      lat: c.lat,
      lng: c.lng,
      etiqueta: c.etiqueta,
      titulo: e.title,
      kind: e.kind,
      status: e.status ?? 'confirmado',
      delCopiloto: Boolean(e.createdByCopiloto),
      start: e.start,
      dia: String(e.start).slice(0, 10),
      address: e.address ?? null,
      // Las paradas de una misma ruta comparten `rutaId`. Es lo que permite
      // unirlas con una linea en vez de dejar seis pines sueltos que no se
      // sabe en que orden se visitan.
      rutaId: e.rutaId ?? null,
      rutaOrden: Number.isFinite(e.rutaOrden) ? e.rutaOrden : null,
      rutaNombre: e.rutaNombre ?? null,
    }))
}

/**
 * Los de un dia concreto, renumerados desde 1.
 *
 * Si se dejan los numeros del viaje entero, el mapa del viernes empieza en el
 * pin 5 y la lista de al lado tambien: parece que faltan cuatro sitios.
 */
export function puntosDelDia(timeline, dia) {
  return puntosDelViaje(timeline)
    .filter((p) => p.dia === dia)
    .map((p, i) => ({ ...p, numero: i + 1 }))
}

/** Los dias del viaje que tienen algo que pintar. */
export function diasConPuntos(timeline) {
  return [...new Set(puntosDelViaje(timeline).map((p) => p.dia))].sort()
}

/**
 * El dia que hay que enseñar al abrir: hoy si el viaje esta en marcha y hoy
 * tiene algo; si no, el primer dia con puntos. Abrir el mapa en el dia 10
 * cuando estas a 22 de septiembre no le sirve a nadie.
 */
export function diaPorDefecto(timeline, ahora = new Date()) {
  const dias = diasConPuntos(timeline)
  if (dias.length === 0) return null
  const hoy = diaDelViaje(ahora)
  return dias.includes(hoy) ? hoy : (dias.find((d) => d >= hoy) ?? dias[0])
}

/** El encuadre que cabe a todos los puntos. Un solo punto: zoom fijo. */
export function encuadre(puntos) {
  if (puntos.length === 0) return null
  const lats = puntos.map((p) => p.lat)
  const lngs = puntos.map((p) => p.lng)
  return {
    sur: Math.min(...lats), norte: Math.max(...lats),
    oeste: Math.min(...lngs), este: Math.max(...lngs),
    centro: { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 },
    unico: puntos.length === 1,
  }
}

/**
 * Los recorridos que hay entre estos puntos, cada uno con sus paradas en
 * orden.
 *
 * Un recorrido de una sola parada no es un recorrido: no se devuelve, porque
 * dibujar una linea de un punto a si mismo no dice nada. Puede pasar si
 * alguien confirma una parada y quita las demas.
 */
export function recorridos(puntos = []) {
  const porRuta = new Map()
  for (const p of puntos) {
    if (!p.rutaId) continue
    if (!porRuta.has(p.rutaId)) porRuta.set(p.rutaId, [])
    porRuta.get(p.rutaId).push(p)
  }
  return [...porRuta.entries()]
    .map(([id, ps]) => ({
      id,
      nombre: ps[0].rutaNombre ?? 'Ruta',
      paradas: [...ps].sort((a, b) => (a.rutaOrden ?? 0) - (b.rutaOrden ?? 0)),
    }))
    .filter((r) => r.paradas.length > 1)
}
