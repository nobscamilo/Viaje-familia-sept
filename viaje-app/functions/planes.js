/**
 * Meter y quitar planes SIN pasar por el modelo.
 *
 * El copiloto ya sabe agregar planes, pero solo hablando: hay que escribirle
 * «agrega Rosi La Loca al jueves a la una» aunque la tarjeta con Rosi La Loca
 * este delante. Esto es lo mismo, en dos toques y sin gastar una llamada a
 * Gemini para algo mecanico. El modelo se reserva para lo que no lo es.
 *
 * Aqui va la logica; el `onCall` lo envuelve `index.js`. No es capricho: con
 * `export { agregarPlan } from './planes.js'` en el punto de entrada, el
 * analizador de Firebase falla con «Detected cycle while resolving name» y el
 * despliegue se cae entero. Separar transporte de logica lo evita.
 *
 * Y borrar va con crear a proposito: sin poder deshacer, nadie se atreve a
 * dejar que la app le escriba en la agenda del viaje.
 */
import { HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './lib/admin.js'
import { cleanText } from './lib/text.js'
import { dentroDelViaje, motivoFueraDelViaje } from './lib/ventana.js'
import { resolverSitio } from './lib/maps.js'

/** Miembro del viaje, y devuelve quien es. Sin esto no se escribe nada. */
async function exigirMiembro(tripId, uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entra al viaje primero.')
  const snap = await db.doc(`trips/${tripId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese viaje no existe.')
  const trip = snap.data()
  const rol = trip.roles?.[uid]
  if (!rol) throw new HttpsError('permission-denied', 'No eres del viaje.')
  return { rol, travelerId: trip.uidToTraveler?.[uid] ?? null }
}

export async function crearPlan(peticion) {
  const uid = peticion.auth?.uid
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const { travelerId } = await exigirMiembro(tripId, uid)

  const titulo = cleanText(peticion.data?.titulo ?? '').slice(0, 140)
  if (!titulo) throw new HttpsError('invalid-argument', 'Falta el nombre del plan.')

  const dia = cleanText(peticion.data?.fecha ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new HttpsError('invalid-argument', 'La fecha va en AAAA-MM-DD.')
  if (!dentroDelViaje(dia)) throw new HttpsError('invalid-argument', motivoFueraDelViaje(dia))

  const hora = cleanText(peticion.data?.hora ?? '')
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) ? hora : null
  // Horas en la zona del viaje, no en la de quien toca el boton.
  const inicio = hhmm ? `${dia}T${hhmm}:00+02:00` : dia

  const c = peticion.data?.coords
  const coords = Number.isFinite(c?.lat) && Number.isFinite(c?.lng) ? { lat: c.lat, lng: c.lng } : null

  const ref = await db.collection(`trips/${tripId}/timeline`).add({
    title: titulo,
    kind: ['activity', 'food', 'transport', 'lodging'].includes(peticion.data?.tipo)
      ? peticion.data.tipo : 'food',
    status: 'propuesto',
    start: inicio,
    ...(peticion.data?.lugar ? { address: cleanText(peticion.data.lugar).slice(0, 200) } : {}),
    // Las coordenadas vienen de la tarjeta, que las saco de Places hace un
    // momento: no hace falta volver a preguntarle a Google por lo mismo.
    ...(coords ? { coords } : {}),
    ...(peticion.data?.placeId ? { placeId: cleanText(peticion.data.placeId).slice(0, 120) } : {}),
    groupId: ['todos', 'f1', 'sin-f1'].includes(peticion.data?.grupo) ? peticion.data.grupo : 'todos',
    travelerIds: 'pendiente',
    createdBy: uid,
    sugeridoPor: travelerId,
    createdAt: FieldValue.serverTimestamp(),
  })

  return { id: ref.id, title: titulo, fecha: dia, hora: hhmm }
}

export async function borrarPlan(peticion) {
  const uid = peticion.auth?.uid
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const { rol } = await exigirMiembro(tripId, uid)

  const id = cleanText(peticion.data?.id ?? '').slice(0, 120)
  if (!id) throw new HttpsError('invalid-argument', 'Falta cual.')

  const ref = db.doc(`trips/${tripId}/timeline/${id}`)
  const snap = await ref.get()
  if (!snap.exists) return { ok: true, yaNoEstaba: true }

  const ev = snap.data()

  // Tres candados, y ninguno sobra:
  // - Lo puso una persona: los momentos de la siembra (vuelos, hoteles) no se
  //   borran desde aqui ni por accidente.
  // - Sigue propuesto: si alguien ya lo confirmo, deja de ser tuyo.
  // - Es tuyo, o eres owner.
  if (!ev.createdBy) throw new HttpsError('permission-denied', 'Eso no lo puso nadie desde la app.')
  if ((ev.status ?? 'propuesto') !== 'propuesto') {
    throw new HttpsError('failed-precondition', 'Ya está confirmado: eso lo quita quien organiza.')
  }
  if (ev.createdBy !== uid && rol !== 'owner') {
    throw new HttpsError('permission-denied', 'Lo puso otra persona.')
  }

  await ref.delete()
  return { ok: true, title: ev.title ?? null }
}


/**
 * En que ciudad esta la familia ese dia, segun la propia agenda.
 *
 * Hace falta para que un sitio escrito a mano no se resuelva a 280 km. Es una
 * lectura mas por edicion, y es barata comparada con un pin en Guardo.
 */
async function ciudadDelDia(tripId, dia) {
  const snap = await db.collection(`trips/${tripId}/timeline`)
    .where('start', '>=', dia).where('start', '<', `${dia}\uf8ff`).get()
  for (const d of snap.docs) {
    const c = d.get('city')
    if (c) return c
  }
  return null
}

/**
 * Cambiar un plan que ya esta en la agenda.
 *
 * Los mismos tres candados que para borrarlo, y por lo mismo: lo puso una
 * persona, sigue propuesto, y es tuyo o eres quien organiza. Un vuelo de la
 * siembra no se toca desde el movil ni siendo owner — para eso esta el
 * archivo de datos, que ademas queda en el historial de git.
 *
 * Solo se escribe lo que llega. Un campo que no viene no se borra: mandar el
 * formulario a medias no puede dejar un plan sin titulo.
 */
export async function cambiarPlan(peticion) {
  const uid = peticion.auth?.uid
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const { rol } = await exigirMiembro(tripId, uid)

  const id = cleanText(peticion.data?.id ?? '').slice(0, 120)
  if (!id) throw new HttpsError('invalid-argument', 'Falta cual.')

  const ref = db.doc(`trips/${tripId}/timeline/${id}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese plan ya no está.')
  const ev = snap.data()

  if (!ev.createdBy) throw new HttpsError('permission-denied', 'Eso no lo puso nadie desde la app.')
  if ((ev.status ?? 'propuesto') !== 'propuesto') {
    throw new HttpsError('failed-precondition', 'Ya está confirmado: eso lo cambia quien organiza.')
  }
  if (ev.createdBy !== uid && rol !== 'owner') {
    throw new HttpsError('permission-denied', 'Lo puso otra persona.')
  }

  const cambios = {}
  let sinPin = false

  const titulo = cleanText(peticion.data?.titulo ?? '').slice(0, 140)
  if (titulo) cambios.title = titulo

  const tipo = peticion.data?.tipo
  if (['activity', 'food', 'transport', 'lodging'].includes(tipo)) cambios.kind = tipo

  const grupo = peticion.data?.grupo
  if (['todos', 'f1', 'sin-f1'].includes(grupo)) cambios.groupId = grupo

  // Dia y hora van juntos: `start` es un solo campo y cambiar la hora sin
  // saber el dia dejaria una fecha inventada.
  const dia = cleanText(peticion.data?.fecha ?? '').slice(0, 10) || String(ev.start ?? '').slice(0, 10)
  if (peticion.data?.fecha || peticion.data?.hora !== undefined) {
    if (!dentroDelViaje(dia)) throw new HttpsError('invalid-argument', motivoFueraDelViaje(dia))
    const hora = cleanText(peticion.data?.hora ?? '')
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) ? hora : null
    cambios.start = hhmm ? `${dia}T${hhmm}:00+02:00` : dia
    // Un plan que se mueve de hora arrastra su final; si no, un momento de
    // las 10:00 a las 11:30 movido a las 18:00 acabaria antes de empezar.
    if (ev.end && ev.start && hhmm) {
      const duraMs = new Date(ev.end).getTime() - new Date(ev.start).getTime()
      if (Number.isFinite(duraMs) && duraMs > 0) {
        cambios.end = new Date(new Date(cambios.start).getTime() + duraMs).toISOString()
      }
    }
  }

  const lugar = cleanText(peticion.data?.lugar ?? '').slice(0, 200)
  if (lugar && lugar !== ev.address) {
    const sitio = await resolverSitio(lugar, await ciudadDelDia(tripId, dia))
    if (sitio) {
      cambios.address = sitio.address
      cambios.coords = sitio.coords
    } else {
      // Si Places no lo encuentra, se queda el texto y SE QUITA el pin viejo.
      // Dejarlo seria ensenar en el mapa la direccion anterior con el nombre
      // nuevo, que es la peor de las tres opciones posibles.
      cambios.address = lugar
      cambios.coords = FieldValue.delete()
      cambios.placeId = FieldValue.delete()
    }
    sinPin = !sitio
  }

  if (Object.keys(cambios).length === 0) return { ok: true, sinCambios: true }

  cambios.editadoPor = uid
  cambios.editadoEn = FieldValue.serverTimestamp()
  await ref.update(cambios)
  return { ok: true, id, sinPin }
}
