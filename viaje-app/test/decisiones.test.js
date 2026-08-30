import { test } from 'node:test'
import assert from 'node:assert/strict'

import { TRAVELERS } from '../src/data/travelers.js'
import { GROUPS } from '../src/data/trip-madrid-2026.js'
import {
  electorado, recuento, sePuedeCerrar, puedeCerrar, puedeVotar,
  puedeTransicionar, ordenar,
} from '../src/domain/decisions.js'

const decisionTodos = { id: 'x', urgency: 'alta' }
const decisionF1 = { id: 'y', urgency: 'media', travelerIds: GROUPS.f1.travelerIds }

const votosDe = (pares) => Object.fromEntries(pares)

test('los ninos no votan nunca, ni por rol ni por edad', () => {
  const felipe = TRAVELERS.find((t) => t.id === 'juan-felipe')
  const guillermo = TRAVELERS.find((t) => t.id === 'juan-guillermo')
  assert.equal(puedeVotar(felipe), false)
  assert.equal(puedeVotar(guillermo), false)
  // Julian David tiene 18: adulto legal, si vota.
  assert.equal(puedeVotar(TRAVELERS.find((t) => t.id === 'julian-david')), true)
})

test('el electorado de una decision de todos son los 7 adultos', () => {
  assert.equal(electorado(decisionTodos, TRAVELERS).length, 7)
})

test('el electorado de una decision del grupo F1 son 3, no 7', () => {
  const e = electorado(decisionF1, TRAVELERS)
  assert.equal(e.length, 3)
  assert.deepEqual(e.map((t) => t.id).sort(), ['camilo', 'fernando', 'juliana-bueno'])
})

test('los que no participan no bloquean: la votacion del F1 se cierra con 3 votos', () => {
  const votos = votosDe([['camilo', 'si'], ['juliana-bueno', 'si'], ['fernando', 'si']])
  const r = recuento(decisionF1, TRAVELERS, votos)
  assert.equal(r.total, 3)
  assert.equal(r.completa, true)
  assert.equal(sePuedeCerrar(decisionF1, TRAVELERS, votos).puede, true)
})

test('un voto de un nino se ignora aunque llegue', () => {
  // No deberia poder ocurrir (las reglas de Firestore lo impiden), pero si
  // ocurre no puede alterar el resultado.
  const votos = votosDe([
    ['camilo', 'si'], ['juliana-bueno', 'si'], ['fernando', 'no'],
    ['juan-guillermo', 'si'],
  ])
  const r = recuento(decisionF1, TRAVELERS, votos)
  assert.equal(r.emitidos, 3, 'solo cuentan los tres del electorado')
  assert.equal(r.aFavor, 2)
})

test('un empate no cierra: es una conversacion, no una decision', () => {
  const votos = votosDe([['camilo', 'si'], ['juliana-bueno', 'no'], ['fernando', 'igual']])
  const r = recuento(decisionF1, TRAVELERS, votos)
  assert.equal(r.completa, true)
  assert.equal(r.aFavor, 1)
  assert.equal(r.enContra, 1)
  const cierre = sePuedeCerrar(decisionF1, TRAVELERS, votos)
  assert.equal(cierre.puede, false)
  assert.match(cierre.motivo, /Empate/)
})

test('"me da igual" no bloquea, pero tampoco arrastra', () => {
  const votos = votosDe([['camilo', 'si'], ['juliana-bueno', 'igual'], ['fernando', 'igual']])
  const cierre = sePuedeCerrar(decisionF1, TRAVELERS, votos)
  assert.equal(cierre.puede, true, 'un si contra cero noes cierra')
})

test('no se cierra mientras falte alguien por votar', () => {
  const votos = votosDe([['camilo', 'si'], ['juliana-bueno', 'si']])
  const cierre = sePuedeCerrar(decisionF1, TRAVELERS, votos)
  assert.equal(cierre.puede, false)
  assert.match(cierre.motivo, /Falta/)
  assert.equal(recuento(decisionF1, TRAVELERS, votos).faltan[0].id, 'fernando')
})

test('solo un owner cierra', () => {
  assert.equal(puedeCerrar(TRAVELERS.find((t) => t.id === 'camilo')), true)
  assert.equal(puedeCerrar(TRAVELERS.find((t) => t.id === 'fernando')), false)
})

test('los estados no saltan a cualquier sitio', () => {
  assert.equal(puedeTransicionar('propuesto', 'votando'), true)
  assert.equal(puedeTransicionar('decidido', 'reservado'), true)
  assert.equal(puedeTransicionar('propuesto', 'pagado'), false, 'no se paga lo que no se ha reservado')
  assert.equal(puedeTransicionar('pagado', 'propuesto'), false, 'lo pagado no vuelve atras')
})

test('el orden pone lo urgente y lo que bloquea a mas gente arriba', () => {
  const lista = [
    { id: 'a', urgency: 'baja' },
    { id: 'b', urgency: 'alta', blocks: ['x'] },
    { id: 'c', urgency: 'alta', blocks: ['x', 'y'] },
    { id: 'd', urgency: 'media' },
  ]
  assert.deepEqual(ordenar(lista, TRAVELERS).map((d) => d.id), ['c', 'b', 'd', 'a'])
})
