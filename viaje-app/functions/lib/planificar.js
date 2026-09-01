/**
 * Calcular una ruta: donde cae cada sitio, si abre, y a que hora se llega.
 *
 * Vivia dentro de `rutas.js`, mezclado con la escritura en Firestore, y esa
 * mezcla era justo lo que impedia ensenar la ruta ANTES de meterla en la
 * agenda: no habia forma de calcularla sin escribirla. Separarlo es lo que
 * permite las tres cosas que hacen falta ahora — proponer, recalcular
 * despues de que alguien quite una parada, y guardar — sin repetir la logica
 * tres veces ni, peor, dejar que el cliente mande las horas.
 *
 * LA FRONTERA NO SE MUEVE: el modelo pone nombres y orden; el cliente puede
 * quitar paradas y cambiar la hora de arranque; **las horas las calcula
 * siempre este archivo**, contra Places y Routes. Ni una hora de llegada ni
 * un tiempo de trayecto entra desde fuera.
 */
import { computeRoute, momentoDeSalida, normalizePlace, searchPlaces } from './maps.js'
import { abiertoEl, horarioDelDia, ordenarPorNota, quitarLosFlojos } from './ranking.js'
import { choques, encadenar, MAX_PARADAS } from './itinerario.js'
import { cleanText } from './text.js'

export const TIPOS = ['activity', 'food', 'transport', 'lodging']

/**
 * El mejor sitio para un nombre suelto, ya ordenado por nota ponderada.
 *
 * Se piden 8 y se devuelve 1: el primero de Google es el mas parecido al
 * texto, no el mejor. Pedir 8 y quedarse con el mejor valorado cuesta lo
 * mismo que pedir 1 —Places cobra por peticion, no por resultado— y es la
 * diferencia entre la terraza de la esquina y la que va a recordar la
 * familia.
 */
async function mejorSitio(nombre, ciudad) {
  const crudos = await searchPlaces(nombre, 8, ciudad)
  if (crudos.length === 0) return null
  const [mejor] = ordenarPorNota(quitarLosFlojos(crudos.map(normalizePlace)))
  return mejor?.location ? mejor : null
}

/**
 * De nombres sueltos a paradas situadas en el mapa.
 *
 * Es la parte cara: una peticion a Places por parada. Por eso solo se hace
 * UNA vez, al proponer. Cuando alguien quita una parada del borrador no se
 * vuelve a resolver nada: las que quedan ya traen sus coordenadas.
 */
export async function resolverParadas(pedidas, ciudad) {
  const avisos = []
  const resueltas = await Promise.all(pedidas.slice(0, MAX_PARADAS).map(async (p) => {
    const nombre = cleanText(p?.nombre ?? '').slice(0, 140)
    if (!nombre) return null
    const sitio = await mejorSitio(nombre, cleanText(p?.ciudad ?? '') || ciudad).catch(() => null)
    if (!sitio) return { nombre, sinSitio: true }
    return {
      titulo: sitio.name,
      pedido: nombre,
      tipo: TIPOS.includes(p?.tipo) ? p.tipo : 'activity',
      minutos: Number.isFinite(p?.minutos) ? Number(p.minutos) : null,
      direccion: sitio.formattedAddress,
      coords: sitio.location,
      placeId: sitio.placeId,
      nota: sitio.rating ?? null,
      resenas: sitio.userRatingCount ?? null,
      horario: sitio.horario ?? null,
    }
  }))

  for (const r of resueltas) {
    if (r?.sinSitio) avisos.push(`No encontré «${r.nombre}»${ciudad ? ` en ${ciudad}` : ''}: la dejo fuera.`)
  }

  return { paradas: resueltas.filter((r) => r && !r.sinSitio), avisos }
}

/**
 * Las paradas que vuelven del navegador, limpias.
 *
 * El cliente manda la lista que quedo despues de que alguien quitara alguna.
 * Se acepta el sitio (nombre, coordenadas, placeId) porque eso ya se resolvio
 * contra Places al proponer y volver a preguntarlo seria pagar dos veces por
 * lo mismo — y porque un adulto ya puede escribir esas coordenadas creando un
 * plan a mano, asi que aceptarlas aqui no abre nada nuevo.
 *
 * Lo que NO se acepta es una sola hora: llegada, salida y traslados se
 * recalculan enteros abajo.
 */
export function limpiarParadas(brutas) {
  return (Array.isArray(brutas) ? brutas : []).slice(0, MAX_PARADAS).map((p) => {
    const lat = Number(p?.coords?.lat)
    const lng = Number(p?.coords?.lng)
    if (!cleanText(p?.titulo) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return {
      titulo: cleanText(p.titulo).slice(0, 140),
      tipo: TIPOS.includes(p?.tipo) ? p.tipo : 'activity',
      minutos: Number.isFinite(p?.minutos) && p.minutos > 0 ? Math.min(Number(p.minutos), 480) : null,
      direccion: cleanText(p?.direccion ?? '').slice(0, 200) || null,
      coords: { lat, lng },
      placeId: cleanText(p?.placeId ?? '').slice(0, 120) || null,
      nota: Number.isFinite(p?.nota) ? Number(p.nota) : null,
      resenas: Number.isFinite(p?.resenas) ? Number(p.resenas) : null,
      horario: p?.horario ?? null,
    }
  }).filter(Boolean)
}

/**
 * El reloj de la ruta, en DOS PASADAS. No es un capricho.
 *
 * El tiempo de traslado depende de la hora a la que se sale, y la hora a la
 * que se sale depende de los traslados anteriores. Se encadena primero sin
 * traslados para tener una hora aproximada de cada tramo, se preguntan las
 * rutas PARA ESAS HORAS, y se vuelve a encadenar con los tiempos reales.
 * Preguntar «cuanto se tarda ahora» un dia que aun no ha llegado fue
 * exactamente el fallo que se midio el 30 de agosto: 1 h 15 min en lugar de
 * 39.
 */
export async function calcularTramos({ paradas, dia, modo, horaInicio }) {
  const avisos = []

  const tanteo = encadenar(paradas, horaInicio, [])

  const traslados = []
  for (let i = 0; i < paradas.length - 1; i += 1) {
    const cuando = momentoDeSalida(dia, tanteo[i].salida)
    const r = await computeRoute(paradas[i].coords, modo, {
      latitude: paradas[i + 1].coords.lat, longitude: paradas[i + 1].coords.lng,
    }, cuando).catch(() => null)
    traslados.push(r?.durationSeconds ? Math.round(r.durationSeconds / 60) : null)
    if (!r) avisos.push(`No pude calcular el trayecto de «${paradas[i].titulo}» a «${paradas[i + 1].titulo}».`)
  }

  const tramos = encadenar(paradas, horaInicio, traslados)

  for (const t of tramos) {
    const abre = abiertoEl(t.horario, dia, t.llegada)
    if (abre === false) {
      const cuando = horarioDelDia(t.horario, dia)
      avisos.push(`«${t.titulo}» está cerrado a las ${t.llegada}${cuando ? ` (${cuando})` : ''}.`)
    }
    if (t.seSalePorArriba) avisos.push(`La ruta se pasa de medianoche en «${t.titulo}».`)
  }

  return { tramos, avisos }
}

/** Los choques con lo que ya estaba reservado ese dia. */
export const choquesCon = choques
