/**
 * Mueve los codigos personales de `travelers/{id}` a `codes/{id}`.
 *
 * Estaban donde no debian: `travelers` lo puede leer cualquier miembro del
 * viaje, asi que cualquiera podia leer el codigo de otro y —como «el codigo
 * manda»— entrar como el. El arreglo de la suplantacion abrio otro agujero
 * mas pequeño.
 *
 *   node scripts/mover-codigos.mjs --write
 */
import { TRIP } from '../src/data/trip-madrid-2026.js'

const ESCRIBIR = process.argv.includes('--write')

const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getFirestore, FieldValue } = await import('firebase-admin/firestore')
initializeApp({ credential: applicationDefault(), projectId: 'viaje-familia-sept-2026' })
const db = getFirestore()

const base = `trips/${TRIP.id}`
const viajeros = await db.collection(`${base}/travelers`).get()
const conCodigo = viajeros.docs.filter((d) => d.get('joinCode'))

console.log(`\n  ${conCodigo.length} codigos que mover\n`)
for (const d of conCodigo) console.log(`    ${d.id}`)

if (!ESCRIBIR) { console.log('\n[simulacro] Nada escrito.\n'); process.exit(0) }

const lote = db.batch()
for (const d of conCodigo) {
  lote.set(db.doc(`${base}/codes/${d.id}`), { joinCode: d.get('joinCode') }, { merge: true })
  lote.update(d.ref, { joinCode: FieldValue.delete() })
}
await lote.commit()
console.log('\n  Movidos. Ya no se pueden leer desde el cliente.\n')
