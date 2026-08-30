/**
 * Los nueve viajeros, verificados el 2026-08-25.
 * Cuadran con la reserva de Booking en Madrid: "7 adultos, 2 ninos (4 y 9 anos)".
 *
 * La distincion que define este modelo:
 *   - TODOS son viajeros: ocupan cama, asiento, entrada y presupuesto.
 *   - Solo los adultos son MIEMBROS: inician sesion y votan.
 *   - Los ninos NUNCA entran en el denominador de una votacion.
 *
 * En la app vieja las edades vivian dentro de un prompt ("ninos de 5 y 9 anos")
 * y estaban mal: son 4 y 9. Por eso ahora son datos.
 */

export const ROLES = {
  OWNER: 'owner',   // decide, cierra votaciones, invita, marca reservado
  ADULT: 'adult',   // propone, comenta, vota
  VIEWER: 'viewer', // ve y comenta, no vota
  CHILD: 'child',   // viajero sin cuenta
}

/**
 * El `color` no es decoracion: es como se sabe quien va sin leer.
 *
 * Nueve personas con iniciales grises son nueve manchas iguales — «J C J F JD»
 * no le dice nada a nadie. Con color, la familia aprende en dos dias que el
 * verde es el abuelo y el rosa es Juliana, y la pregunta que mas se repite en
 * un viaje de nueve («¿quien va a esto?») se responde de un vistazo.
 *
 * Nueve tonos separados en el circulo cromatico, todos claros: van sobre fondo
 * oscuro con texto oscuro encima.
 */
export const TRAVELERS = [
  {
    id: 'camilo',
    color: '#a78bfa',
    name: 'Juan Camilo Sarmiento Castillo',
    short: 'Camilo',
    age: 37,
    role: ROLES.OWNER,
    relation: null,
  },
  {
    id: 'juliana-bueno',
    color: '#f472b6',
    name: 'Juliana Andrea Bueno Díaz',
    short: 'Juliana Bueno',
    age: 32,
    role: ROLES.ADULT,
    relation: 'pareja de Camilo',
  },
  {
    id: 'julian-padre',
    color: '#34d399',
    name: 'Julián Sarmiento',
    short: 'Julián',
    age: 65,
    role: ROLES.ADULT,
    relation: 'papá de Camilo',
  },
  {
    id: 'cielo',
    color: '#fbbf24',
    name: 'Cielo Castillo',
    short: 'Cielo',
    age: 63,
    role: ROLES.ADULT,
    relation: 'mamá de Camilo',
  },
  {
    id: 'juliana-hermana',
    color: '#38bdf8',
    name: 'Juliana Sarmiento',
    short: 'Juliana',
    age: 44,
    role: ROLES.ADULT,
    relation: 'hermana de Camilo',
    guardianOf: ['juan-felipe', 'juan-guillermo'],
  },
  {
    id: 'fernando',
    color: '#fb923c',
    name: 'Fernando Muñoz',
    short: 'Fernando',
    age: 42,
    role: ROLES.ADULT,
    relation: 'cuñado',
    guardianOf: ['juan-felipe', 'juan-guillermo'],
  },
  {
    id: 'julian-david',
    color: '#22d3ee',
    name: 'Julián David Salazar',
    short: 'Julián David',
    age: 18,
    role: ROLES.ADULT, // 18: adulto legal, cuenta como votante y como adulto en reservas
    relation: 'sobrino',
  },
  {
    id: 'juan-felipe',
    color: '#a3e635',
    name: 'Juan Felipe Muñoz Sarmiento',
    short: 'Juan Felipe',
    age: 9,
    role: ROLES.CHILD,
    relation: 'sobrino',
  },
  {
    id: 'juan-guillermo',
    color: '#f87171',
    name: 'Juan Guillermo Muñoz Sarmiento',
    short: 'Juan Guillermo',
    age: 4,
    role: ROLES.CHILD,
    relation: 'sobrino',
  },
]

/** Los que pueden iniciar sesion y votar. */
export const VOTING_ROLES = new Set([ROLES.OWNER, ROLES.ADULT])

export const isVoter = (traveler) => VOTING_ROLES.has(traveler.role)
export const isChild = (traveler) => traveler.role === ROLES.CHILD

export const byId = (id) => TRAVELERS.find((t) => t.id === id) ?? null

/**
 * Composicion del grupo, tal como se le pasa al copiloto en cada llamada.
 * Sustituye a las edades escritas a mano dentro de los prompts.
 */
export function groupComposition(travelers = TRAVELERS) {
  const adults = travelers.filter((t) => t.age >= 18)
  const children = travelers.filter((t) => t.age < 18)
  return {
    total: travelers.length,
    adults: adults.length,
    children: children.map((c) => ({ name: c.short, age: c.age })),
    youngestAge: Math.min(...travelers.map((t) => t.age)),
    oldestAge: Math.max(...travelers.map((t) => t.age)),
  }
}

/** Frase corta para el prompt del sistema. Sin adornos: datos. */
export function compositionSentence(travelers = TRAVELERS) {
  const g = groupComposition(travelers)
  const kids = g.children.map((c) => `${c.name} (${c.age})`).join(' y ')
  return `${g.total} viajeros: ${g.adults} adultos de ${18}–${g.oldestAge} años` +
    (g.children.length ? `, y ${g.children.length} niños: ${kids}.` : '.')
}
