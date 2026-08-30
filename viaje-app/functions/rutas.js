/**
 * Rutas de turismo: varias paradas encadenadas, con horas de verdad.
 *
 * Hasta ahora el copiloto sabia meter UN plan. «Armame una ruta por el gotico
 * el domingo» acababa en un parrafo bonito que no dejaba nada en la agenda, o
 * en cinco llamadas a `agregarAlPlan` con horas inventadas por el modelo.
 *
 * Lo que el modelo pone aqui son nombres y un orden. Todo lo demas —donde
 * cae cada sitio, si abre ese dia, cuanto se tarda de uno a otro y a que hora
 * se llega— lo calcula este archivo contra Places y Routes. Es la misma
 * frontera de siempre: el modelo redacta, el servidor cuenta.
 *
 * DOS PASADAS, y no es un capricho. El tiempo de traslado depende de la hora
 * a la que se sale, y la hora a la que se sale depende de los traslados
 * anteriores. Se encadena primero sin traslados para tener una hora
 * aproximada de cada tramo, se preguntan las rutas PARA ESAS HORAS, y se
 * vuelve a encadenar con los tiempos reales. Preguntar «cuanto se tarda
 * ahora» un dia que aun no ha llegado fue exactamente el fallo que se midio
 * el 30 de agosto: 1 h 15 min en lugar de 39.
 */
import { HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './lib/admin.js'
import { cleanText } from './lib/text.js'
import { computeRoute, momentoDeSalida, normalizePlace, searchPlaces } from './lib/maps.js'
import { abiertoEl, horarioDelDia, ordenarPorNota, quitarLosFlojos } from './lib/ranking.js'
import { choques, encadenar, MAX_CON_NINOS, MAX_PARADAS } from './lib/itinerario.js'
import { dentroDelViaje, motivoFueraDelViaje } from './lib/ventana.js'

const MODOS = ['WALK', 'TRANSIT', 'DRIVE']
const TIPOS = ['activity', 'food', 'transport', 'lodging']
const GRUPOS = ['todos', 'f1', 'sin-f1']

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

/** Los eventos que ya hay ese dia, con hora, para saber que no pisamos. */
async function loQueYaHay(tripId, dia) {
  const snap = await db.collection(`trips/${tripId}/timeline`)
    // `start` es texto: unas veces «2026-09-15» y otras «2026-09-15T13:00:00+02:00».
    // El rango con \uf8ff coge las dos formas sin partir la consulta en dos.
    .where('start', '>=', dia).where('start', '<', `${dia}\uf8ff`).get()
  return snap.docs
    .map((d) => d.data())
    .filter((e) => (e.status ?? 'confirmado') !== 'descartado')
    .map((e) => ({
      titulo: e.title ?? 'algo reservado',
      inicio: String(e.start ?? '').slice(11, 16),
      fin: e.end ? new Date(e.end).toISOString().slice(11, 16) : null,
    }))
    .filter((e) => e.inicio)
}

/** Si en el grupo van los ninos. Se lee del viaje, no se supone. */
async function llevaNinos(tripId, grupo) {
  const [trip, gente] = await Promise.all([
    db.doc(`trips/${tripId}`).get(),
    db.collection(`trips/${tripId}/travelers`).get(),
  ])
  /**
   * El grupo se busca POR SU `id`, no por la clave del mapa.
   *
   * En `groups` la clave del grupo sin F1 es `sinF1` y su id es `sin-f1`. Un
   * `trip.get('groups.sin-f1.travelerIds')` devuelve undefined siempre, y
   * entonces esto contestaria «no van ninos» para el unico grupo en el que
   * van los dos. Un fallo que no rompe nada y desactiva el aviso entero.
   */
  const grupos = Object.values(trip.get('groups') ?? {})
  const ids = grupos.find((g) => g?.id === grupo)?.travelerIds
  const menores = gente.docs.filter((d) => Number(d.get('age')) < 18).map((d) => d.id)
  if (ids === 'all' || !Array.isArray(ids)) return menores.length > 0
  return menores.some((id) => ids.includes(id))
}

export async function armarRuta(args, ctx) {
  const { tripId, uid, travelerId, contexto } = ctx

  const titulo = cleanText(args?.titulo ?? '').slice(0, 140)
  if (!titulo) return { error: 'La ruta necesita un nombre.' }

  const dia = cleanText(args?.fecha ?? '').slice(0, 10)
  if (!dentroDelViaje(dia)) return { error: motivoFueraDelViaje(dia) }

  const grupo = GRUPOS.includes(args?.grupo) ? args.grupo : 'todos'
  const modo = MODOS.includes(args?.modo) ? args.modo : 'WALK'
  const horaInicio = /^([01]\d|2[0-3]):[0-5]\d$/.test(cleanText(args?.horaInicio ?? ''))
    ? cleanText(args.horaInicio) : '10:00'

  const pedidas = (Array.isArray(args?.paradas) ? args.paradas : []).slice(0, MAX_PARADAS)
  if (pedidas.length < 2) {
    return { error: 'Una ruta son al menos dos paradas. Para una sola, usa agregarAlPlan.' }
  }

  const ciudad = contexto?.porDia?.[dia]?.ciudad ?? contexto?.ciudadPorDefecto ?? null
  const avisos = []

  const conNinos = await llevaNinos(tripId, grupo)
  if (conNinos && pedidas.length > MAX_CON_NINOS) {
    avisos.push(
      `En este grupo van los dos ninos y la ruta tiene ${pedidas.length} paradas. ` +
      `Con ellos, ${MAX_CON_NINOS} ya es un dia largo.`,
    )
  }

  // Los sitios, en paralelo: son independientes entre si.
  const resueltas = await Promise.all(pedidas.map(async (p) => {
    const nombre = cleanText(p?.nombre ?? '').slice(0, 140)
    if (!nombre) return null
    const sitio = await mejorSitio(nombre, cleanText(p?.ciudad ?? '') || ciudad).catch(() => null)
    if (!sitio) return { nombre, sinSitio: true, tipo: TIPOS.includes(p?.tipo) ? p.tipo : 'activity' }
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
    if (r?.sinSitio) avisos.push(`No encontre «${r.nombre}»${ciudad ? ` en ${ciudad}` : ''}: la dejo fuera.`)
  }

  const paradas = resueltas.filter((r) => r && !r.sinSitio)
  if (paradas.length < 2) {
    return { error: 'Solo pude situar una parada o ninguna. Dame nombres mas concretos.' }
  }

  // Pasada 1: sin traslados, solo para saber a que hora se sale de cada sitio.
  const tanteo = encadenar(paradas, horaInicio, [])

  // Pasada 2: los traslados de verdad, cada uno para SU hora.
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
      avisos.push(`«${t.titulo}» esta cerrado a las ${t.llegada}${horarioDelDia(t.horario, dia) ? ` (${horarioDelDia(t.horario, dia)})` : ''}.`)
    }
    if (t.seSalePorArriba) avisos.push(`La ruta se pasa de medianoche en «${t.titulo}».`)
  }

  avisos.push(...choques(tramos, await loQueYaHay(tripId, dia)))

  // Un solo id para las seis paradas: es lo que hace que se puedan quitar de
  // una vez. Sin el, deshacer una ruta son seis toques y nadie la prueba.
  const rutaId = db.collection(`trips/${tripId}/timeline`).doc().id
  const lote = db.batch()

  for (const t of tramos) {
    const ref = db.collection(`trips/${tripId}/timeline`).doc()
    lote.set(ref, {
      title: t.titulo,
      kind: t.tipo,
      status: 'propuesto',
      start: `${dia}T${t.llegada}:00+02:00`,
      end: new Date(`${dia}T${t.salida}:00+02:00`).toISOString(),
      address: t.direccion,
      coords: t.coords,
      placeId: t.placeId,
      groupId: grupo,
      travelerIds: 'pendiente',
      rutaId,
      rutaOrden: t.orden,
      rutaNombre: titulo,
      createdBy: uid,
      createdByCopiloto: true,
      sugeridoPor: travelerId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
  }
  await lote.commit()

  return {
    ok: true,
    aviso: 'Las paradas quedan PROPUESTAS en la agenda hasta que alguien las confirme.',
    ruta: {
      id: rutaId,
      titulo,
      fecha: dia,
      ciudad,
      modo,
      paradas: tramos.map((t) => ({
        orden: t.orden,
        titulo: t.titulo,
        llegada: t.llegada,
        salida: t.salida,
        direccion: t.direccion,
        nota: t.nota,
        resenas: t.resenas,
        alSiguiente: t.trasladoMin === null ? null : `${t.trasladoMin} min`,
      })),
      // Los avisos viajan DENTRO de la ruta, no al lado: la interfaz recoge
      // `ruta` y los pintaria vacios si vivieran fuera, y un modelo que
      // redacta tiende a suavizarlos justo cuando mas hacen falta.
      avisos,
    },
  }
}

/**
 * Quitar la ruta entera.
 *
 * Con los mismos candados que un plan suelto, uno por uno: solo se borra lo
 * que puso una persona, solo mientras siga propuesto, y solo si es tuyo o
 * eres quien organiza. Lo que ya se confirmo se queda, y se dice cuanto.
 */
export async function borrarRuta(peticion) {
  const uid = peticion.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Entra al viaje primero.')

  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const rutaId = cleanText(peticion.data?.rutaId ?? '').slice(0, 120)
  if (!rutaId) throw new HttpsError('invalid-argument', 'Falta cual.')

  const trip = await db.doc(`trips/${tripId}`).get()
  if (!trip.exists) throw new HttpsError('not-found', 'Ese viaje no existe.')
  const rol = trip.get(`roles.${uid}`)
  if (!rol) throw new HttpsError('permission-denied', 'No eres del viaje.')

  const snap = await db.collection(`trips/${tripId}/timeline`).where('rutaId', '==', rutaId).get()
  if (snap.empty) return { ok: true, yaNoEstaba: true, borradas: 0 }

  const lote = db.batch()
  let borradas = 0
  let intocables = 0
  for (const d of snap.docs) {
    const e = d.data()
    const suyo = e.createdBy === uid || rol === 'owner'
    if (e.createdBy && (e.status ?? 'propuesto') === 'propuesto' && suyo) {
      lote.delete(d.ref)
      borradas += 1
    } else {
      intocables += 1
    }
  }
  if (borradas > 0) await lote.commit()

  return { ok: true, borradas, intocables }
}
