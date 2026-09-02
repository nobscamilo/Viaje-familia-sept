/**
 * Rutas de Firestore, en un solo sitio.
 *
 * Todo cuelga de `trips/{tripId}`. Se acabó el truco `${tripId}__${id}` del
 * proyecto anterior: con subcolecciones reales, las reglas de seguridad se
 * escriben una vez por rama y el scoping deja de ser cosa del cliente.
 *
 * Cada función recibe el handle de Firebase (`fb`) porque el SDK se carga de
 * forma perezosa y no hay un `db` global que importar.
 */

export const tripRef = (fb, tripId) => fb.fs.doc(fb.db, 'trips', tripId)

export const travelersRef = (fb, tripId) => fb.fs.collection(fb.db, 'trips', tripId, 'travelers')
export const timelineRef = (fb, tripId) => fb.fs.collection(fb.db, 'trips', tripId, 'timeline')
export const decisionsRef = (fb, tripId) => fb.fs.collection(fb.db, 'trips', tripId, 'decisions')

export const decisionRef = (fb, tripId, decisionId) =>
  fb.fs.doc(fb.db, 'trips', tripId, 'decisions', decisionId)

/**
 * Los votos ya no viven solo bajo una decision.
 *
 * Un plan que el copiloto deja en la agenda como PROPUESTO tambien se vota:
 * era justo lo que faltaba para que la tarjeta del Camp Nou dejara de ser un
 * cartel. La forma es identica en las dos ramas — un documento por persona,
 * con su uid de id — asi que basta con decir de que rama cuelga.
 */
const RAMAS = ['decisions', 'timeline']

function rama(nombre) {
  if (!RAMAS.includes(nombre)) throw new Error(`Rama de votos desconocida: ${nombre}`)
  return nombre
}

export const votesRef = (fb, tripId, id, de = 'decisions') =>
  fb.fs.collection(fb.db, 'trips', tripId, rama(de), id, 'votes')

/** El id del voto ES el uid. Nadie puede escribir el voto de otro. */
export const voteRef = (fb, tripId, id, uid, de = 'decisions') =>
  fb.fs.doc(fb.db, 'trips', tripId, rama(de), id, 'votes', uid)

export const eventRef = (fb, tripId, eventId) =>
  fb.fs.doc(fb.db, 'trips', tripId, 'timeline', eventId)

/**
 * Los comentarios tampoco cuelgan solo de una decision.
 *
 * Mismo camino que los votos, y por lo mismo: el 1 de septiembre Camilo pidio
 * poder dejar notas en las tarjetas de «Ahora» —«recordar reservar»—, y una
 * nota pegada a un momento de la agenda es exactamente lo que ya era un
 * comentario pegado a una decision. Misma forma, otra rama.
 */
export const commentsRef = (fb, tripId, id, de = 'decisions') =>
  fb.fs.collection(fb.db, 'trips', tripId, rama(de), id, 'comments')

/**
 * El hilo del copiloto, UNO POR PERSONA.
 *
 * No es un chat de grupo: cada uno le pregunta lo suyo y no tiene por qué
 * verlo el resto. Las reglas solo dejan leer y escribir el propio.
 */
export const hiloRef = (fb, tripId, travelerId) =>
  fb.fs.collection(fb.db, 'trips', tripId, 'hilos', travelerId, 'mensajes')

export const userRef = (fb, uid) => fb.fs.doc(fb.db, 'users', uid)

/**
 * Las cuentas. Dos colecciones y no una:
 *   gastos        → lo que se ha pagado, y a quién se le reparte
 *   liquidaciones → las transferencias entre subfamilias para saldar
 *
 * Mezclarlas en una sola con un campo `tipo` obligaría a filtrar en cada
 * suma, y el día que alguien olvide el filtro, una transferencia de 200 €
 * entre hermanos contaría como gasto del viaje y el total mentiría.
 */
export const gastosRef = (fb, tripId) => fb.fs.collection(fb.db, 'trips', tripId, 'gastos')
export const gastoRef = (fb, tripId, id) => fb.fs.doc(fb.db, 'trips', tripId, 'gastos', id)
export const liquidacionesRef = (fb, tripId) =>
  fb.fs.collection(fb.db, 'trips', tripId, 'liquidaciones')
export const liquidacionRef = (fb, tripId, id) =>
  fb.fs.doc(fb.db, 'trips', tripId, 'liquidaciones', id)
