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

  comprobar('un momento de la siembra NO se puede quitar', (await post('quitarPlan', { tripId: TRIP, id: 'vuelo-av182' }, idToken)).estado, 'PERMISSION_DENIED')
  comprobar('lo mio si se quita', (await post('quitarPlan', { tripId: TRIP, id: creado }, idToken)).estado, 'OK')
  comprobar('y ya no esta', (await db.doc(`trips/${TRIP}/timeline/${creado}`).get()).exists ? 'sigue' : 'borrado', 'borrado')
  creado = null
} finally {
  if (creado) await db.doc(`trips/${TRIP}/timeline/${creado}`).delete().catch(() => {})
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
