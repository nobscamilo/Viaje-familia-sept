/**
 * Lógica de decisiones. Todo puro: sin React, sin Firestore, sin fechas del
 * sistema. Es lo que se puede probar de verdad y lo que no puede equivocarse.
 *
 * Dos ideas gobiernan este archivo:
 *
 *  1. El denominador de una votación son los ADULTOS QUE PARTICIPAN en esa
 *     decisión, no todos los miembros del viaje. Si el plan es del grupo de
 *     F1, los otros seis no bloquean nada.
 *  2. Los niños NUNCA cuentan. Ni en el numerador ni en el denominador. Son
 *     viajeros: ocupan cama, silla y presupuesto, pero no opinan en la app.
 */

import { ROLES, byId } from '../data/travelers.js'

export const ESTADOS = ['propuesto', 'votando', 'decidido', 'reservado', 'pagado', 'descartado']

export const ESTADO_LABEL = {
  propuesto: 'Propuesto',
  votando: 'En votación',
  decidido: 'Decidido',
  reservado: 'Reservado',
  pagado: 'Pagado',
  descartado: 'Descartado',
}

/** Transiciones permitidas. Un estado no puede saltar a cualquier otro. */
const SIGUIENTES = {
  propuesto: ['votando', 'decidido', 'descartado'],
  votando: ['decidido', 'descartado'],
  decidido: ['reservado', 'descartado'],
  reservado: ['pagado', 'descartado'],
  pagado: [],
  descartado: ['propuesto'],
}

export function puedeTransicionar(desde, hasta) {
  return (SIGUIENTES[desde] ?? []).includes(hasta)
}

export const VOTOS = ['si', 'no', 'igual']

/** Un viajero vota si es adulto con cuenta. La edad manda sobre el rol. */
export function puedeVotar(traveler) {
  if (!traveler) return false
  if (traveler.age < 18) return false
  if (traveler.role === ROLES.CHILD) return false
  return traveler.role === ROLES.OWNER || traveler.role === ROLES.ADULT
}

/**
 * Quiénes deciden ESTA decisión: los participantes que además pueden votar.
 * Sin participantes declarados, decide todo el que puede votar.
 */
export function electorado(decision, travelers) {
  const ids = decision?.travelerIds
  const universo = Array.isArray(ids) && ids.length
    ? ids.map((id) => byId(id) ?? travelers.find((t) => t.id === id)).filter(Boolean)
    : travelers
  return universo.filter(puedeVotar)
}

/**
 * Recuento. `votos` es un objeto { travelerId: 'si' | 'no' | 'igual' }.
 * Los votos de quien no está en el electorado se ignoran en silencio: puede
 * pasar si alguien sale de un subgrupo después de haber votado.
 */
export function recuento(decision, travelers, votos = {}) {
  const electores = electorado(decision, travelers)
  const validos = electores
    .map((t) => ({ traveler: t, voto: votos[t.id] }))
    .filter((v) => VOTOS.includes(v.voto))

  const cuenta = { si: 0, no: 0, igual: 0 }
  for (const v of validos) cuenta[v.voto] += 1

  const total = electores.length
  const emitidos = validos.length
  const faltan = electores.filter((t) => !VOTOS.includes(votos[t.id]))

  return {
    total,
    emitidos,
    ...cuenta,
    faltan,
    completa: total > 0 && emitidos === total,
    // "Igual" no bloquea: quien dice que le da lo mismo delega en el resto.
    aFavor: cuenta.si,
    enContra: cuenta.no,
    apoyo: emitidos === 0 ? 0 : cuenta.si / emitidos,
  }
}

/**
 * ¿Se puede cerrar? Solo cuando ha votado todo el electorado y hay más síes
 * que noes. Empate no cierra: en una familia, un empate es una conversación,
 * no una decisión.
 */
export function sePuedeCerrar(decision, travelers, votos = {}) {
  const r = recuento(decision, travelers, votos)
  if (!r.completa) return { puede: false, motivo: `Faltan ${r.faltan.length} por votar` }
  if (r.aFavor === r.enContra) return { puede: false, motivo: 'Empate: hay que hablarlo' }
  if (r.aFavor < r.enContra) return { puede: false, motivo: 'Gana el no' }
  return { puede: true, motivo: null }
}

/** Solo un owner cierra, reserva o marca pagado. */
export function puedeCerrar(traveler) {
  return traveler?.role === ROLES.OWNER
}

const PESO_URGENCIA = { alta: 0, media: 1, baja: 2 }

/**
 * Orden de la pantalla: primero lo urgente, y dentro de lo urgente lo que
 * bloquea a más gente. Nunca por fecha de creación: a nadie le importa
 * cuándo se escribió una decisión, sino a quién está frenando.
 */
export function ordenar(decisiones, travelers) {
  return [...decisiones].sort((a, b) => {
    const u = (PESO_URGENCIA[a.urgency] ?? 3) - (PESO_URGENCIA[b.urgency] ?? 3)
    if (u !== 0) return u
    const bloqueo = (b.blocks?.length ?? 0) - (a.blocks?.length ?? 0)
    if (bloqueo !== 0) return bloqueo
    return electorado(b, travelers).length - electorado(a, travelers).length
  })
}

// ------------------------------------------------------- varias opciones

/**
 * Hay decisiones que no son un si o un no, sino un «cual de estas».
 *
 * «Donde comemos el domingo» con tres restaurantes delante no se resuelve
 * votando «si»: se resuelve escogiendo. Cuando una decision trae `options`,
 * el voto deja de ser 'si' | 'no' | 'igual' y pasa a ser el id de la opcion.
 * El resto del modelo no cambia: sigue habiendo un documento de voto por
 * persona, sigue mandando el electorado y los ninos siguen sin contar.
 */
export function esDeOpciones(decision) {
  return Array.isArray(decision?.options) && decision.options.length >= 2
}

/**
 * Recuento por opcion.
 *
 * Un voto a una opcion que ya no existe se ignora en silencio, igual que un
 * voto de quien salio del grupo: puede pasar si alguien edita las opciones
 * despues de que se haya votado.
 */
export function recuentoOpciones(decision, travelers, votos = {}) {
  const electores = electorado(decision, travelers)
  const opciones = decision.options ?? []
  const validos = new Set(opciones.map((o) => o.id))

  const cuenta = new Map(opciones.map((o) => [o.id, []]))
  for (const t of electores) {
    const v = votos[t.id]
    if (validos.has(v)) cuenta.get(v).push(t)
  }

  const conVotos = opciones.map((o) => ({ ...o, votantes: cuenta.get(o.id), votos: cuenta.get(o.id).length }))
  const emitidos = conVotos.reduce((n, o) => n + o.votos, 0)
  const faltan = electores.filter((t) => !validos.has(votos[t.id]))
  const mas = Math.max(0, ...conVotos.map((o) => o.votos))
  const lideres = mas === 0 ? [] : conVotos.filter((o) => o.votos === mas)

  return {
    total: electores.length,
    emitidos,
    opciones: conVotos,
    faltan,
    completa: electores.length > 0 && emitidos === electores.length,
    // Con empate NO hay ganadora. Una familia empatada tiene una
    // conversacion pendiente, no un resultado.
    ganadora: lideres.length === 1 ? lideres[0] : null,
    empate: lideres.length > 1 ? lideres : null,
  }
}

/** ¿Se puede cerrar una decision de opciones? Igual de estricto: todos y sin empate. */
export function sePuedeCerrarOpciones(decision, travelers, votos = {}) {
  const r = recuentoOpciones(decision, travelers, votos)
  if (r.total === 0) return { puede: false, motivo: 'Nadie tiene que votar esto' }
  if (!r.completa) return { puede: false, motivo: `Faltan ${r.faltan.length} por votar` }
  if (r.empate) return { puede: false, motivo: 'Empate: hay que hablarlo' }
  return { puede: true, motivo: null, ganadora: r.ganadora }
}
