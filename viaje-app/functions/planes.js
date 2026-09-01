/**
 * Meter, cambiar y quitar planes SIN pasar por el modelo.
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
 *
 * ---
 * QUE SE PUEDE TOCAR (cambiado el 1 de septiembre de 2026)
 *
 * Hasta hoy habia tres candados: solo lo que tenia autor, solo mientras
 * siguiera propuesto, y solo si era tuyo. El resultado era que confirmar un
 * plan lo congelaba para siempre: ni el owner podia corregirle una hora, y la
 * unica salida era borrarlo y volver a crearlo, lo que se lleva los votos.
 *
 * Ahora manda una sola regla: **cualquier adulto del viaje puede cambiar o
 * quitar cualquier momento**. Los ninos no, y los `viewer` tampoco.
 *
 * Lo que sustituye a los candados no es otro candado, es una huella:
 *   · Un momento de la siembra que se edita queda marcado `tocadoAMano`.
 *   · Un momento de la siembra que se quita deja lapida en `borrados/`.
 * `scripts/seed.mjs` mira las dos cosas. Sin ellas esto seria una funcion
 * mentirosa: la siembra hace `set()` sin merge sobre TODO `src/data/`, asi
 * que la proxima publicacion revertiria la edicion en silencio y resucitaria
 * lo borrado. Un boton que deshace su propio efecto en el siguiente
 * despliegue es peor que no tener boton.
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

/**
 * Quien puede tocar la agenda: owner y adult. `viewer` mira y no escribe.
 *
 * Es el unico limite que queda, y no es sobre QUE se toca sino sobre QUIEN
 * toca. Un rol de solo lectura que pudiera borrar el Vueling no seria un rol
 * de solo lectura.
 */
function exigirAdulto(rol) {
  if (rol !== 'owner' && rol !== 'adult') {
    throw new HttpsError('permission-denied', 'Con tu rol solo se puede mirar.')
  }
}

/**
 * Lo escribio `scripts/seed.mjs`, no una persona.
 *
 * Se mira `origen` Y la ausencia de autor: `origen: 'seed'` lo pone la
 * siembra desde el 28 de agosto, pero los documentos anteriores solo se
 * distinguen por no tener `createdBy`.
 */
function esDeLaSiembra(ev) {
  return ev?.origen === 'seed' || !ev?.createdBy
}

export async function crearPlan(peticion) {
  const uid = peticion.auth?.uid
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const { rol, travelerId } = await exigirMiembro(tripId, uid)
  exigirAdulto(rol)

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
    ...(peticion.data?.duracionMinutos > 0 && hhmm
      ? { end: new Date(new Date(inicio).getTime() + Math.min(peticion.data.duracionMinutos, 1440) * 60000).toISOString() }
      : {}),
    ...(peticion.data?.lugar ? { address: cleanText(peticion.data.lugar).slice(0, 200) } : {}),
    // Las coordenadas vienen de la tarjeta, que las saco de Places hace un
    // momento: no hace falta volver a preguntarle a Google por lo mismo.
    ...(coords ? { coords } : {}),
    ...(peticion.data?.placeId ? { placeId: cleanText(peticion.data.placeId).slice(0, 120) } : {}),
    ...(peticion.data?.nota ? { notes: cleanText(peticion.data.nota).slice(0, 600) } : {}),
    ...(peticion.data?.deCopiloto ? { createdByCopiloto: true } : {}),
    groupId: ['todos', 'f1', 'sin-f1'].includes(peticion.data?.grupo) ? peticion.data.grupo : 'todos',
    travelerIds: 'pendiente',
    createdBy: uid,
    sugeridoPor: travelerId,
    createdAt: FieldValue.serverTimestamp(),
  })

  return { id: ref.id, title: titulo, fecha: dia, hora: hhmm }
}

/**
 * La lapida de un momento sembrado que alguien quito.
 *
 * Sin esto, `npm run publicar` lo vuelve a crear al dia siguiente y la
 * persona que lo quito piensa que la app no le hizo caso. Guarda ademas
 * quien y cuando: borrar una reserva pagada es la accion mas cara de la app
 * y tiene que quedar por escrito.
 */
async function ponerLapida(tripId, id, ev, uid) {
  await db.doc(`trips/${tripId}/borrados/${id}`).set({
    title: ev.title ?? null,
    start: ev.start ?? null,
    quitadoPor: uid,
    quitadoEn: FieldValue.serverTimestamp(),
  })
}

export async function borrarPlan(peticion) {
  const uid = peticion.auth?.uid
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const { rol } = await exigirMiembro(tripId, uid)
  exigirAdulto(rol)

  const id = cleanText(peticion.data?.id ?? '').slice(0, 120)
  if (!id) throw new HttpsError('invalid-argument', 'Falta cual.')

  const ref = db.doc(`trips/${tripId}/timeline/${id}`)
  const snap = await ref.get()
  if (!snap.exists) return { ok: true, yaNoEstaba: true }

  const ev = snap.data()
  const sembrado = esDeLaSiembra(ev)

  // La lapida ANTES del borrado: si el borrado va bien y la lapida no, la
  // siembra lo resucita. Al reves solo queda una lapida huerfana, que no
  // hace dano — `seed.mjs` la ignora si el momento sigue en pie.
  if (sembrado) await ponerLapida(tripId, id, ev, uid)

  await ref.delete()
  return { ok: true, title: ev.title ?? null, eraDeLaSiembra: sembrado }
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
 * Cambiar un plan que ya esta en la agenda, este en el estado que este.
 *
 * Solo se escribe lo que llega. Un campo que no viene no se borra: mandar el
 * formulario a medias no puede dejar un plan sin titulo.
 */
export async function cambiarPlan(peticion) {
  const uid = peticion.auth?.uid
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const { rol } = await exigirMiembro(tripId, uid)
  exigirAdulto(rol)

  const id = cleanText(peticion.data?.id ?? '').slice(0, 120)
  if (!id) throw new HttpsError('invalid-argument', 'Falta cual.')

  const ref = db.doc(`trips/${tripId}/timeline/${id}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese plan ya no está.')
  const ev = snap.data()

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

  // La huella que hace que la siembra no lo pise. Se pone solo cuando de
  // verdad cambia algo: marcar un guardado en vacio dejaria un momento fuera
  // del espejo sin que nadie lo hubiera tocado.
  const sembrado = esDeLaSiembra(ev)
  if (sembrado) cambios.tocadoAMano = true

  cambios.editadoPor = uid
  cambios.editadoEn = FieldValue.serverTimestamp()
  await ref.update(cambios)
  return { ok: true, id, sinPin, eraDeLaSiembra: sembrado }
}

/**
 * Mover un momento de estado: confirmarlo o devolverlo a propuesto.
 *
 * Estaba en el cliente (`tripRepo.cambiarEstadoPlan`) y ahi seguiria si solo
 * hubiera que confirmar planes propios. Pero desconfirmar un momento
 * SEMBRADO —el tour del Bernabeu que resulta que no se va a hacer— es una
 * escritura que las reglas de Firestore no dejan a un adulto, porque el
 * documento no tiene `createdBy`. Aqui si, con la misma huella que la
 * edicion.
 */
const ESTADOS = ['propuesto', 'confirmado', 'descartado']

export async function moverEstado(peticion) {
  const uid = peticion.auth?.uid
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const { rol } = await exigirMiembro(tripId, uid)
  exigirAdulto(rol)

  const id = cleanText(peticion.data?.id ?? '').slice(0, 120)
  if (!id) throw new HttpsError('invalid-argument', 'Falta cual.')

  const a = cleanText(peticion.data?.a ?? '')
  if (!ESTADOS.includes(a)) throw new HttpsError('invalid-argument', `No conozco el estado «${a}».`)

  const ref = db.doc(`trips/${tripId}/timeline/${id}`)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese plan ya no está.')
  const ev = snap.data()
  if ((ev.status ?? 'confirmado') === a) return { ok: true, sinCambios: true }

  const sembrado = esDeLaSiembra(ev)
  await ref.update({
    status: a,
    statusBy: uid,
    statusAt: FieldValue.serverTimestamp(),
    ...(sembrado ? { tocadoAMano: true } : {}),
  })
  return { ok: true, id, a, eraDeLaSiembra: sembrado }
}
