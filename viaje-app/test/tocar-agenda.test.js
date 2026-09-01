import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const lee = (r) => readFileSync(new URL(r, import.meta.url), 'utf8')

/**
 * Quitar los candados de la agenda sin que la funcion se deshaga sola.
 *
 * Desde el 1 de septiembre de 2026 cualquier adulto puede editar o quitar
 * cualquier momento, vuelos y hoteles incluidos. El peligro real de ese
 * cambio no es que alguien borre algo: es que `scripts/seed.mjs` hace
 * `set()` SIN merge sobre todo `src/data/`, asi que la siguiente publicacion
 * revertiria la correccion en silencio y resucitaria lo borrado. La persona
 * veria su cambio hecho y, al dia siguiente, deshecho, sin ningun mensaje.
 *
 * Estas pruebas vigilan las dos mitades: que el servidor deja tocar, y que la
 * siembra respeta lo tocado.
 */

test('la siembra no pisa lo que se edito desde la app', () => {
  const src = lee('../scripts/seed.mjs')
  assert.match(src, /tocadoAMano/, 'sin esto, editar un hotel dura hasta el siguiente publicar')
  assert.match(src, /borrados/, 'sin esto, un momento quitado vuelve solo')
  // Y se dice en voz alta: significa que `src/data/` y lo que ve la familia
  // ya no coinciden, y eso se arregla en el archivo.
  assert.match(src, /TOCADO/)
  assert.match(src, /QUITADO/)
})

test('el servidor ya no tiene candados por estado ni por origen', () => {
  const src = lee('../functions/planes.js')
  // Los tres mensajes que bloqueaban antes. Si alguno vuelve, vuelve el
  // problema entero: un plan confirmado que no se puede corregir.
  assert.ok(!/Ya está confirmado: eso lo (quita|cambia) quien organiza/.test(src))
  assert.ok(!/Eso no lo puso nadie desde la app/.test(src))
  assert.ok(!/Lo puso otra persona/.test(src))
  // Lo que SI queda: el rol.
  assert.match(src, /Con tu rol solo se puede mirar/)
})

test('quitar un momento sembrado deja lapida ANTES de borrarlo', () => {
  // Si se borrase primero y la lapida fallase, la siembra lo resucita y la
  // persona no entiende nada. Al reves solo queda una lapida huerfana, que
  // no hace dano.
  const src = lee('../functions/planes.js')
  const lapida = src.indexOf('if (sembrado) await ponerLapida')
  const borrado = src.indexOf('await ref.delete()')
  assert.ok(lapida > 0 && borrado > lapida, 'la lapida va antes que el delete')
})

test('editar algo sembrado lo marca, y editar algo propio no', () => {
  const src = lee('../functions/planes.js')
  assert.match(src, /const sembrado = esDeLaSiembra\(ev\)\n  if \(sembrado\) cambios\.tocadoAMano = true/)
})

test('el cambio de estado pasa por el servidor, no por Firestore directo', () => {
  // Un momento sembrado no tiene `createdBy`, y las reglas no dejan que un
  // adulto lo escriba desde el navegador. Un boton que las reglas van a
  // rechazar deja a la persona mirando un error que no entiende.
  assert.ok(!/export async function cambiarEstadoPlan/.test(lee('../src/services/tripRepo.js')))
  assert.match(lee('../src/services/planes.js'), /moverEstadoDeUnPlan/)
  assert.match(lee('../functions/index.js'), /export const moverEstadoDeUnPlan = onCall/)
})

test('las lapidas no se pueden escribir desde el navegador', () => {
  const reglas = lee('../firestore.rules')
  const desde = reglas.indexOf('match /borrados/{eventId}')
  assert.ok(desde > 0, 'la coleccion existe: tiene que tener regla, o cae en el deny por defecto')
  const bloque = reglas.slice(desde, desde + 200)
  assert.match(bloque, /allow read: if isMember\(tripId\)/)
  assert.match(bloque, /allow write: if false/)
})

test('los botones de cierre ya no viven dentro de la votacion', () => {
  // Ese era el fallo entero: al confirmar un plan desaparecia la votacion y
  // con ella todos los botones, y el momento quedaba congelado para siempre.
  const acc = lee('../src/ui/Acciones.jsx')
  assert.match(acc, /<Cierre/)
  const voto = acc.slice(acc.indexOf('function VotoDelPlan'))
  assert.ok(!/quitar|editar|confirmar/i.test(voto), 'VotoDelPlan solo cuenta votos')
})

test('el segundo toque se pide donde esta el dano, no en todas partes', () => {
  const cierre = lee('../src/ui/Cierre.jsx')
  assert.match(cierre, /a\.peligroso \? setPidiendo\(a\) : hacer\(a\)/)
  // Y quien decide que es peligroso es el dominio, que esta probado.
  assert.ok(!/origen|createdBy|status ===/.test(cierre), 'Cierre no razona sobre reservas')
})
