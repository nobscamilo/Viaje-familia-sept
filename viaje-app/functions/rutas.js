/**
 * Rutas de turismo: varias paradas encadenadas, con horas de verdad.
 *
 * El modelo pone nombres y un orden. Todo lo demas —donde cae cada sitio, si
 * abre ese dia, cuanto se tarda de uno a otro y a que hora se llega— lo
 * calcula `lib/planificar.js` contra Places y Routes. Es la frontera de
 * siempre: el modelo redacta, el servidor cuenta.
 *
 * ---
 * LO QUE CAMBIO EL 1 DE SEPTIEMBRE DE 2026
 *
 * `armarRuta` escribia las seis paradas en la agenda en el mismo gesto en que
 * las calculaba. Quedaban propuestas, se podian quitar de una vez, y aun asi
 * estaba mal: la unica forma de ver la ruta era encontrandosela ya metida en
 * «Ahora», y la unica forma de cambiarle algo era quitarla entera y volver a
 * pedirsela al copiloto con otras palabras.
 *
 * Ahora son tres pasos y solo el ultimo escribe:
 *
 *   armarRuta   -> calcula y DEVUELVE un borrador. No toca Firestore.
 *   recalcular  -> alguien quito una parada o movio la hora de arranque:
 *                  se rehacen los traslados y los avisos. Tampoco escribe.
 *   guardar     -> ahora si: las paradas entran en la agenda, propuestas.
 *
 * `recalcular` y `guardar` vuelven a pasar por `calcularTramos`. No es
 * desconfianza del navegador por gusto: si el cliente mandara las horas, una
 * ruta a la que se le quita la parada del medio llegaria a la agenda con los
 * horarios de la version anterior y nadie lo notaria hasta estar alli.
 */
import { HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './lib/admin.js'
import { cleanText } from './lib/text.js'
import { calcularTramos, choquesCon, limpiarParadas, resolverParadas, TIPOS } from './lib/planificar.js'
import { MAX_CON_NINOS, MAX_PARADAS, ordenarPorProximidad } from './lib/itinerario.js'
import { dentroDelViaje, motivoFueraDelViaje } from './lib/ventana.js'

const MODOS = ['WALK', 'TRANSIT', 'DRIVE']
const GRUPOS = ['todos', 'f1', 'sin-f1']
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

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

/** Miembro del viaje que ademas puede escribir. */
async function exigirAdulto(tripId, uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entra al viaje primero.')
  const snap = await db.doc(`trips/${tripId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese viaje no existe.')
  const rol = snap.get(`roles.${uid}`)
  if (!rol) throw new HttpsError('permission-denied', 'No eres del viaje.')
  if (rol !== 'owner' && rol !== 'adult') {
    throw new HttpsError('permission-denied', 'Con tu rol solo se puede mirar.')
  }
  return { rol, travelerId: snap.get(`uidToTraveler.${uid}`) ?? null }
}

/**
 * El nucleo compartido: paradas ya situadas -> borrador con horas y avisos.
 *
 * Lo llaman los tres caminos. Que sea uno solo es lo que garantiza que la
 * ruta que se guarda es exactamente la que se enseno.
 */
async function componer({ tripId, titulo, dia, ciudad, modo, horaInicio, grupo, paradas, avisos = [] }) {
  const previos = [...avisos]

  if (await llevaNinos(tripId, grupo) && paradas.length > MAX_CON_NINOS) {
    previos.push(
      `En este grupo van los dos niños y la ruta tiene ${paradas.length} paradas. ` +
      `Con ellos, ${MAX_CON_NINOS} ya es un día largo.`,
    )
  }

  const { tramos, avisos: delReloj } = await calcularTramos({ paradas, dia, modo, horaInicio })
  const choques = choquesCon(tramos, await loQueYaHay(tripId, dia))

  return {
    titulo,
    fecha: dia,
    ciudad,
    modo,
    horaInicio,
    grupo,
    paradas: tramos.map((t) => ({
      orden: t.orden,
      titulo: t.titulo,
      tipo: t.tipo,
      minutos: t.minutos,
      llegada: t.llegada,
      salida: t.salida,
      direccion: t.direccion,
      coords: t.coords,
      placeId: t.placeId,
      nota: t.nota,
      resenas: t.resenas,
      horario: t.horario,
      alSiguiente: t.trasladoMin === null ? null : `${t.trasladoMin} min`,
    })),
    // Los avisos viajan DENTRO del borrador, no al lado: la interfaz recoge
    // la ruta y los pintaria vacios si vivieran fuera, y un modelo que
    // redacta tiende a suavizarlos justo cuando mas hacen falta.
    avisos: [...previos, ...delReloj, ...choques],
  }
}

/**
 * La herramienta del copiloto. Calcula y PROPONE; no escribe nada.
 */
export async function armarRuta(args, ctx) {
  const { tripId, contexto } = ctx

  const titulo = cleanText(args?.titulo ?? '').slice(0, 140)
  if (!titulo) return { error: 'La ruta necesita un nombre.' }

  const dia = cleanText(args?.fecha ?? '').slice(0, 10)
  if (!dentroDelViaje(dia)) return { error: motivoFueraDelViaje(dia) }

  const grupo = GRUPOS.includes(args?.grupo) ? args.grupo : 'todos'
  const modo = MODOS.includes(args?.modo) ? args.modo : 'WALK'
  const horaInicio = HHMM.test(cleanText(args?.horaInicio ?? '')) ? cleanText(args.horaInicio) : '10:00'

  const pedidas = (Array.isArray(args?.paradas) ? args.paradas : []).slice(0, MAX_PARADAS)
  if (pedidas.length < 2) {
    return { error: 'Una ruta son al menos dos paradas. Para una sola, usa agregarAlPlan.' }
  }

  const ciudad = contexto?.porDia?.[dia]?.ciudad ?? contexto?.ciudadPorDefecto ?? null
  const { paradas: resueltas, avisos } = await resolverParadas(pedidas, ciudad)
  if (resueltas.length < 2) {
    return { error: 'Solo pude situar una parada o ninguna. Dame nombres más concretos.' }
  }

  const { paradas, seReordeno } = ordenarPorProximidad(resueltas, { fijarInicio: true })
  if (seReordeno) {
    avisos.push('He ajustado el orden de las paradas por cercanía geográfica para un recorrido continuo sin retrocesos.')
  }

  const borrador = await componer({ tripId, titulo, dia, ciudad, modo, horaInicio, grupo, paradas, avisos })

  return {
    ok: true,
    // Lo que ve el MODELO. El borrador entero (coordenadas, horarios de
    // Google, placeIds) se lo queda la interfaz: no tiene sentido gastar
    // tokens en quince digitos de latitud que el no va a leer.
    aviso: 'La ruta esta PROPUESTA en el chat, todavia NO en la agenda. La familia la revisa, quita lo que no quiera y la agrega con un boton. No digas que ya esta agregada.',
    resumen: {
      titulo,
      fecha: dia,
      paradas: borrador.paradas.map((p) => ({ titulo: p.titulo, llegada: p.llegada, salida: p.salida })),
      avisos: borrador.avisos,
    },
    borrador,
  }
}

/** La cabecera de un borrador que vuelve del navegador. */
function cabecera(datos) {
  const titulo = cleanText(datos?.titulo ?? '').slice(0, 140) || 'Ruta'
  const dia = cleanText(datos?.fecha ?? '').slice(0, 10)
  if (!dentroDelViaje(dia)) throw new HttpsError('invalid-argument', motivoFueraDelViaje(dia))
  return {
    titulo,
    dia,
    ciudad: cleanText(datos?.ciudad ?? '').slice(0, 80) || null,
    modo: MODOS.includes(datos?.modo) ? datos.modo : 'WALK',
    horaInicio: HHMM.test(cleanText(datos?.horaInicio ?? '')) ? cleanText(datos.horaInicio) : '10:00',
    grupo: GRUPOS.includes(datos?.grupo) ? datos.grupo : 'todos',
  }
}

/** Rehacer las horas despues de quitar una parada o mover el arranque. */
export async function recalcular(peticion) {
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  await exigirAdulto(tripId, peticion.auth?.uid)

  const cab = cabecera(peticion.data?.ruta)
  const paradas = limpiarParadas(peticion.data?.ruta?.paradas)
  if (paradas.length < 1) throw new HttpsError('invalid-argument', 'No queda ninguna parada.')

  return { ok: true, borrador: await componer({ tripId, ...cab, paradas }) }
}

/**
 * Guardar el borrador: ahora si entra en la agenda, propuesto.
 *
 * Se vuelve a calcular todo antes de escribir. El navegador dice QUE paradas
 * y a que hora se arranca; las horas de llegada las pone este servidor, igual
 * que la primera vez.
 */
export async function guardar(peticion) {
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const uid = peticion.auth?.uid
  const { travelerId } = await exigirAdulto(tripId, uid)

  const cab = cabecera(peticion.data?.ruta)
  const paradas = limpiarParadas(peticion.data?.ruta?.paradas)
  if (paradas.length < 1) throw new HttpsError('invalid-argument', 'No queda ninguna parada.')

  const ruta = await componer({ tripId, ...cab, paradas })

  // Un solo id para las paradas: es lo que hace que se puedan quitar de una
  // vez. Sin el, deshacer una ruta son seis toques y nadie la prueba.
  const rutaId = db.collection(`trips/${tripId}/timeline`).doc().id
  const lote = db.batch()

  for (const p of ruta.paradas) {
    const ref = db.collection(`trips/${tripId}/timeline`).doc()
    lote.set(ref, {
      title: p.titulo,
      kind: TIPOS.includes(p.tipo) ? p.tipo : 'activity',
      status: 'propuesto',
      start: `${ruta.fecha}T${p.llegada}:00+02:00`,
      end: new Date(`${ruta.fecha}T${p.salida}:00+02:00`).toISOString(),
      ...(p.direccion ? { address: p.direccion } : {}),
      ...(p.coords ? { coords: p.coords } : {}),
      ...(p.placeId ? { placeId: p.placeId } : {}),
      groupId: ruta.grupo,
      travelerIds: 'pendiente',
      rutaId,
      rutaOrden: p.orden,
      rutaNombre: ruta.titulo,
      createdBy: uid,
      createdByCopiloto: true,
      sugeridoPor: travelerId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
  }
  await lote.commit()

  return { ok: true, ruta: { ...ruta, id: rutaId } }
}

/**
 * Quitar la ruta entera.
 *
 * Cualquier adulto, como cualquier otro momento desde el 1 de septiembre. Lo
 * que ya se confirmo se queda y se dice cuanto: si desaparecen cuatro de seis
 * sin explicacion, parece que fallo a medias.
 */
export async function borrarRuta(peticion) {
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  await exigirAdulto(tripId, peticion.auth?.uid)

  const rutaId = cleanText(peticion.data?.rutaId ?? '').slice(0, 120)
  if (!rutaId) throw new HttpsError('invalid-argument', 'Falta cual.')

  const snap = await db.collection(`trips/${tripId}/timeline`).where('rutaId', '==', rutaId).get()
  if (snap.empty) return { ok: true, yaNoEstaba: true, borradas: 0 }

  const lote = db.batch()
  let borradas = 0
  let intocables = 0
  for (const d of snap.docs) {
    if ((d.get('status') ?? 'propuesto') === 'propuesto') {
      lote.delete(d.ref)
      borradas += 1
    } else {
      intocables += 1
    }
  }
  if (borradas > 0) await lote.commit()

  return { ok: true, borradas, intocables }
}
