/**
 * Lo que YA está pagado, con quién lo pagó y a quién se le cobra.
 *
 * Verificado el 28 de agosto de 2026 contra los correos de las reservas, no
 * contra la memoria de nadie. Cada línea dice de dónde sale el dato.
 *
 * QUIÉN PAGÓ ≠ QUIÉN RESERVÓ. Camilo hizo casi todas las reservas, pero con
 * el número de tarjeta de su padre: el dinero salió de la cuenta del padre y
 * por eso `pagadoPor` es él. Confundir las dos cosas dejaría a Camilo con un
 * saldo a favor de casi 5.000 € que no ha puesto.
 *
 * Lo que NO está aquí, y es a propósito:
 *
 *  · **Las entradas de la F1.** «ya están los tiquetes comprados y pagados,
 *    no lo sumes.» Fuera de las cuentas.
 *  · **Los vuelos de Bogotá (AV182 y AV027).** Son de los papás y de la
 *    familia de la hermana; Camilo no va en ellos. No están sus confirmaciones
 *    en el correo, así que no se sabe el importe: inventarlo sería peor que
 *    no ponerlo. Se añaden a mano cuando alguien mire su reserva, con
 *    `participantes` = solo quienes vuelan.
 *  · **El tour del Bernabéu, la casa de Guardo y el coche de alquiler.**
 *    Todavía no hay importe cerrado.
 *  · **El depósito de 300 € de Barcelona.** Se deja con tarjeta de crédito a
 *    la llegada y lo devuelven a los 14 días: no es un gasto, es una retención.
 *    (El impuesto municipal SÍ está: se pagó el 28 de agosto, dentro de los
 *    160,30 € del check-in — 146,30 de impuesto y 14,00 de seguro.)
 *
 * `fecha` es CUÁNDO CORRESPONDE el gasto (la noche, el vuelo), no cuándo se
 * cobró la tarjeta. Para un viaje es lo útil: ordena la lista como pasan las
 * cosas. `pagadoEl` solo aparece donde el correo lo dice con certeza.
 */
export const GASTOS_INICIALES = [
  {
    id: 'g-vuelo-bio-mad',
    concepto: 'Iberia IB0430 · Bilbao → Madrid',
    importeCent: 13506,
    pagadoPor: 'juliana-bueno',
    // Solo lo cogen ellos dos: a los demás no se les pide nada.
    participantes: ['camilo', 'juliana-bueno'],
    fecha: '2026-09-10',
    categoria: 'transporte',
    ref: 'vuelo-bio-mad',
    nota: 'PH6PQ. Apple Pay a nombre de Juliana Andrea Bueno. 2 adultos: 56,00 de tarifa + 11,53 de tasas.',
  },
  {
    id: 'g-aloj-madrid',
    concepto: 'Tríplex Lujo 5 Dorm · Sol',
    importeCent: 305874,
    pagadoPor: 'julian-padre',
    participantes: 'all',
    fecha: '2026-09-10',
    categoria: 'alojamiento',
    ref: 'aloj-madrid',
    nota: 'Booking. La reservó Camilo con la tarjeta de su padre.',
  },
  {
    id: 'g-traslado-mad-bcn',
    concepto: 'OUIGO 06541 · Atocha → Barcelona Sants',
    importeCent: 24500,
    pagadoPor: 'julian-padre',
    participantes: 'all',
    fecha: '2026-09-14',
    categoria: 'transporte',
    ref: 'traslado-mad-bcn',
    nota: 'Reservado el 18 de mayo. Lo reservó Camilo con la tarjeta de su padre.',
  },
  {
    id: 'g-aloj-barcelona',
    concepto: 'Sweett · Carrer Sepúlveda',
    importeCent: 75668,
    pagadoPor: 'julian-padre',
    participantes: 'all',
    fecha: '2026-09-14',
    categoria: 'alojamiento',
    ref: 'aloj-barcelona',
    nota: 'Booking 5789138276. La reservó Camilo con la tarjeta de su padre.',
  },
  {
    id: 'g-checkin-barcelona',
    concepto: 'Barcelona · impuesto municipal y seguro',
    importeCent: 16030,
    pagadoPor: 'camilo',
    participantes: 'all',
    fecha: '2026-09-14',
    pagadoEl: '2026-08-28',
    categoria: 'alojamiento',
    ref: 'aloj-barcelona',
    nota: 'Recibo Sweett #1301973: impuesto municipal 146,30 € + 14,00 € de seguro de accidentes.',
  },
  {
    id: 'g-vuelo-bcn-ory',
    concepto: 'Vueling VY8002 · Barcelona → París Orly',
    importeCent: 43191,
    pagadoPor: 'julian-padre',
    participantes: 'all',
    fecha: '2026-09-16',
    pagadoEl: '2026-05-18',
    categoria: 'transporte',
    ref: 'vuelo-bcn-ory',
    nota: 'MLD57T. Mastercard a nombre de Guillermo Julián Sarmiento. 7 adultos 335,93 + 2 niños 95,98.',
  },
  {
    id: 'g-maletas-bcn-ory',
    concepto: 'Las nueve maletas de cabina · VY8002',
    importeCent: 40500,
    pagadoPor: 'camilo',
    participantes: 'all',
    fecha: '2026-09-16',
    pagadoEl: '2026-08-28',
    categoria: 'transporte',
    ref: 'vuelo-bcn-ory',
    nota: 'MLD57T, segundo pago, por PayPal. Nueve piezas de compartimento superior.',
  },
  {
    id: 'g-aloj-paris',
    concepto: 'ibis budget Saint-Maurice',
    importeCent: 83631,
    pagadoPor: 'julian-padre',
    participantes: 'all',
    fecha: '2026-09-16',
    categoria: 'alojamiento',
    ref: 'aloj-paris',
    nota: 'Booking. La reservó Camilo con la tarjeta de su padre.',
  },
  {
    id: 'g-vuelo-ory-bio',
    concepto: 'Vueling VY1463 · París Orly → Bilbao',
    importeCent: 45644,
    pagadoPor: 'julian-padre',
    participantes: 'all',
    fecha: '2026-09-19',
    pagadoEl: '2026-05-18',
    categoria: 'transporte',
    ref: 'vuelo-ory-bio',
    nota: 'SNF23N, primer pago. Mastercard a nombre de Guillermo Julián Sarmiento. 7 adultos 323,40 + 2 niños 92,40 + seguros 40,64.',
  },
  {
    id: 'g-maletas-ory-bio',
    concepto: 'Las nueve maletas de cabina · VY1463',
    importeCent: 22500,
    pagadoPor: 'camilo',
    participantes: 'all',
    fecha: '2026-09-19',
    pagadoEl: '2026-08-15',
    categoria: 'transporte',
    ref: 'vuelo-ory-bio',
    nota: 'SNF23N, segundo pago. Visa a nombre de Juan Camilo Sarmiento. Nueve piezas de compartimento superior.',
  },
]
