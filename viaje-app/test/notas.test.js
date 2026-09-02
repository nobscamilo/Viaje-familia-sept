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

  // La lista depende SOLO de que haya notas: ni del estado de escritura, ni
  // del de edicion. Se comprueba la condicion que la envuelve, no el texto
  // exacto de la linea — la version anterior de esta prueba se rompio al
  // meter el modo edicion, que es justo lo que tenia que dejar pasar.
  assert.match(src, /\{comentarios\.length > 0 && \(\s*<ul className="nts-lista">/)

  // Y el boton de escribir SI esta detras del estado.
  const linea = src.split('\n').find((l) => l.includes('!escribiendo'))
  assert.ok(linea && /!escribiendo/.test(linea), 'escribir se pliega')
  assert.ok(!/escribiendo[^)]*nts-lista/s.test(src), 'la lista no puede depender de escribir')
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

// -------------------------------------------- corregir y quitar una nota

test('el permiso de una nota espeja las reglas de Firestore, no las inventa', async () => {
  // «Las cerraduras de la interfaz espejan las de Firestore» es regla del
  // proyecto desde agosto: un boton que el servidor va a rechazar deja a la
  // persona mirando un error que no entiende.
  const { puedeBorrarNota, puedeEditarNota } = await import('../src/domain/notas.js')
  const mia = { authorUid: 'uid-julian', text: 'Recordar reservar' }
  const ajena = { authorUid: 'uid-cielo', text: 'Llevar el contrato' }

  assert.equal(puedeEditarNota(mia, 'uid-julian'), true)
  assert.equal(puedeEditarNota(ajena, 'uid-julian'), false)
  // Ni siendo owner se corrige lo que dijo otro: eso es hablar por él.
  assert.equal(puedeEditarNota(ajena, 'uid-camilo'), false)

  assert.equal(puedeBorrarNota(mia, { uid: 'uid-julian' }), true)
  assert.equal(puedeBorrarNota(ajena, { uid: 'uid-julian' }), false)
  // Quien organiza SI puede limpiar una nota que sobra.
  assert.equal(puedeBorrarNota(ajena, { uid: 'uid-camilo', esOwner: true }), true)

  // Sin sesión no se toca nada.
  assert.equal(puedeEditarNota(mia, null), false)
  assert.equal(puedeBorrarNota(mia, {}), false)
})

test('la asimetría editar/borrar es la MISMA en el dominio y en las reglas', () => {
  // Si alguien relaja una y no la otra, la app promete algo que el servidor
  // rechaza (o al revés, esconde algo que sí se puede).
  const dominio = lee('../src/domain/notas.js')
  assert.match(dominio, /puedeEditarNota\(nota, uid\) \|\| Boolean\(esOwner\)/)

  const reglas = lee('../firestore.rules')
  const timeline = reglas.indexOf('match /timeline/{eventId}')
  const bloque = reglas.slice(timeline, reglas.indexOf('match /decisions/{decisionId}'))
  const comments = bloque.slice(bloque.indexOf('match /comments/{commentId}'))
  assert.match(comments, /allow update: if resource\.data\.authorUid == request\.auth\.uid/)
  assert.match(comments, /allow delete: if resource\.data\.authorUid == request\.auth\.uid \|\| isOwner\(tripId\)/)
})

test('editar NUNCA manda authorUid: la regla lo exige intacto', () => {
  // `unchanged('authorUid')` rechaza la escritura si el campo viaja, aunque
  // viaje con el mismo valor que ya tenia. Mandarlo seria pedirle a Firestore
  // que diga que no.
  const repo = lee('../src/services/tripRepo.js')
  const desde = repo.indexOf('export async function editarComentario')
  const cuerpo = repo.slice(desde, repo.indexOf('export async function borrarComentario'))
  assert.ok(!/authorUid/.test(cuerpo), 'editarComentario no puede tocar el autor')
  assert.match(cuerpo, /editadoPor: uid/)
})

test('editar y quitar tienen camino desde la pantalla, no solo funcion', () => {
  // El fallo recurrente de este proyecto: servicio, reglas y pruebas verdes
  // sin ningun boton. Paso con el borrado de gastos y con `olvidar()`.
  const src = lee('../src/ui/Notas.jsx')
  assert.match(src, /className="nts-editar"/)
  assert.match(src, /className="nts-quitar"/)
  assert.match(src, /onClick=\{\(\) => quitar\(c\.id\)\}/)
  // Y el JSX no razona sobre permisos: pregunta al dominio.
  assert.match(src, /puedeEditarNota\(c, user\?\.uid\)/)
  assert.ok(!/authorUid ===/.test(src), 'el permiso se decide en domain/notas.js')
})
