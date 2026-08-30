/**
 * Comprueba que `resolverSitio` devuelve coordenadas de verdad.
 *
 * Es lo que hace que un plan agregado por el copiloto salga tambien en el
 * mapa. No escribe en Firestore: solo llama a Places, asi que se puede lanzar
 * cuantas veces haga falta.
 *
 *   GOOGLE_MAPS_API_KEY=... node functions/probar-sitio.mjs "Rosi La Loca, Madrid"
 */
import { resolverSitio } from './lib/maps.js'

for (const consulta of process.argv.slice(2)) {
  const r = await resolverSitio(consulta)
  console.log(r ? `  OK   ${consulta} -> ${r.coords.lat}, ${r.coords.lng} · ${r.address}` : `  NADA ${consulta}`)
}
