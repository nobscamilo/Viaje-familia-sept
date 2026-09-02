import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const lee = (r) => readFileSync(new URL(r, import.meta.url), 'utf8')

/**
 * Notas en las tarjetas de «Ahora».
 *
 * Camilo, probando la app: «poder dejar comentarios o notas, por ejemplo
 * recordar reservar». No es una funcion nueva: es el hilo de comentarios de
 * una decision colgando de la rama `timeline`, igual que los votos hicieron
 * ese mismo camino cuando los planes propuestos empezaron a votarse.
 *
 * Lo que estas pruebas vigilan es que las dos ramas NO se separen. El dia que
 * alguien arregle un fallo en los comentarios de decisiones y no en los de la
 * agenda, esto lo caza.
 */

test('los comentarios cuelgan de las dos ramas con la MISMA funcion', () => {
  const paths = lee('../src/services/paths.js')
  assert.match(paths, /commentsRef = \(fb, tripId, id, de = 'decisions'\)/)
  // Pasa por `rama()`, que valida contra RAMAS y revienta con un nombre
  // inventado: una coleccion mal escrita se llevaria las notas a una rama
  // sin reglas, donde Firestore deniega y nadie entiende por que.
  assert.match(paths, /rama\(de\), id, 'comments'/)
})

test('la rama viaja entera: hook, servicio y escritura', () => {
  assert.match(lee('../src/hooks/useComentarios.js'), /rama = 'decisions'/)
  const repo = lee('../src/services/tripRepo.js')
  assert.match(repo, /suscribirComentarios\(tripId, id, alRecibir, alFallar, rama = 'decisions'\)/)
  assert.match(repo, /commentsRef\(fb, tripId, id, rama\)/)
})

test('la agenda monta las notas de verdad, y con el id del momento', () => {
  // Una sustitucion que no encaja falla EN SILENCIO. Ya paso con `Lugar` y
  // `tripId`: el codigo compilaba, las pruebas pasaban y el boton no salia.
  const src = lee('../src/app/surfaces/Ahora.jsx')
  assert.match(src, /<Notas eventoId=\{event\.id\} \/>/)
})

test('las notas escritas se LEEN sin tocar nada; escribir es lo que se pliega', () => {
  // Es la regla que las distingue de los botones de gestion, que se
  // escondieron esa misma tarde: gestionar se pliega, avisar no. Una nota
  // «recordar reservar» detras de un toque no recuerda nada.
  const src = lee('../src/ui/Notas.jsx')
  const lista = src.indexOf('nts-lista')
  const abrir = src.indexOf('nts-abrir')
  assert.ok(lista > 0 && abrir > lista, 'la lista se pinta antes que el boton de escribir')
  // La lista NO esta condicionada por el estado de escritura.
  assert.match(src, /\{comentarios\.length > 0 && \(\s*<ul className="nts-lista">/)
  assert.match(src, /!escribiendo && \(\s*<button type="button" className="nts-abrir"/)
})

test('la rama timeline tiene sus propias reglas, no hereda las de decisions', () => {
  // Sin regla explicita, Firestore deniega por defecto: las notas fallarian
  // al escribirse y la persona veria un error que no entiende.
  const reglas = lee('../firestore.rules')
  const timeline = reglas.indexOf('match /timeline/{eventId}')
  const decisions = reglas.indexOf('match /decisions/{decisionId}')
  assert.ok(timeline > 0 && decisions > timeline, 'el orden del archivo cambio: revisa este test')
  const bloqueTimeline = reglas.slice(timeline, decisions)
  assert.match(bloqueTimeline, /match \/comments\/\{commentId\}/)
  assert.match(bloqueTimeline, /allow create: if isMember\(tripId\)/)
  assert.match(bloqueTimeline, /authorUid == request\.auth\.uid/)
})

test('las notas no las puede pisar la siembra', () => {
  // Viven en una subcoleccion, y `seed.mjs` hace `set()` sobre el documento
  // del momento: no alcanza a los hijos. Es lo que permite ponerle notas a un
  // vuelo sin marcarlo `tocadoAMano`.
  const seed = lee('../scripts/seed.mjs')
  assert.ok(!/comments/.test(seed), 'la siembra no debe saber nada de las notas')
})
