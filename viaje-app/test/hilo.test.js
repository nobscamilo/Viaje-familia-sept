import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HUECO_SESION_MS, sesionActual } from '../src/domain/hilo.js'
import { completarHasta, quitarLosFlojos } from '../functions/lib/ranking.js'

const lee = (r) => readFileSync(new URL(r, import.meta.url), 'utf8')

/**
 * La conversacion del copiloto se acaba sola.
 *
 * Camilo lo dijo probando la app: «mantener las conversaciones en el hilo no
 * es buena». La causa concreta era que `olvidar()` llevaba semanas escrita y
 * SIN NINGUN BOTON —el mismo fallo que el borrado de gastos en agosto— asi
 * que el hilo no se acababa nunca y cada pregunta viajaba al modelo con doce
 * intervenciones que podian ser de otro dia y de otra ciudad.
 */

const T = Date.parse('2026-09-14T18:00:00+02:00')
const haceMin = (min) => ({ rol: 'yo', texto: 'x', en: T - min * 60_000 })

test('una charla seguida es una sola conversacion', () => {
  const viva = sesionActual([haceMin(45), haceMin(20), haceMin(1)], new Date(T))
  assert.equal(viva.length, 3, 'una charla de 45 minutos no caduca por haber empezado antes')
})

test('tras un silencio largo no hay conversacion viva: se abre limpio', () => {
  // Es lo que hace que al abrir el copiloto salga la bienvenida con sus
  // atajos, en vez de la charla de anteayer.
  assert.deepEqual(sesionActual([haceMin(600), haceMin(590)], new Date(T)), [])
})

test('el hueco corta por el medio y deja solo la cola', () => {
  const viva = sesionActual([haceMin(600), haceMin(10), haceMin(1)], new Date(T))
  assert.equal(viva.length, 2, 'lo de hace diez horas no es parte de esto')
})

test('un cambio de dia corta aunque el hueco sea corto', () => {
  // El 14 se duerme en Barcelona y el 13 en Madrid: arrastrar el contexto de
  // ayer es arrastrar la ciudad de ayer, y ahi es donde el copiloto miente
  // con seguridad.
  const medianoche = Date.parse('2026-09-14T00:30:00+02:00')
  const antes = { rol: 'yo', texto: 'x', en: Date.parse('2026-09-13T23:50:00+02:00') }
  const despues = { rol: 'yo', texto: 'y', en: medianoche }
  assert.deepEqual(sesionActual([antes, despues], new Date(medianoche)), [despues])
})

test('un mensaje recien escrito, sin hora del servidor, nunca se corta', () => {
  // `serverTimestamp()` tarda en volver: hasta entonces `en` es null. Si eso
  // contara como «muy viejo», la app borraria de la pantalla lo que la
  // persona acaba de escribir.
  const recien = { rol: 'yo', texto: 'z', en: null }
  assert.deepEqual(sesionActual([haceMin(2), recien], new Date(T)).length, 2)
})

test('el hueco es de horas, no de minutos ni de dias', () => {
  // Una regla escrita en un numero magico caduca sin avisar. Esto fija el
  // orden de magnitud: una mañana, no una pausa para el cafe.
  assert.ok(HUECO_SESION_MS >= 2 * 60 * 60 * 1000)
  assert.ok(HUECO_SESION_MS <= 12 * 60 * 60 * 1000)
})

test('«Empezar de cero» tiene boton de verdad, no solo funcion', () => {
  // El fallo exacto que abrio todo esto: `olvidar()` existia y nadie podia
  // llamarla. Una funcion a la que no se llega desde la pantalla es una
  // funcion que no esta.
  const src = lee('../src/app/surfaces/Copiloto.jsx')
  assert.match(src, /cop-limpiar/)
  assert.match(src, /await olvidar\(\)/)
  // Y el hilo solo devuelve lo vivo, no el historial entero.
  assert.match(lee('../src/hooks/useHilo.js'), /restaurarConversacion\(todos/)
})

// ------------------------------------------------- cinco sitios, no dos

test('el minimo de nota no puede dejar la lista corta', () => {
  // El tope siempre fue 5; lo que fallaba es que `quitarLosFlojos` solo
  // devuelve el lote entero cuando NADIE pasa el corte. Con dos aprobados,
  // salian dos tarjetas y nadie sabia por que.
  const sitio = (nombre, rating) => ({ name: nombre, rating })
  const todos = [sitio('a', 4.6), sitio('b', 4.2), sitio('c', 3.1), sitio('d', 3.0), sitio('e', 2.9)]
  const buenos = quitarLosFlojos(todos)
  assert.equal(buenos.length, 2, 'el filtro sigue siendo el de siempre')

  const cinco = completarHasta(buenos, todos, 5)
  assert.equal(cinco.length, 5)
  assert.deepEqual(cinco.slice(0, 2).map((l) => l.name), ['a', 'b'],
    'los buenos van primero y en su orden; los flojos solo completan')
})

test('completarHasta no toca una lista que ya llega', () => {
  const todos = [1, 2, 3, 4, 5, 6, 7]
  assert.deepEqual(completarHasta([1, 2, 3, 4, 5], todos, 5), [1, 2, 3, 4, 5])
  assert.deepEqual(completarHasta([], todos, 3), [1, 2, 3])
})

test('la búsqueda conserva al menos cinco opciones aunque el modelo pida dos', async () => {
  const { buscarLugares } = await import('../functions/lib/herramientas.js')
  const lugares = Array.from({ length: 8 }, (_, i) => ({ id: String(i), displayName: { text: `Sitio ${i}` }, rating: 4 }))
  const r = await buscarLugares({ consulta: 'cena', ciudad: 'Madrid', cuantos: 2 }, {}, {
    searchPlaces: async () => lugares, withPlacePhotos: async (p) => p,
  })
  assert.equal(r.tarjetas.length, 5)
})
