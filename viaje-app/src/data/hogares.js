/**
 * Las subfamilias que reparten el dinero.
 *
 * El viaje son nueve personas pero tres bolsillos. Cada gasto se divide entre
 * los ADULTOS que participan, y la deuda se salda entre HOGARES: si Camilo
 * paga una comida de todos, cubre 2/7; sus padres deben 2/7 y la familia de
 * su hermana, 3/7.
 *
 * QUIÉN VA EN CADA CASA NO ES QUIÉN VIVE CON QUIÉN, sino de qué bolsillo
 * sale el dinero. El 30 de agosto de 2026 el abuelo dijo que cubre los gastos
 * de Julián David, así que su nieto pasó a su hogar: su parte de cada cuenta
 * se la cargan los abuelos, y la casa de la hermana pasó de tres adultos a
 * dos. Sobre lo ya reservado eso movió 939,34 € de una casa a la otra.
 *
 * Si alguna vez fuera al revés —que Julián David pagara algo de su bolsillo—
 * ese dinero contaría como puesto por los abuelos. Se aceptó a sabiendas: la
 * alternativa era un campo «cubierto por» y un concepto más en el modelo.
 *
 * Los dos niños NO están aquí, y no es un olvido.
 *
 *   «los 2 niños no entrarían, entre todos podemos asumir los gastos de ellos»
 *
 * Es decir: comen, ocupan cama y pagan entrada, pero su parte se reparte
 * entre los siete adultos, no se le carga a sus padres. Meterlos en el hogar
 * de su madre cambiaría el reparto: la familia de la hermana pasaría de
 * deber 3/7 a deber 5/9 de cada cuenta. Por eso el archivo de hogares cubre
 * SIETE personas y no nueve, y hay una prueba que lo vigila.
 */
export const HOGARES = [
  {
    id: 'camilo',
    nombre: 'Camilo y Juliana',
    short: 'Camilo y Juliana',
    color: '#a78bfa',
    miembros: ['camilo', 'juliana-bueno'],
  },
  {
    id: 'padres',
    nombre: 'Julián, Cielo y Julián David',
    // El corto sigue siendo la pareja: es lo que identifica la casa en una
    // columna estrecha, y cabe. Quién más va dentro está en `nombre`.
    short: 'Julián y Cielo',
    color: '#34d399',
    // Julián David está aquí desde el 30 de agosto de 2026: su abuelo cubre
    // sus gastos. No es un error de tecleo — es su nieto, no su hijo.
    miembros: ['julian-padre', 'cielo', 'julian-david'],
  },
  {
    id: 'hermana',
    nombre: 'Juliana y Fernando',
    short: 'Juliana y Fernando',
    color: '#fb923c',
    miembros: ['juliana-hermana', 'fernando'],
  },
]

/**
 * Cómo se llama un hogar PARA QUIEN ESTÁ MIRANDO.
 *
 * Los nombres cortos eran «Nosotros», «Papás» y «Hermana»: escritos desde la
 * silla de Camilo, en una app que miran nueve personas. Fernando entraba con
 * su código y leía «Papás» para sus suegros, «Hermana» para su propia casa y
 * «Nosotros» para la de su cuñado. Las tres mal.
 *
 * Ahora los nombres son de personas —valen igual para cualquiera— y lo único
 * que se persoNaliza es el tuyo, que pasa a ser «Vosotros». Encaja con el
 * resto de la pantalla, que ya te habla de tú: «Debéis 1.088,39 €».
 */
export function etiquetaHogar(hogarId, miHogarId = null) {
  if (hogarId && hogarId === miHogarId) return 'Vosotros'
  return HOGARES.find((h) => h.id === hogarId)?.short ?? hogarId
}

/** De qué hogar es un viajero. Los niños no son de ninguno: devuelve null. */
export function hogarDe(travelerId) {
  return HOGARES.find((h) => h.miembros.includes(travelerId)) ?? null
}

export const CATEGORIAS = [
  { id: 'alojamiento', label: 'Alojamiento' },
  { id: 'transporte', label: 'Transporte' },
  { id: 'comida', label: 'Comida' },
  { id: 'entradas', label: 'Entradas' },
  { id: 'otros', label: 'Otros' },
]
