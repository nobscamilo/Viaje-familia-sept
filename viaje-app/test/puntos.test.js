import { test } from 'node:test'
import assert from 'node:assert/strict'

import { TIMELINE } from '../src/data/trip-madrid-2026.js'
import { COORDENADAS } from '../src/data/coordenadas.js'
import { diaPorDefecto, diasConPuntos, encuadre, puntosDelDia, puntosDelViaje } from '../src/domain/puntos.js'

test('toda coordenada apunta a un evento que existe', () => {
  // Si alguien borra un evento y se olvida de coordenadas.js, el mapa pinta
  // un pin que no lleva a ninguna parte. Esto lo caza antes.
  const ids = new Set(TIMELINE.map((e) => e.id))
  for (const id of Object.keys(COORDENADAS)) {
    assert.ok(ids.has(id), `coordenadas.js tiene ${id}, que ya no esta en la agenda`)
  }
})

test('las coordenadas caen donde deben, no en medio del mar', () => {
  // Un geocoding malo devuelve un punto plausible pero equivocado. Estos
  // rangos son burdos a proposito: solo cazan el error grande.
  for (const [id, c] of Object.entries(COORDENADAS)) {
    assert.ok(c.lat > 36 && c.lat < 52, `${id}: latitud ${c.lat} fuera de Europa occidental`)
    assert.ok(c.lng > -10 && c.lng < 6, `${id}: longitud ${c.lng} fuera de Europa occidental`)
  }
})

test('Atocha es Atocha y no la estacion del Arte', () => {
  // Geocodificar «Estacion de Madrid Puerta de Atocha» devolvia Estacion del
  // Arte, a 500 m. Con nueve personas y un tren que cierra puertas cinco
  // minutos antes, 500 m son el tren perdido.
  const atocha = COORDENADAS['traslado-mad-bcn']
  assert.ok(Math.abs(atocha.lat - 40.4065) < 0.004, `latitud ${atocha.lat}`)
  assert.ok(Math.abs(atocha.lng - (-3.6909)) < 0.004, `longitud ${atocha.lng}`)
})

test('el mapa del 11 de septiembre enseña el circuito y el Bernabeu', () => {
  const puntos = puntosDelDia(TIMELINE, '2026-09-11')
  const ids = puntos.map((p) => p.id)
  assert.deepEqual(ids, ['madring-vie', 'bernabeu'], 'en orden de hora')
  assert.equal(puntos[0].numero, 1)
})

test('el dia por defecto es hoy si hoy tiene algo', () => {
  assert.equal(diaPorDefecto(TIMELINE, new Date('2026-09-11T14:00:00+02:00')), '2026-09-11')
  // Antes de salir, el primer dia del viaje. Nadie quiere abrir el mapa en
  // agosto y ver el 23 de septiembre.
  assert.equal(diaPorDefecto(TIMELINE, new Date('2026-08-27T10:00:00+02:00')), '2026-09-10')
  // Si un día no tuviera puntos, salta al siguiente que sí los tenga.
  const sinDia21 = TIMELINE.filter((e) => !String(e.start).startsWith('2026-09-21'))
  assert.equal(diaPorDefecto(sinDia21, new Date('2026-09-21T10:00:00+02:00')), '2026-09-22')
})

test('el encuadre cubre todos los puntos del viaje', () => {
  const e = encuadre(puntosDelViaje(TIMELINE))
  assert.ok(e.sur < e.norte && e.oeste < e.este)
  assert.ok(e.norte > 48, 'Paris esta arriba del todo')
  assert.ok(e.sur < 41, 'Barcelona y Madrid abajo')
  assert.equal(e.unico, false)
})

test('un solo punto se marca como unico, para no hacer zoom infinito', () => {
  assert.equal(encuadre([{ lat: 40, lng: -3 }]).unico, true)
  assert.equal(encuadre([]), null)
})

test('todos los dias con algo que pintar salen en el selector', () => {
  const dias = diasConPuntos(TIMELINE)
  assert.ok(dias.includes('2026-09-10'))
  assert.ok(dias.includes('2026-09-23'), 'el ultimo dia tambien')
  assert.deepEqual(dias, [...dias].sort(), 'en orden')
})

test('un plan del copiloto sale en el mapa con SUS coordenadas', () => {
  // El copiloto guarda lat/lng en el propio evento (la Cloud Function las
  // resuelve contra Places). Sin esto, un plan agregado salia en la agenda y
  // no en el mapa: la incoherencia que la familia nota primero.
  const inventado = {
    id: 'plan-copiloto-1',
    title: 'Comida en Rosi La Loca',
    kind: 'food',
    status: 'propuesto',
    start: '2026-09-11T14:00:00+02:00',
    address: 'C. de Cádiz 4, Madrid',
    coords: { lat: 40.4155, lng: -3.7036 },
    createdByCopiloto: true,
  }
  const puntos = puntosDelDia([...TIMELINE, inventado], '2026-09-11')
  const suyo = puntos.find((p) => p.id === 'plan-copiloto-1')
  assert.ok(suyo, 'el plan del copiloto esta en el mapa')
  assert.equal(suyo.lat, 40.4155)
  assert.equal(suyo.delCopiloto, true)
  assert.equal(suyo.status, 'propuesto', 'y se ve que aun no esta cerrado')
})

test('unas coordenadas rotas no pintan un pin en medio de la nada', () => {
  // Si algun dia el sitio no se resuelve y queda a medias, mejor sin pin que
  // con un pin en el golfo de Guinea.
  const roto = {
    id: 'plan-roto', title: 'Algo', kind: 'activity',
    start: '2026-09-11T18:00:00+02:00', coords: { lat: null, lng: undefined },
  }
  const puntos = puntosDelDia([...TIMELINE, roto], '2026-09-11')
  assert.equal(puntos.find((p) => p.id === 'plan-roto'), undefined)
})

test('lo que diga el evento manda sobre la tabla precalculada', () => {
  const corregido = { ...TIMELINE.find((e) => e.id === 'bernabeu'), coords: { lat: 41, lng: -3 } }
  const otros = TIMELINE.filter((e) => e.id !== 'bernabeu')
  const p = puntosDelDia([...otros, corregido], '2026-09-11').find((x) => x.id === 'bernabeu')
  assert.equal(p.lat, 41, 'si alguien corrige el sitio, gana su correccion')
})
