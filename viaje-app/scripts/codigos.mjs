/**
 * Genera un codigo personal para cada adulto y lo escribe en Firestore.
 *
 * Los codigos NO viven en el repositorio: este publica GitHub Pages, y un
 * codigo en el repo es una puerta abierta. Viven en `codes/{id}`, que NADIE
 * puede leer desde el cliente —ni siquiera un miembro del viaje—, y en el
 * mensaje que le mandas a cada uno.
 *
 * Se imprimen UNA VEZ, aqui, para que los puedas repartir. Si los pierdes,
 * `--rehacer` genera otros nuevos y los anteriores dejan de valer.
 *
 *   node scripts/codigos.mjs            # simulacro
 *   node scripts/codigos.mjs --write    # escribe los que falten
 *   node scripts/codigos.mjs --write --rehacer   # cambia TODOS
 *
 * Credenciales: `gcloud auth application-default login`.
 */
import { randomInt } from 'node:crypto'
import { TRAVELERS } from '../src/data/travelers.js'
import { TRIP } from '../src/data/trip-madrid-2026.js'

const ESCRIBIR = process.argv.includes('--write')
const REHACER = process.argv.includes('--rehacer')

// Sin I, O, 0, 1: se confunden dictando por teléfono o copiando a mano.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const codigo = () => Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')

const adultos = TRAVELERS.filter((t) => t.role !== 'child')
console.log(`\nViaje: ${TRIP.id} — ${adultos.length} adultos con cuenta\n`)

if (!ESCRIBIR) {
  for (const t of adultos) console.log(`  ${t.short.padEnd(20)} ${codigo()}   (simulacro)`)
  console.log('\nNada escrito. Lanzalo con --write cuando quieras repartirlos.\n')
  process.exit(0)
}

const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getFirestore } = await import('firebase-admin/firestore')
initializeApp({ credential: applicationDefault(), projectId: 'viaje-familia-sept-2026' })
const db = getFirestore()

const base = `trips/${TRIP.id}/codes`
const lote = db.batch()
let nuevos = 0

for (const t of adultos) {
  const ref = db.doc(`${base}/${t.id}`)
  const previo = (await ref.get()).get('joinCode')
  if (previo && !REHACER) {
    console.log(`  ${t.short.padEnd(20)} ${previo}   (ya tenia)`)
    continue
  }
  const c = codigo()
  lote.set(ref, { joinCode: c }, { merge: true })
  nuevos++
  console.log(`  ${t.short.padEnd(20)} ${c}   ${previo ? '(REEMPLAZA al anterior)' : '(nuevo)'}`)
}

await lote.commit()
console.log(`\n  ${nuevos} codigos nuevos escritos.`)
console.log('  Mandale a cada uno SOLO el suyo. Un codigo compartido vuelve a ser el problema de antes.\n')
