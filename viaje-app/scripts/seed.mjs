/**
 * Espeja los datos verificados de `src/data/` en Firestore.
 *
 * Esto NO es un volcado ciego: es un espejo. Lo que se quita de `src/data/`
 * se borra de Firestore, porque si no, la agenda que ve la familia se queda
 * con momentos y decisiones que ya no existen. Paso el 26 de agosto de 2026:
 * el codigo tenia Santander, Guardo y el AV027, y en Firestore seguia
 * viviendo un viaje que acababa el 19.
 *
 * Lo que NUNCA se borra: lo que ha creado una persona. Un plan que el
 * copiloto agrego a peticion de alguien lleva `createdBy` con su uid; los
 * documentos de siembra, no. Esa es la frontera.
 *
 * Tampoco se pisa el estado de una decision: si la familia ya voto y la
 * decision paso de `propuesto` a otra cosa, se respeta.
 *
 * Por defecto NO escribe: imprime lo que haria. Para escribir de verdad hay
 * que pasar --write a proposito. Un script de siembra que escribe por defecto
 * es un script que algun dia borra el viaje de alguien.
 *
 *   node scripts/seed.mjs            # simulacro
 *   node scripts/seed.mjs --write    # escribe
 *
 * Credenciales: vale con `gcloud auth application-default login`. No hace
 * falta una clave de cuenta de servicio en disco, y es mejor que no la haya.
 */
import { TRAVELERS } from '../src/data/travelers.js'
import { DECISIONES_CERRADAS, GROUPS, OPEN_DECISIONS, TIMELINE, TRIP } from '../src/data/trip-madrid-2026.js'
import { GASTOS_INICIALES } from '../src/data/gastos-iniciales.js'

const ESCRIBIR = process.argv.includes('--write')
const TRIP_ID = TRIP.id

// Los uid de Google se rellenan cuando cada uno entre por primera vez.
// Aqui solo dejamos el hueco y el rol que le toca.
const ROLES_INICIALES = {
  camilo: 'owner',
  'juliana-bueno': 'owner',
  'julian-padre': 'adult',
  cielo: 'adult',
  'juliana-hermana': 'adult',
  fernando: 'adult',
  'julian-david': 'adult',
  // Los ninos NO aparecen: no tienen cuenta y no votan.
}

/**
 * El documento del viaje, SIN `roles` ni `uidToTraveler`.
 *
 * Esos dos mapas son de las personas, no de los datos: dicen quien ha entrado
 * y como quien. Estuvieron aqui puestos a `{}` "para dejar el hueco", y el
 * 27 de agosto de 2026 se descubrio lo que hacian de verdad: **cada `npm run
 * publicar` desvinculaba a toda la familia**. Camilo aparecia como no
 * enlazado en su propio viaje.
 *
 * La regla que queda: la siembra escribe lo que sale de `src/data/`. Lo que
 * genera la gente al usar la app no se toca nunca desde aqui.
 */
const tripDoc = {
  ...TRIP,
  groups: GROUPS,
  rolesPorViajero: ROLES_INICIALES,
  seededAt: new Date().toISOString(),
}

console.log(`\nViaje: ${TRIP_ID}`)
console.log(`Fuente: ${TRAVELERS.length} viajeros - ${TIMELINE.length} momentos - ${OPEN_DECISIONS.length} decisiones abiertas + ${DECISIONES_CERRADAS.length} cerradas - ${GASTOS_INICIALES.length} gastos ya pagados`)

if (!ESCRIBIR) {
  console.log('\n[simulacro] No se escribe nada. El diff real necesita leer Firestore.')
  console.log('Vuelve a lanzarlo con --write cuando estes seguro.\n')
  for (const e of TIMELINE) console.log(`  timeline/${e.id}`)
  for (const d of OPEN_DECISIONS) console.log(`  decisions/${d.id}`)
  for (const g of GASTOS_INICIALES) console.log(`  gastos/${g.id}`)
  process.exit(0)
}

const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getFirestore } = await import('firebase-admin/firestore')

initializeApp({ credential: applicationDefault(), projectId: 'viaje-familia-sept-2026' })
const db = getFirestore()

const base = `trips/${TRIP_ID}`
const lote = db.batch()
const resumen = { creados: 0, actualizados: 0, borrados: 0, respetados: 0 }

// --- El viaje y los viajeros: merge, para no pisar roles ni vinculaciones ---
lote.set(db.doc(base), tripDoc, { merge: true })
for (const t of TRAVELERS) lote.set(db.doc(`${base}/travelers/${t.id}`), t, { merge: true })

// --- Linea de tiempo: espejo exacto de la fuente, con DOS excepciones ---
//
// Desde el 1 de septiembre de 2026 la app deja quitar y corregir cualquier
// momento, incluidos los vuelos y los hoteles. Este espejo hacia `set()` sin
// merge sobre todos ellos, asi que sin lo que viene abajo cada publicacion
// revertiria la correccion en silencio y resucitaria lo borrado. Un boton que
// deshace su propio efecto en el siguiente despliegue es peor que no tenerlo.
//
//   · `tocadoAMano`  -> alguien lo edito desde la app. No se pisa.
//   · lapida en `borrados/{id}` -> alguien lo quito. No se vuelve a crear.
//
// Las dos se avisan en consola y a proposito con un rotulo distinto: quiere
// decir que `src/data/` y lo que ve la familia YA NO DICEN LO MISMO, y eso hay
// que arreglarlo en el archivo, no dejarlo vivir en Firestore.
const timelineActual = await db.collection(`${base}/timeline`).get()
const idsFuente = new Set(TIMELINE.map((e) => e.id))
const lapidas = new Set((await db.collection(`${base}/borrados`).get()).docs.map((d) => d.id))
const tocados = new Set(timelineActual.docs.filter((d) => d.get('tocadoAMano')).map((d) => d.id))

for (const doc of timelineActual.docs) {
  if (idsFuente.has(doc.id)) continue
  if (doc.get('createdBy')) {          // lo pidio una persona: no se toca
    resumen.respetados++
    console.log(`  RESPETADO  timeline/${doc.id} - lo creo alguien, no la siembra`)
    continue
  }
  if (doc.get('tocadoAMano')) {
    resumen.respetados++
    console.log(`  RESPETADO  timeline/${doc.id} - editado desde la app`)
    continue
  }
  lote.delete(doc.ref)
  resumen.borrados++
  console.log(`  BORRADO    timeline/${doc.id} - ya no esta en src/data/`)
}

for (const e of TIMELINE) {
  if (lapidas.has(e.id)) {
    resumen.respetados++
    console.log(`  QUITADO    timeline/${e.id} - ${e.title}`)
    console.log(`             lo quito alguien desde la app y NO se vuelve a crear.`)
    console.log(`             Si tiene que volver: borra trips/${TRIP_ID}/borrados/${e.id} y quita`)
    console.log(`             el momento de src/data/ si de verdad ya no va.`)
    continue
  }
  if (tocados.has(e.id)) {
    resumen.respetados++
    console.log(`  TOCADO     timeline/${e.id} - ${e.title}`)
    console.log(`             editado desde la app: src/data/ ya no manda aqui. Pasa el cambio`)
    console.log(`             al archivo y quita el campo tocadoAMano para volver al espejo.`)
    continue
  }
  const existia = timelineActual.docs.some((d) => d.id === e.id)
  // set() sin merge: si en la fuente se quito un `warning`, tiene que desaparecer.
  lote.set(db.doc(`${base}/timeline/${e.id}`), { ...e, origen: 'seed' })
  if (existia) resumen.actualizados++
  else { resumen.creados++; console.log(`  CREADO     timeline/${e.id} - ${e.title}`) }
}

// --- Decisiones: igual, pero sin pisar el estado si la familia ya voto ---
const decisionesActuales = await db.collection(`${base}/decisions`).get()
const idsDecisiones = new Set([...OPEN_DECISIONS, ...DECISIONES_CERRADAS].map((d) => d.id))

for (const doc of decisionesActuales.docs) {
  if (idsDecisiones.has(doc.id)) continue
  // Ojo: el arranque del cliente firma con el uid de quien entro primero, no
  // con 'seed'. Lo que distingue de verdad es la marca `origen`.
  if (doc.get('origen') !== 'seed' && doc.get('createdBy') && doc.get('createdBy') !== 'seed') {
    resumen.respetados++
    console.log(`  RESPETADO  decisions/${doc.id} - la abrio alguien`)
    continue
  }
  lote.delete(doc.ref)
  resumen.borrados++
  console.log(`  BORRADO    decisions/${doc.id} - ya no esta en src/data/`)
}

for (const d of OPEN_DECISIONS) {
  const previa = decisionesActuales.docs.find((x) => x.id === d.id)
  const estadoPrevio = previa?.get('status')
  lote.set(db.doc(`${base}/decisions/${d.id}`), {
    ...d,
    // Si ya se voto y dejo de estar propuesta, mandan ellos, no el archivo.
    status: estadoPrevio && estadoPrevio !== 'propuesto' ? estadoPrevio : 'propuesto',
    createdBy: previa?.get('createdBy') ?? 'seed',
    origen: 'seed',
  })
  if (previa) resumen.actualizados++
  else { resumen.creados++; console.log(`  CREADA     decisions/${d.id} - ${d.title}`) }
}

// Las cerradas se escriben tal cual: su estado lo fija la fuente, con el
// motivo por el que se cerraron. No se borran nunca.
for (const d of DECISIONES_CERRADAS) {
  const previa = decisionesActuales.docs.find((x) => x.id === d.id)
  lote.set(db.doc(`${base}/decisions/${d.id}`), {
    ...d,
    createdBy: previa?.get('createdBy') ?? 'seed',
    origen: 'seed',
  })
  if (previa) { resumen.actualizados++; console.log(`  CERRADA    decisions/${d.id} - ${d.title}`) }
  else resumen.creados++
}

// --- Gastos ya pagados: espejo, igual que la agenda ---
//
// Estos NO son gastos que haya anotado nadie desde el movil: son las
// reservas, verificadas una a una contra los correos. Por eso llevan
// `origen: 'seed'`, que en las reglas de Firestore significa «esto no se
// borra desde la app». Si un importe esta mal se corrige en
// `src/data/gastos-iniciales.js`, donde al lado queda escrito de que correo
// salio cada numero.
const gastosActuales = await db.collection(`${base}/gastos`).get()
const idsGastos = new Set(GASTOS_INICIALES.map((g) => g.id))

for (const doc of gastosActuales.docs) {
  if (idsGastos.has(doc.id)) continue
  if (doc.get('origen') !== 'seed') {
    resumen.respetados++
    console.log(`  RESPETADO  gastos/${doc.id} - lo anoto alguien`)
    continue
  }
  lote.delete(doc.ref)
  resumen.borrados++
  console.log(`  BORRADO    gastos/${doc.id} - ya no esta en src/data/`)
}

for (const g of GASTOS_INICIALES) {
  const existia = gastosActuales.docs.some((d) => d.id === g.id)
  lote.set(db.doc(`${base}/gastos/${g.id}`), { ...g, origen: 'seed' })
  existia ? resumen.actualizados++ : resumen.creados++
  if (!existia) console.log(`  CREADO     gastos/${g.id} - ${g.concepto}`)
}

await lote.commit()

console.log(`\n  ${resumen.creados} creados - ${resumen.actualizados} actualizados`)
console.log(`  ${resumen.borrados} borrados - ${resumen.respetados} respetados por ser de alguien\n`)
