/**
 * Ajustes del viaje: quien ha entrado, con que codigo, y como arreglarlo.
 *
 * Todo esto vive en el servidor y solo responde a un owner. Los codigos
 * personales no se pueden leer desde el cliente ni siendo miembro: cualquiera
 * podria leer el de su padre y, como «el codigo manda», entrar como el.
 *
 * Sin esta pantalla, el unico modo de arreglar un enlace equivocado era la
 * consola de Firebase o el terminal de Camilo. Eso no es un producto.
 */
import { HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './lib/admin.js'
import { cleanText } from './lib/text.js'

async function exigirOwner(tripId, uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entra al viaje primero.')
  const snap = await db.doc(`trips/${tripId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese viaje no existe.')
  const trip = snap.data()
  if (trip.roles?.[uid] !== 'owner') {
    throw new HttpsError('permission-denied', 'Esto solo lo ve quien organiza.')
  }
  return trip
}

/** Quien es quien, con su codigo. Solo para un owner. */
export async function verGente(peticion) {
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const trip = await exigirOwner(tripId, peticion.auth?.uid)

  const [viajeros, codigos] = await Promise.all([
    db.collection(`trips/${tripId}/travelers`).get(),
    db.collection(`trips/${tripId}/codes`).get(),
  ])

  const porCodigo = Object.fromEntries(codigos.docs.map((d) => [d.id, d.get('joinCode')]))
  const uidDe = {}
  for (const [uid, quien] of Object.entries(trip.uidToTraveler ?? {})) uidDe[quien] = uid

  return {
    gente: viajeros.docs
      .map((d) => ({
        id: d.id,
        short: d.get('short') ?? d.id,
        age: d.get('age') ?? null,
        color: d.get('color') ?? null,
        codigo: porCodigo[d.id] ?? null,
        uid: uidDe[d.id] ?? null,
        rol: uidDe[d.id] ? (trip.roles?.[uidDe[d.id]] ?? null) : null,
      }))
      .sort((a, b) => (b.age ?? 0) - (a.age ?? 0)),
  }
}

/**
 * Desengancha a alguien de su viajero.
 *
 * No borra nada de lo que haya hecho: sus votos y sus planes siguen ahi. Solo
 * suelta el nombre para que lo pueda coger quien toca, que es el caso real —
 * alguien se apunto con el nombre equivocado.
 */
export async function desvincular(peticion) {
  const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
  const trip = await exigirOwner(tripId, peticion.auth?.uid)

  const travelerId = cleanText(peticion.data?.travelerId ?? '').slice(0, 60)
  if (!travelerId) throw new HttpsError('invalid-argument', 'Falta a quien.')

  const uids = Object.entries(trip.uidToTraveler ?? {})
    .filter(([, quien]) => quien === travelerId)
    .map(([uid]) => uid)

  if (uids.length === 0) return { ok: true, yaEstabaSuelto: true }

  // Un owner no puede quedarse fuera de su propio viaje sin querer.
  if (uids.includes(peticion.auth.uid)) {
    throw new HttpsError('failed-precondition', 'No te puedes desvincular a ti mismo.')
  }

  const parche = {}
  for (const uid of uids) {
    parche[`uidToTraveler.${uid}`] = FieldValue.delete()
    parche[`roles.${uid}`] = FieldValue.delete()
  }
  await db.doc(`trips/${tripId}`).update(parche)
  return { ok: true, soltados: uids.length }
}
