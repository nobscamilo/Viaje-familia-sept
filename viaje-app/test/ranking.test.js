import test from 'node:test'
import assert from 'node:assert/strict'
import {
  abiertoEl, diaDeLaSemana, horarioDelDia, mediaDelLote, notaPonderada,
  ordenarPorNota, quitarLosFlojos,
} from '../functions/lib/ranking.js'

/**
 * La prueba que justifica todo el archivo.
 *
 * Es el caso que Camilo pidió cuando dijo «que la puntuación sea muy
 * importante»: si «muy importante» se implementa como ordenar por nota, gana
 * el sitio de siete reseñas. Aquí se fija por escrito que no.
 */
test('un 4,5 con 3.000 reseñas gana a un 4,9 con 7', () => {
  const lugares = [
    { name: 'Trampa', rating: 4.9, userRatingCount: 7 },
    { name: 'De toda la vida', rating: 4.5, userRatingCount: 3000 },
    { name: 'Del montón', rating: 4.1, userRatingCount: 800 },
  ]
  const orden = ordenarPorNota(lugares).map((l) => l.name)
  assert.deepEqual(orden, ['De toda la vida', 'Trampa', 'Del montón'])
})

test('con muchas reseñas la nota propia manda casi entera', () => {
  const media = 4.0
  const conMuchas = notaPonderada(4.8, 5000, media)
  assert.ok(conMuchas > 4.75, `esperaba casi 4,8 y salió ${conMuchas}`)
  const conPocas = notaPonderada(4.8, 4, media)
  assert.ok(conPocas < 4.1, `con 4 reseñas debería tirar a la media y salió ${conPocas}`)
})

test('un sitio sin nota no es un cero: va al final, pero va', () => {
  const lugares = [
    { name: 'Sin valorar' },
    { name: 'Bueno', rating: 4.6, userRatingCount: 500 },
  ]
  const orden = ordenarPorNota(lugares)
  assert.deepEqual(orden.map((l) => l.name), ['Bueno', 'Sin valorar'])
  assert.equal(orden[1].notaPonderada, null)
})

test('la media es la del propio lote, no un número inventado', () => {
  assert.equal(mediaDelLote([{ rating: 4 }, { rating: 5 }]), 4.5)
  assert.equal(mediaDelLote([{ name: 'sin nota' }]), null)
})

test('el filtro nunca devuelve la lista vacía', () => {
  const flojos = [{ rating: 3.1 }, { rating: 2.8 }]
  // Si el mínimo se aplicara a rajatabla, aquí no quedaría nada y la
  // búsqueda "funcionaría" sin encontrar nunca nada: el peor fallo posible.
  assert.equal(quitarLosFlojos(flojos).length, 2)
  assert.equal(quitarLosFlojos([...flojos, { rating: 4.5 }]).length, 1)
})

test('domingo es 0, como en Places', () => {
  assert.equal(diaDeLaSemana('2026-09-13'), 0)
  assert.equal(diaDeLaSemana('2026-09-14'), 1)
  assert.equal(diaDeLaSemana('no es una fecha'), null)
})

const LUNES_9_A_20 = { periods: [{ open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 20, minute: 0 } }] }

test('abierto, cerrado y no lo sé son tres respuestas distintas', () => {
  // 2026-09-14 es lunes.
  assert.equal(abiertoEl(LUNES_9_A_20, '2026-09-14', '12:00'), true)
  assert.equal(abiertoEl(LUNES_9_A_20, '2026-09-14', '21:00'), false)
  // Martes no hay tramo: cerrado.
  assert.equal(abiertoEl(LUNES_9_A_20, '2026-09-15', '12:00'), false)
  // Sin horario NO es cerrado. Mucho sitio no lo publica, y tratar el
  // desconocido como un no dejaría fuera media ciudad.
  assert.equal(abiertoEl(null, '2026-09-14', '12:00'), null)
  assert.equal(abiertoEl({ periods: [] }, '2026-09-14', '12:00'), null)
})

test('un bar que cierra a las tres de la mañana sigue abierto a la una', () => {
  const nocturno = {
    periods: [{ open: { day: 6, hour: 20, minute: 0 }, close: { day: 0, hour: 3, minute: 0 } }],
  }
  // Sábado 2026-09-19 a las 23:00 y domingo 2026-09-20 a la 01:00.
  assert.equal(abiertoEl(nocturno, '2026-09-19', '23:00'), true)
  assert.equal(abiertoEl(nocturno, '2026-09-20', '01:00'), true)
  assert.equal(abiertoEl(nocturno, '2026-09-20', '05:00'), false)
})

test('sin hora de cierre, Places quiere decir 24 horas', () => {
  const siempre = { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] }
  assert.equal(abiertoEl(siempre, '2026-09-13', '04:00'), true)
})

test('el horario del día se lee de la lista de Places, que empieza en lunes', () => {
  const h = {
    weekdayDescriptions: [
      'lunes: 9:00–20:00', 'martes: 9:00–20:00', 'miércoles: 9:00–20:00',
      'jueves: 9:00–20:00', 'viernes: 9:00–20:00', 'sábado: 10:00–14:00', 'domingo: Cerrado',
    ],
  }
  assert.equal(horarioDelDia(h, '2026-09-13'), 'domingo: Cerrado')
  assert.equal(horarioDelDia(h, '2026-09-14'), 'lunes: 9:00–20:00')
  assert.equal(horarioDelDia(null, '2026-09-14'), '')
})

test('pero un 4,9 con 5.000 reseñas sí gana: el castigo es por no saber, no por ser bueno', () => {
  const lugares = [
    { name: 'Bueno de verdad', rating: 4.9, userRatingCount: 5000 },
    { name: 'De toda la vida', rating: 4.5, userRatingCount: 3000 },
  ]
  assert.deepEqual(ordenarPorNota(lugares).map((l) => l.name), ['Bueno de verdad', 'De toda la vida'])
})
