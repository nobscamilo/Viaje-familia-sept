import test from 'node:test'
import assert from 'node:assert/strict'
import { aHora, aMinutos, choques, duracionTotal, encadenar } from '../functions/lib/itinerario.js'

test('el reloj encadena parada, estancia y traslado', () => {
  const paradas = [
    { titulo: 'Catedral', tipo: 'activity', minutos: 60 },
    { titulo: 'Comida', tipo: 'food', minutos: 90 },
    { titulo: 'Parque', tipo: 'activity', minutos: 45 },
  ]
  const t = encadenar(paradas, '10:00', [15, 20])
  assert.deepEqual(t.map((x) => [x.llegada, x.salida]), [
    ['10:00', '11:00'],   // 60 min
    ['11:15', '12:45'],   // +15 de traslado, 90 min
    ['13:05', '13:50'],   // +20 de traslado, 45 min
  ])
  assert.equal(duracionTotal(t), 230)
})

test('sin minutos se usa lo que dura ese tipo de parada', () => {
  const t = encadenar([{ titulo: 'Museo', tipo: 'activity' }, { titulo: 'Cena', tipo: 'food' }], '16:00', [10])
  assert.equal(t[0].salida, '17:15')   // 75 min de visita
  assert.equal(t[1].salida, '18:55')   // 90 min de comida
})

test('un traslado que no se pudo calcular cuenta cero pero queda marcado', () => {
  // Contarlo como cero es optimista; esconderlo sería mentir. Se ve el hueco.
  const t = encadenar([{ titulo: 'A', minutos: 30 }, { titulo: 'B', minutos: 30 }], '09:00', [null])
  assert.equal(t[1].llegada, '09:30')
  assert.equal(t[0].trasladoMin, null)
})

test('una ruta que se pasa de medianoche lo dice', () => {
  const t = encadenar([{ titulo: 'A', minutos: 60 }, { titulo: 'B', minutos: 300 }], '20:00', [60])
  assert.equal(t[1].seSalePorArriba, true)
})

test('la hora de inicio mal escrita no rompe nada: se empieza a las diez', () => {
  const t = encadenar([{ titulo: 'A', minutos: 30 }, { titulo: 'B', minutos: 30 }], 'por la mañana', [0])
  assert.equal(t[0].llegada, '10:00')
})

test('avisa de lo que pisa algo ya reservado', () => {
  const t = encadenar([{ titulo: 'Museo', minutos: 120 }, { titulo: 'Comida', minutos: 90 }], '11:00', [15])
  // El museo va de 11:00 a 13:00 y la comida de 13:15 a 14:45.
  const avisos = choques(t, [{ titulo: 'Vuelo a Bilbao', inicio: '12:30' }])
  assert.equal(avisos.length, 1)
  assert.match(avisos[0], /Museo.*Vuelo a Bilbao/)
})

test('lo que no cae dentro no avisa, y lo que no tiene hora tampoco', () => {
  const t = encadenar([{ titulo: 'Museo', minutos: 120 }], '11:00', [])
  assert.deepEqual(choques(t, [{ titulo: 'Cena', inicio: '21:00' }]), [])
  // Un evento de día suelto no tiene hora: no se le inventa una.
  assert.deepEqual(choques(t, [{ titulo: 'Hotel', inicio: '' }]), [])
})

test('un evento con final solapa aunque empiece antes de la parada', () => {
  const t = encadenar([{ titulo: 'Museo', minutos: 120 }], '11:00', [])
  assert.equal(choques(t, [{ titulo: 'Traslado', inicio: '10:00', fin: '11:30' }]).length, 1)
  assert.equal(choques(t, [{ titulo: 'Traslado', inicio: '09:00', fin: '10:30' }]).length, 0)
})

test('horas de ida y vuelta', () => {
  assert.equal(aMinutos('13:45'), 825)
  assert.equal(aMinutos('25:00'), null)
  assert.equal(aHora(825), '13:45')
  assert.equal(aHora(24 * 60 + 30), '23:59')   // no existe el 24:30
})
