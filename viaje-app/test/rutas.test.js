import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { GROUPS } from '../src/data/trip-madrid-2026.js'
import { TRAVELERS } from '../src/data/travelers.js'
import { VIAJE_DESDE, VIAJE_HASTA, dentroDelViaje } from '../functions/lib/ventana.js'

const lee = (r) => readFileSync(new URL(r, import.meta.url), 'utf8')

test('armarRuta está declarada, se ejecuta y está enchufada', () => {
  // Tres archivos distintos, y si falta uno la herramienta existe a medias:
  // el modelo la llama y no pasa nada, o no la llama nunca.
  assert.match(lee('../functions/lib/declaraciones.js'), /name: 'armarRuta'/)
  assert.match(lee('../functions/lib/herramientas.js'), /nombre === 'armarRuta'/)
  assert.match(lee('../functions/index.js'), /armarRuta: \(args\) =>/)
})

test('la ventana del viaje coincide con la del propio viaje', () => {
  // El servidor no importa `src/data`; si las dos se separan, el copiloto
  // rechaza días que la app sí acepta y nadie entiende por qué.
  assert.equal(VIAJE_DESDE, '2026-09-10')
  assert.equal(VIAJE_HASTA, '2026-09-23')
  assert.ok(dentroDelViaje('2026-09-13'))
  assert.ok(!dentroDelViaje('2026-09-24'))
  assert.ok(!dentroDelViaje('mañana'))
})

test('el grupo se busca por su id, no por la clave del mapa', () => {
  // `groups.sinF1.id === 'sin-f1'`. Buscar por la clave devuelve undefined y
  // el aviso de los niños se apaga justo en el grupo en el que van.
  const porClave = GROUPS['sin-f1']
  assert.equal(porClave, undefined, 'si esto deja de ser undefined, revisa rutas.js')
  const porId = Object.values(GROUPS).find((g) => g.id === 'sin-f1')
  assert.ok(porId, 'el grupo sin F1 tiene que encontrarse por id')

  const menores = TRAVELERS.filter((t) => t.age < 18).map((t) => t.id)
  assert.equal(menores.length, 2)
  assert.ok(menores.every((id) => porId.travelerIds.includes(id)),
    'los dos niños van en el plan sin F1: el aviso tiene que saltar ahí')
})

test('rutas.js no escribe nada fuera de la agenda del viaje', () => {
  const src = lee('../functions/rutas.js')
  // Todas las escrituras tienen que colgar de trips/{tripId}/timeline.
  const escrituras = [...src.matchAll(/lote\.(set|delete)\(/g)]
  assert.ok(escrituras.length >= 2, 'esperaba escrituras en lote')
  assert.ok(!/\.collection\('(?!trips)/.test(src), 'colección fuera del viaje')
  // Y las paradas entran propuestas, nunca confirmadas.
  assert.match(src, /status: 'propuesto'/)
  assert.ok(!/status: 'confirmado'/.test(src), 'una ruta no se autoconfirma')
})
