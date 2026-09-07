import test from 'node:test'
import assert from 'node:assert/strict'
import { aHora, aMinutos, choques, distanciaMetros, distanciaRuta, duracionTotal, encadenar, ordenarPorProximidad } from '../functions/lib/itinerario.js'

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

test('distanciaMetros calcula con Haversine y tolera datos inválidos', () => {
  // Sol a Gran Vía en Madrid (~370 m)
  const sol = { lat: 40.4168, lng: -3.7038 }
  const granVia = { lat: 40.4200, lng: -3.7050 }
  const d = distanciaMetros(sol, granVia)
  assert.ok(d > 350 && d < 400, `esperaba ~370m pero obtuve ${d}`)

  assert.equal(distanciaMetros(null, granVia), Infinity)
  assert.equal(distanciaMetros(sol, {}), Infinity)
  assert.equal(distanciaMetros({ lat: 'x' }, granVia), Infinity)
})

test('distanciaRuta acumula los tramos correctamente', () => {
  const sol = { coords: { lat: 40.4168, lng: -3.7038 } }
  const granVia = { coords: { lat: 40.4200, lng: -3.7050 } }
  const plazaMayor = { coords: { lat: 40.4154, lng: -3.7074 } }

  assert.equal(distanciaRuta([]), 0)
  assert.equal(distanciaRuta([sol]), 0)

  const dTotal = distanciaRuta([sol, granVia, plazaMayor])
  const tramo1 = distanciaMetros(sol.coords, granVia.coords)
  const tramo2 = distanciaMetros(granVia.coords, plazaMayor.coords)
  assert.ok(Math.abs(dTotal - (tramo1 + tramo2)) < 1e-5)
})

test('ordenarPorProximidad conserva un orden lógico que ya es óptimo', () => {
  // Sol -> Gran Vía -> Plaza Mayor -> Palacio Real
  const rutaLogica = [
    { titulo: 'Puerta del Sol', coords: { lat: 40.4168, lng: -3.7038 } },
    { titulo: 'Gran Vía', coords: { lat: 40.4200, lng: -3.7050 } },
    { titulo: 'Plaza Mayor', coords: { lat: 40.4154, lng: -3.7074 } },
    { titulo: 'Palacio Real', coords: { lat: 40.4180, lng: -3.7143 } },
  ]

  const { paradas, seReordeno } = ordenarPorProximidad(rutaLogica, { fijarInicio: true })
  assert.equal(seReordeno, false, 'no debía alterar una ruta ya óptima')
  assert.deepEqual(paradas.map((p) => p.titulo), [
    'Puerta del Sol',
    'Gran Vía',
    'Plaza Mayor',
    'Palacio Real',
  ])
})

test('ordenarPorProximidad desenreda un zigzag caótico en Madrid', () => {
  // Caso real mencionado por el usuario:
  // Palacio Real -> Gran Vía -> Plaza Mayor -> Sol -> Parque del Retiro
  // (cruza oeste a norte, vuelve al sur, luego centro este, luego extremo este)
  const zigzag = [
    { titulo: 'Palacio Real', coords: { lat: 40.4180, lng: -3.7143 } },
    { titulo: 'Gran Vía', coords: { lat: 40.4200, lng: -3.7050 } },
    { titulo: 'Plaza Mayor', coords: { lat: 40.4154, lng: -3.7074 } },
    { titulo: 'Puerta del Sol', coords: { lat: 40.4168, lng: -3.7038 } },
    { titulo: 'Parque del Retiro', coords: { lat: 40.4153, lng: -3.6845 } },
  ]

  const dAntes = distanciaRuta(zigzag)
  const { paradas, seReordeno } = ordenarPorProximidad(zigzag, { fijarInicio: true })
  const dDespues = distanciaRuta(paradas)

  assert.equal(seReordeno, true, 'debía detectar el zigzag y reordenar')
  assert.ok(dDespues < dAntes, `la distancia óptima (${dDespues}) debe ser menor que la del zigzag (${dAntes})`)
  // El inicio se mantiene en Palacio Real y la secuencia fluye naturalmente hacia el este
  assert.equal(paradas[0].titulo, 'Palacio Real')
  assert.equal(paradas[1].titulo, 'Plaza Mayor')
  assert.equal(paradas[2].titulo, 'Puerta del Sol')
  assert.equal(paradas[3].titulo, 'Gran Vía')
  assert.equal(paradas[4].titulo, 'Parque del Retiro')
})

test('ordenarPorProximidad no toca listas de menos de 3 paradas o sin coordenadas', () => {
  const dos = [{ titulo: 'A', coords: { lat: 40, lng: -3 } }, { titulo: 'B', coords: { lat: 41, lng: -3 } }]
  assert.equal(ordenarPorProximidad(dos).seReordeno, false)

  const rotas = [{ titulo: 'A' }, { titulo: 'B', coords: {} }, { titulo: 'C' }]
  assert.equal(ordenarPorProximidad(rotas).seReordeno, false)
})

