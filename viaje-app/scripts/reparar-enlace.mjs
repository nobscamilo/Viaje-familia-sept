/**
 * Vuelve a enganchar a una persona con su viajero, a partir de su correo.
 *
 * Existe porque `scripts/seed.mjs` escribia `roles: {}` y `uidToTraveler: {}`
 * en cada siembra y borraba los enlaces de todos. Ya no lo hace, pero hacia
 * falta algo para reparar el destrozo — y sirve igual el dia que alguien se
 * apunte con el nombre equivocado.
 *
 *   node scripts/reparar-enlace.mjs correo@ejemplo.com camilo owner
 */
const [correo, travelerId, rol = 'adult'] = process.argv.slice(2)
if (!correo || !travelerId) {
  console.error('Uso: node scripts/reparar-enlace.mjs <correo> <travelerId> [rol]')
  process.exit(1)
}

const P = 'viaje-familia-sept-2026'
const { initializeApp, applicationDefault } = await import('firebase-admin/app')
const { getAuth } = await import('firebase-admin/auth')
const { getFirestore } = await import('firebase-admin/firestore')

initializeApp({ credential: applicationDefault(), projectId: P })

const user = await getAuth().getUserByEmail(correo).catch(() => null)
if (!user) { console.error(`No hay ninguna cuenta con ${correo}. ¿Ha entrado ya con Google?`); process.exit(1) }

await getFirestore().doc('trips/sept-2026').update({
  [`roles.${user.uid}`]: rol,
  [`uidToTraveler.${user.uid}`]: travelerId,
})
console.log(`  ${correo} -> ${travelerId} (${rol}). Listo.`)
