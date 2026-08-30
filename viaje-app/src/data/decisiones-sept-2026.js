/**
 * Huecos abiertos del viaje → contenido inicial de la superficie Decisiones.
 *
 * Vive aparte de la linea de tiempo porque `trip-madrid-2026.js` rozaba las
 * 400 lineas y porque son dos cosas distintas: una es lo que esta cerrado,
 * la otra lo que falta por cerrar.
 */
export const OPEN_DECISIONS = [
  {
    id: 'manana-llegada',
    urgency: 'alta',
    groupId: 'todos',
    title: 'Qué hacer el 10 de septiembre entre que aterrizan y las 15:00',
    why: 'Los dos vuelos llegan por la mañana a T4 y el check-in del apartamento es a las 15:00. Son entre 4 y 6 horas con maletas, un niño de 4 y otro de 9. Hay que decidir dónde dejar el equipaje y qué se hace mientras.',
    blocks: ['vuelo-av182', 'aloj-madrid'],
  },
  {
    id: 'conflicto-bernabeu',
    urgency: 'alta',
    groupId: 'todos',
    title: 'El tour del Bernabéu choca con el viernes de F1',
    why: 'El tour es el viernes 11 a las 10:30 y ese día Camilo, Juliana y Fernando están en el circuito. O el tour es para el grupo sin F1, o hay que moverlo de día.',
    blocks: ['bernabeu', 'madring-vie'],
  },
  {
    id: 'plan-sin-f1',
    urgency: 'alta',
    groupId: 'sin-f1',
    title: 'Qué hacen los otros seis los días 11, 12 y 13',
    why: 'Tres días completos en Madrid para dos abuelos, una pareja, un chico de 18 y dos niños, mientras el grupo de F1 está en IFEMA. Hoy no hay nada planeado.',
  },
  {
    id: 'quien-post-madrid',
    urgency: 'media',
    groupId: 'todos',
    title: 'Cómo se llega a Orly de madrugada el 19',
    why: 'El VY1463 sale a las 07:10 y el mostrador cierra a las 06:30. Desde el ibis de Saint-Maurice hay que salir sobre las 05:00 con nueve personas y dos niños. A esa hora el transporte público de París va corto: o se reserva traslado, o se madruga mucho más.',
    blocks: ['vuelo-ory-bio'],
  },
  {
    id: 'dias-20-23',
    urgency: 'alta',
    groupId: 'todos',
    title: 'Reservar la noche del 22 en Madrid',
    why: 'El AV027 sale a las 09:40 de T4 y hay que estar a las 07:40. Desde Guardo son 3 h 35 min: habría que salir a las 03:30 con dos niños de 4 y 9 años. Dormir en Madrid esa noche deja de ser una opción. No hay nada reservado.',
    blocks: ['aloj-madrid-22', 'vuelo-av027'],
  },
  {
    id: 'llegada-av027',
    urgency: 'alta',
    groupId: 'todos',
    title: 'Qué coche se alquila para bajar de Guardo a Madrid',
    why: 'Van dos coches: el de Camilo, aparcado en Bilbao, y uno de alquiler. Nueve personas caben en dos turismos; nueve maletas de catorce días, no. Hay que alquilar siete plazas, o llevar tres coches. Y si se recoge en Bilbao y se devuelve en Madrid, ojo al recargo por devolverlo en otra provincia.',
    blocks: ['traslado-guardo-madrid'],
  },
  {
    id: 'hora-llegada-sol',
    urgency: 'media',
    groupId: 'todos',
    title: 'Avisar al anfitrión la hora de llegada al apartamento',
    why: 'El check-in tardío cuesta 30 € a partir de las 20:00 y 50 € a partir de las 22:00.',
    blocks: ['aloj-madrid'],
  },
  {
    id: 'contrato-alquiler',
    urgency: 'media',
    groupId: 'todos',
    title: 'Firmar y devolver el contrato de alquiler del apartamento',
    why: 'El alojamiento lo exige antes de la llegada.',
    blocks: ['aloj-madrid'],
  },
]

export const CANCELLED = [
  { title: 'Duke 5torres Apartments, Madrid', confirmation: '6293875179', reason: 'Cancelada el 11 ago por tarjeta inválida. Sustituida por el Tríplex de Sol.' },
]

/**
 * Decisiones ya cerradas. No se borran: se cierran.
 *
 * «Decisiones trazables» era uno de los requisitos, y una decision que
 * desaparece de la pantalla no deja rastro de por que se tomo. Estas siguen
 * ahi, bajo el filtro «Cerradas», con lo que se decidio y cuando.
 */
export const DECISIONES_CERRADAS = [
  {
    id: 'checkin-sweett',
    urgency: 'baja',
    groupId: 'todos',
    status: 'decidido',
    title: 'Check-in online de Sweett en Barcelona',
    why: 'Hecho. Camilo lo confirmo el 26 de agosto de 2026.',
    blocks: ['aloj-barcelona'],
  },
  {
    id: 'hora-av182',
    urgency: 'media',
    groupId: 'todos',
    status: 'decidido',
    title: 'Confirmar la hora real de llegada del AV182',
    why: 'Cerrado el 26 de agosto: la reserva dice que aterriza a las 11:10 en T4. Cuatro rastreadores de vuelos daban 09:05 y se equivocaban. Frente a una reserva, un agregador no es una fuente.',
    blocks: ['vuelo-av182'],
  },
  {
    id: 'cabina-bcn-ory',
    urgency: 'alta',
    groupId: 'todos',
    status: 'pagado',
    title: 'Añadir las maletas de cabina al vuelo Barcelona → París',
    why: 'Cerrado el 28 de agosto: las nueve piezas de compartimento superior se añadieron al MLD57T por 405 € (PayPal, las pagó Camilo). Era el euro más caro que quedaba suelto: en puerta habrían sido hasta 675 €. Ojo al número: aquí se había estimado «del orden de 225 €» por analogía con el vuelo de Bilbao, y costó 405 €. Una estimación por parecido no es un precio. Al modificar la reserva hay que rehacer el check-in.',
    blocks: ['vuelo-bcn-ory'],
  },
  {
    id: 'mad-bcn',
    urgency: 'media',
    groupId: 'todos',
    status: 'decidido',
    title: 'Como se va de Madrid a Barcelona el 14 de septiembre',
    why: 'Cerrado el 26 de agosto: OUIGO 06541, localizador J6FGQQ, Atocha 13:42 a Barcelona Sants 16:44, los nueve en el coche 6. Estaba reservado desde el 18 de mayo.',
    blocks: ['traslado-mad-bcn'],
  },
]
