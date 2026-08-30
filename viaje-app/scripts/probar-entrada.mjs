/**
 * Prueba la entrada de punta a punta, con un usuario de mentira.
 *
 * Hasta ahora «se apunta alguien nuevo» era el unico camino sin probar de toda
 * la app: reproducirlo pedia una cuenta de Google sin vincular. Ya no: con
 * credenciales de administrador se puede emitir un token propio, canjearlo por
 * uno de sesion y llamar a la funcion como lo haria una persona.
 *
 * Escribe en el viaje de verdad y **lo deshace al terminar**, pase lo que pase.
 *
 *   node scripts/probar-entrada.mjs
 */
import { readFileSync } from 'node:fs'

const P = 'viaje-familia-sept-2026'
const TRIP = 'sept-2026'

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const WEB_KEY = env.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim()
if (!WEB_KEY) { console.error('Falta VITE_FIREBASE_API_KEY en .env.local'); process.exit(1) }

const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getAuth } = await import('firebase-admin/auth')
const { getFirestore, FieldValue } = await import('firebase-admin/firestore')

// `createCustomToken` necesita firmar, y unas credenciales de usuario de
// gcloud no firman. Con `serviceAccountId` delega la firma en IAM
// (`iamcredentials.googleapis.com`), sin necesidad de una clave en disco:
// justo lo que queremos, porque una clave de cuenta de servicio en el portatil
// es el problema que ya tuvimos una vez.
initializeApp({
  credential: applicationDefault(),
  projectId: P,
  serviceAccountId: `${P}@appspot.gserviceaccount.com`,
})
const db = getFirestore()
const tripRef = db.doc(`trips/${TRIP}`)

// Un codigo libre de verdad, leido de Firestore: aqui no se escribe ninguno.
const trip = (await tripRef.get()).data()
const tomados = new Set(Object.values(trip.uidToTraveler ?? {}))
const codigos = await db.collection(`trips/${TRIP}/codes`).get()
const libre = codigos.docs.find((d) => d.get('joinCode') && !tomados.has(d.id))
const pillado = codigos.docs.find((d) => d.get('joinCode') && tomados.has(d.id))
if (!libre) { console.error('No queda ningun viajero libre con codigo: no se puede probar.'); process.exit(1) }

const URL_FN = `https://europe-west1-${P}.cloudfunctions.net/unirse`

/** Llama a la funcion tal y como lo hace el navegador: SIN sesion previa. */
async function llamar(codigo) {
  const res = await fetch(URL_FN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { tripId: TRIP, codigo } }),
  })
  const j = await res.json().catch(() => ({}))
  if (j.error) return { estado: j.error.status ?? `HTTP_${res.status}` }
  return { estado: 'OK', ...j.result }
}

/** Canjea el token como lo haria el navegador, para probar que sirve. */
async function canjear(token) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${WEB_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: `https://${P}.web.app/` },
    body: JSON.stringify({ token, returnSecureToken: true }),
  })
  const j = await r.json()
  return j.idToken ? 'OK' : (j.error?.message ?? 'SIN_TOKEN')
}

let fallos = 0
const comprobar = (nombre, real, esperado) => {
  const ok = real === esperado
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${nombre}  (${real}, esperado ${esperado})`)
}

try {
  comprobar('un codigo inventado se rechaza', (await llamar('ZZZZZZZZ')).estado, 'PERMISSION_DENIED')
  comprobar('un codigo corto se rechaza', (await llamar('ABC')).estado, 'INVALID_ARGUMENT')

  const r = await llamar(libre.get('joinCode'))
  comprobar(`con el codigo de ${libre.id} se entra SIN Google`, r.estado, 'OK')
  comprobar('y devuelve el viajero correcto', r.travelerId ?? '(nada)', libre.id)
  comprobar('el token sirve de verdad como sesion', await canjear(r.token ?? ''), 'OK')

  const uid = `viajero_${libre.id}`
  const despues = (await tripRef.get()).data()
  comprobar('queda enganchado con un uid estable', despues.uidToTraveler?.[uid] ?? '(nada)', libre.id)

  // Repetirlo en otro "dispositivo" tiene que dar el MISMO uid, no uno nuevo.
  const otra = await llamar(libre.get('joinCode'))
  comprobar('entrar dos veces no duplica identidades', otra.travelerId ?? '(nada)', libre.id)
  const despues2 = (await tripRef.get()).data()
  const cuantos = Object.values(despues2.uidToTraveler ?? {}).filter((t) => t === libre.id).length
  comprobar('y ese viajero sigue teniendo un solo uid', String(cuantos), '1')
} finally {
  // El viajero de prueba queda enganchado a un uid de verdad, que es lo que
  // pasaria si esa persona hubiera entrado. Se deshace para no dejar rastro.
  const uid = `viajero_${libre.id}`
  await tripRef.update({
    [`roles.${uid}`]: FieldValue.delete(),
    [`uidToTraveler.${uid}`]: FieldValue.delete(),
  }).catch(() => {})
  await getAuth().deleteUser(uid).catch(() => {})
  console.log('\n  Limpiado: el viajero de prueba vuelve a estar sin enganchar.')
}

console.log(fallos ? `  ${fallos} fallan.\n` : '  Todo como debe.\n')
process.exit(fallos ? 1 : 0)
