import { test } from 'node:test'
import assert from 'node:assert/strict'
import { corregirSiMiente, queMintio } from '../functions/lib/copiloto.js'

const nada = { planes: [], propuestas: [], gastos: [] }
const conPropuesta = { planes: [], propuestas: [{ id: 'x' }], gastos: [] }

test('detecta que dijo haberlo dejado en Decisiones sin hacerlo', () => {
  assert.equal(queMintio('¡Listo! Ya dejé la pregunta en Decisiones para que voten.', nada),
    'dejarlo en Decisiones')
})

test('NO desmiente cuando sí llamó a proponerOpciones', () => {
  // `proponerOpciones` devuelve `eleccion`, no `propuesta`: el guardia daba un
  // falso positivo y desmentía al copiloto cuando había hecho su trabajo.
  assert.equal(queMintio('Ya dejé la elección en Decisiones.', conPropuesta), null)
})

test('detecta un gasto prometido y no apuntado', () => {
  assert.equal(queMintio('Listo, ya te lo apunté en las cuentas.', nada), 'apuntar el gasto')
  assert.equal(queMintio('Ya anoté el gasto.', { ...nada, gastos: [{ id: 'g' }] }), null)
})

test('junta varias promesas incumplidas en una sola frase', () => {
  const t = 'Lo agregué a la agenda y dejé la propuesta en Decisiones.'
  assert.equal(queMintio(t, nada), 'agregarlo a la agenda ni dejarlo en Decisiones')
})

test('una respuesta normal no se toca', () => {
  const t = 'El metro tarda 39 minutos desde Sol.'
  assert.equal(queMintio(t, nada), null)
  assert.equal(corregirSiMiente(t, nada), t)
})

test('el desmentido se añade, no sustituye', () => {
  const t = 'Ya lo dejé en Decisiones.'
  const r = corregirSiMiente(t, nada)
  assert.ok(r.startsWith(t))
  assert.match(r, /no llegué a dejarlo en Decisiones/)
})

// ------------------------------------------ los hogares, en dos sitios

test('la copia de los hogares del servidor NO se ha desincronizado', async () => {
  // `firebase deploy` solo sube `functions/`, así que hay dos definiciones de
  // los hogares. Duplicar datos es aceptable solo si algo vigila la copia:
  // esto es ese algo. Antes había una lista de adultos duplicada en
  // `gastos.js` sin nadie mirándola.
  const cliente = await import('../src/data/hogares.js')
  const servidor = await import('../functions/lib/hogares.js')

  assert.equal(servidor.HOGARES.length, cliente.HOGARES.length)
  for (const h of cliente.HOGARES) {
    const gemelo = servidor.HOGARES.find((x) => x.id === h.id)
    assert.ok(gemelo, `al servidor le falta el hogar ${h.id}`)
    assert.deepEqual([...gemelo.miembros].sort(), [...h.miembros].sort(), `${h.id}: miembros distintos`)
    assert.equal(gemelo.nombre, h.nombre, `${h.id}: nombre distinto`)
  }
  assert.equal(servidor.ADULTOS.length, 7)
})

test('cliente y servidor calculan el MISMO saldo', async () => {
  // No basta con que las listas coincidan: el reparto también tiene que dar
  // igual, o el copiloto diría un número y la pantalla otro.
  const { GASTOS_INICIALES } = await import('../src/data/gastos-iniciales.js')
  const { TRAVELERS } = await import('../src/data/travelers.js')
  const { GROUPS } = await import('../src/data/trip-madrid-2026.js')
  const cli = await import('../src/domain/cuentas.js')
  const srv = await import('../functions/lib/hogares.js')

  const a = cli.saldos(GASTOS_INICIALES, TRAVELERS, GROUPS)
  const b = srv.saldos(GASTOS_INICIALES)
  for (const id of Object.keys(a)) {
    assert.equal(b[id].saldo, a[id].saldo, `${id}: el servidor dice ${b[id].saldo} y la app ${a[id].saldo}`)
    assert.equal(b[id].debe, a[id].debe, `${id}: reparto distinto`)
  }
})

test('el copiloto sabe que tiene que rellenar ciudad y día', async () => {
  const { readFileSync } = await import('node:fs')
  // Las declaraciones se mudaron a su propio archivo el 30 de agosto, cuando
  // `herramientas.js` se acercó a las 400 líneas con la llegada de las rutas.
  const d = readFileSync(new URL('../functions/lib/declaraciones.js', import.meta.url), 'utf8')
  const h = readFileSync(new URL('../functions/lib/herramientas.js', import.meta.url), 'utf8')
  // Si estos parámetros desaparecen de las declaraciones, el modelo deja de
  // mandarlos y vuelven el bar de Velilla y el metro de madrugada.
  assert.match(d, /ciudad: \{\s*type: 'string',\s*enum: \['Madrid'/)
  assert.match(d, /cuando: \{/)
  assert.match(h, /momentoDeSalida/)
})

test('la ventana del viaje vive en un solo sitio', async () => {
  const { readFileSync, readdirSync } = await import('node:fs')
  // Estaba escrita a mano en planes.js, gastos.js e index.js. Tres copias sin
  // nadie vigilándolas es como se rompe un segundo viaje en silencio.
  const raiz = new URL('../functions/', import.meta.url)
  const sueltas = readdirSync(raiz)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => /'20\d\d-\d\d-\d\d'/.test(readFileSync(new URL(f, raiz), 'utf8')))
  assert.deepEqual(sueltas, [], `fechas del viaje escritas a mano en ${sueltas.join(', ')}`)
})

test('el guardia no desmiente una ruta de verdad', async () => {
  // `armarRuta` deja hasta seis momentos en la agenda pero devuelve `ruta`,
  // no `plan`. El mismo falso positivo que ya pasó con `proponerOpciones`.
  const recogido = { planes: [], propuestas: [], gastos: [], itinerarios: [{ id: 'r1' }] }
  assert.equal(queMintio('Te la he añadido a la agenda del domingo.', recogido), null)
})

test('todos los módulos del servidor se pueden importar de verdad', async () => {
  // `node --check` valida sintaxis, no rutas de importación. Al partir
  // `index.js` en dos quedó un `./lib/admin.js` dentro de `lib/` y solo lo
  // cazó el despliegue, después de compilar y subir. Esto lo caza en un
  // segundo.
  const { readdirSync } = await import('node:fs')
  const dir = new URL('../functions/lib/', import.meta.url)
  const archivos = readdirSync(dir).filter((f) => f.endsWith('.js'))
  assert.ok(archivos.length >= 8, 'esperaba más módulos en functions/lib')

  for (const f of archivos) {
    // `admin.js` arranca el SDK de administrador y necesita credenciales:
    // se comprueban sus importaciones sin ejecutarlo, leyendo el archivo.
    if (f === 'admin.js') continue
    await assert.doesNotReject(
      () => import(new URL(f, dir)),
      `functions/lib/${f} no se puede importar`,
    )
  }
})
