/**
 * Prueba agregar y quitar planes de punta a punta, contra las funciones
 * desplegadas y con un usuario de mentira que se borra al terminar.
 *
 * Escribe en el viaje de verdad. El `finally` lo deshace pase lo que pase:
 * borra el plan si quedo, desengancha al usuario y lo elimina.
 *
 *   node scripts/probar-planes.mjs
 */
import { readFileSync } from 'node:fs'

const P = 'viaje-familia-sept-2026'
const TRIP = 'sept-2026'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const WEB_KEY = env.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim()

const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getAuth } = await import('firebase-admin/auth')
const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
initializeApp({ credential: applicationDefault(), projectId: P })
const db = getFirestore()
const tripRef = db.doc(`trips/${TRIP}`)

// Entramos como lo haria una persona: con un codigo libre.
const trip = (await tripRef.get()).data()
const tomados = new Set(Object.values(trip.uidToTraveler ?? {}))
const codigos = await db.collection(`trips/${TRIP}/codes`).get()
const libre = codigos.docs.find((d) => d.get('joinCode') && !tomados.has(d.id))
if (!libre) { console.error('No queda ningun viajero libre con codigo.'); process.exit(1) }

const fn = (n) => `https://europe-west1-${P}.cloudfunctions.net/${n}`
const post = async (n, datos, idToken) => {
  const r = await fetch(fn(n), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ data: datos }),
  })
  const j = await r.json().catch(() => null)
  // Un 404 devuelve HTML, no JSON: sin esta comprobacion, una funcion que NI
  // SIQUIERA esta desplegada se leia como «OK» y la prueba daba verde sobre
  // el vacio. Paso de verdad la primera vez que se lanzo.
  if (!r.ok || !j) return { estado: j?.error?.status ?? `HTTP_${r.status}` }
  if (j.error) return { estado: j.error.status ?? `HTTP_${r.status}` }
  if (!j.result) return { estado: 'SIN_RESULTADO' }
  return { estado: 'OK', ...j.result }
}

const entrada = await post('unirse', { tripId: TRIP, codigo: libre.get('joinCode') })
const canje = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Referer: `https://${P}.web.app/` },
  body: JSON.stringify({ token: entrada.token, returnSecureToken: true }),
})
const { idToken } = await canje.json()

let fallos = 0
let creado = null
let rutaCreada = null
/** El doble de un momento sembrado. Id fijo para poder limpiarlo siempre. */
const DOBLE = 'prueba-sembrado-borrar'
const comprobar = (nombre, real, esperado) => {
  const ok = real === esperado
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${nombre}  (${real}, esperado ${esperado})`)
}

try {
  comprobar('sin sesion no se agrega', (await post('agregarPlan', { tripId: TRIP, titulo: 'x', fecha: '2026-09-11' })).estado, 'UNAUTHENTICATED')
  comprobar('una fecha fuera del viaje se rechaza', (await post('agregarPlan', { tripId: TRIP, titulo: 'x', fecha: '2026-12-01' }, idToken)).estado, 'INVALID_ARGUMENT')
  comprobar('sin titulo se rechaza', (await post('agregarPlan', { tripId: TRIP, titulo: '  ', fecha: '2026-09-11' }, idToken)).estado, 'INVALID_ARGUMENT')

  const r = await post('agregarPlan', {
    tripId: TRIP, titulo: 'Prueba automatica', fecha: '2026-09-11', hora: '13:00',
    lugar: 'C. de Cádiz, 4, Madrid', coords: { lat: 40.4158, lng: -3.703 }, placeId: 'demo',
  }, idToken)
  comprobar('se agrega con dia y hora', r.estado, 'OK')
  creado = r.id

  const doc = await db.doc(`trips/${TRIP}/timeline/${creado}`).get()
  comprobar('queda como propuesto', doc.get('status') ?? '(nada)', 'propuesto')
  comprobar('con la hora en la zona del viaje', doc.get('start') ?? '(nada)', '2026-09-11T13:00:00+02:00')
  comprobar('y con coordenadas, asi sale en el mapa', String(doc.get('coords')?.lat ?? '(nada)'), '40.4158')

  // --- Confirmarlo y seguir pudiendo corregirlo -------------------------
  //
  // Este es el caso que abrio el cambio del 1 de septiembre: hasta entonces,
  // confirmar un plan lo congelaba y la unica salida era borrarlo y volver a
  // crearlo, perdiendo los votos.
  comprobar('se confirma', (await post('moverEstadoDeUnPlan', { tripId: TRIP, id: creado, a: 'confirmado' }, idToken)).estado, 'OK')
  comprobar('y confirmado TODAVIA se puede editar', (await post('cambiarUnPlan', { tripId: TRIP, id: creado, titulo: 'Prueba corregida' }, idToken)).estado, 'OK')
  comprobar('el titulo cambio de verdad', (await db.doc(`trips/${TRIP}/timeline/${creado}`).get()).get('title'), 'Prueba corregida')
  comprobar('se devuelve a propuesto', (await post('moverEstadoDeUnPlan', { tripId: TRIP, id: creado, a: 'propuesto' }, idToken)).estado, 'OK')

  // --- Lo sembrado, sobre un doble ---------------------------------------
  //
  // NO se toca ninguna reserva de verdad. Se crea un momento que parece de la
  // siembra —sin `createdBy`, con `origen: 'seed'`— y se quita ese. Probar
  // esto contra el Vueling seria borrar un billete emitido para ver si el
  // boton funciona.
  await db.doc(`trips/${TRIP}/timeline/${DOBLE}`).set({
    title: 'Reserva de mentira (prueba)', kind: 'activity', status: 'confirmado',
    start: '2026-09-11T09:00:00+02:00', origen: 'seed',
  })
  comprobar('lo sembrado ahora SI se puede editar', (await post('cambiarUnPlan', { tripId: TRIP, id: DOBLE, titulo: 'Reserva corregida (prueba)' }, idToken)).estado, 'OK')
  comprobar('y queda marcado para que la siembra no lo pise', String((await db.doc(`trips/${TRIP}/timeline/${DOBLE}`).get()).get('tocadoAMano')), 'true')
  comprobar('lo sembrado ahora SI se puede quitar', (await post('quitarPlan', { tripId: TRIP, id: DOBLE }, idToken)).estado, 'OK')
  // Sin lapida, `npm run publicar` lo vuelve a crear manana y la persona que
  // lo quito no entiende nada. Es la mitad silenciosa de la funcion.
  comprobar('y deja lapida', (await db.doc(`trips/${TRIP}/borrados/${DOBLE}`).get()).exists ? 'si' : 'no', 'si')

  comprobar('lo mio si se quita', (await post('quitarPlan', { tripId: TRIP, id: creado }, idToken)).estado, 'OK')
  comprobar('y ya no esta', (await db.doc(`trips/${TRIP}/timeline/${creado}`).get()).exists ? 'sigue' : 'borrado', 'borrado')
  creado = null

  // --- El borrador de ruta: calcular sin escribir -------------------------
  //
  // Cuesta dos llamadas a Routes y es la unica forma de saber si las horas
  // salen de Google o de la nada. Sin esto, una ruta con todos los traslados
  // a null se lee igual de bien en pantalla.
  const borrador = {
    titulo: 'Ruta de prueba', fecha: '2026-09-11', ciudad: 'Madrid',
    modo: 'WALK', horaInicio: '10:00', grupo: 'todos',
    paradas: [
      { titulo: 'Puerta del Sol', tipo: 'activity', minutos: 30, coords: { lat: 40.4169, lng: -3.7035 } },
      { titulo: 'Plaza Mayor', tipo: 'activity', minutos: 30, coords: { lat: 40.4155, lng: -3.7074 } },
    ],
  }
  const rec = await post('recalcularRuta', { tripId: TRIP, ruta: borrador }, idToken)
  comprobar('el borrador se recalcula', rec.estado, 'OK')
  comprobar('empieza a la hora pedida', rec.borrador?.paradas?.[0]?.llegada ?? '(nada)', '10:00')
  // 30 min en Sol + andar hasta Plaza Mayor: la segunda parada NO puede
  // llegar a las 10:30 clavadas si el traslado se pregunto de verdad.
  comprobar('y el traslado lo puso Google, no el reloj',
    rec.borrador?.paradas?.[0]?.alSiguiente ? 'si' : 'no', 'si')
  comprobar('nada se escribio en la agenda',
    (await db.collection(`trips/${TRIP}/timeline`).where('rutaNombre', '==', 'Ruta de prueba').get()).empty ? 'vacio' : 'escribio', 'vacio')

  const guardada = await post('guardarRuta', { tripId: TRIP, ruta: borrador }, idToken)
  comprobar('el borrador se guarda', guardada.estado, 'OK')
  rutaCreada = guardada.ruta?.id
  const enAgenda = await db.collection(`trips/${TRIP}/timeline`).where('rutaId', '==', rutaCreada ?? 'x').get()
  comprobar('y ahora si esta en la agenda', String(enAgenda.size), '2')
  comprobar('propuesta, no confirmada', enAgenda.docs[0]?.get('status') ?? '(nada)', 'propuesto')
  comprobar('la ruta entera se quita de una vez', (await post('quitarRuta', { tripId: TRIP, rutaId: rutaCreada }, idToken)).estado, 'OK')
  comprobar('y no queda ninguna parada',
    String((await db.collection(`trips/${TRIP}/timeline`).where('rutaId', '==', rutaCreada).get()).size), '0')
  rutaCreada = null
} finally {
  if (creado) await db.doc(`trips/${TRIP}/timeline/${creado}`).delete().catch(() => {})
  await db.doc(`trips/${TRIP}/timeline/${DOBLE}`).delete().catch(() => {})
  await db.doc(`trips/${TRIP}/borrados/${DOBLE}`).delete().catch(() => {})
  if (rutaCreada) {
    const sueltas = await db.collection(`trips/${TRIP}/timeline`).where('rutaId', '==', rutaCreada).get()
    await Promise.all(sueltas.docs.map((d) => d.ref.delete().catch(() => {})))
  }
  const uid = `viajero_${libre.id}`
  await tripRef.update({
    [`roles.${uid}`]: FieldValue.delete(),
    [`uidToTraveler.${uid}`]: FieldValue.delete(),
  }).catch(() => {})
  await getAuth().deleteUser(uid).catch(() => {})
  console.log('\n  Limpiado.')
}

console.log(fallos ? `  ${fallos} fallan.\n` : '  Todo como debe.\n')
process.exit(fallos ? 1 : 0)
