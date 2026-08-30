/**
 * Que se puede HACER con un momento de la agenda.
 *
 * Nace de una queja concreta: «esta ahi pero no se puede hacer nada». Era
 * cierto, y la tentacion era poner «votar / aprobar / descartar» en todas las
 * tarjetas. Seria un error. La agenda de este viaje son sobre todo reservas
 * pagadas: un boton «descartar» encima del Vueling de 431,91 € no es una
 * funcion, es una trampa. Y votar algo que ya esta pagado no cambia nada.
 *
 * Asi que lo que se puede hacer depende de lo que el momento ES:
 *
 *   · propuesto   → lo puso alguien desde la app y todavia no es real:
 *                   se vota, se confirma y se quita.
 *   · confirmado  → esta reservado y pagado: no se vota. Lo unico util es
 *                   ir hasta alli y, si hay algo abierto, decidirlo.
 *
 * Y la pieza que faltaba: una decision ya declara `blocks: ['bernabeu']`.
 * Ese enlace existia en los datos y no se veia en ningun sitio. El tour del
 * Bernabeu del 11 choca con el viernes de F1, hay una decision abierta que lo
 * dice, y desde la agenda no habia forma de llegar a ella. Eso es lo que
 * hacia que la tarjeta pareciera muerta: no le faltaba un boton de voto, le
 * faltaba el camino a la decision que ya existia.
 *
 * Todo puro: sin React, sin Firestore, sin reloj. Se puede probar entero.
 */

/** Estados en los que una decision ya no espera nada de nadie. */
const DECISION_CERRADA = new Set(['decidido', 'reservado', 'pagado', 'descartado'])

/** Momentos que salieron de la app y todavia no son reales. */
export function esPropuesta(evento) {
  return (evento?.status ?? 'confirmado') === 'propuesto'
}

/** Lo puso una persona desde la app (el copiloto o el boton «Agregar»). */
export function loPusoAlguien(evento) {
  return Boolean(evento?.createdBy)
}

/**
 * Las decisiones ABIERTAS que bloquean este momento.
 *
 * Una decision cerrada no se enseña en la agenda: ya no hay nada que hacer
 * con ella, y un aviso que no pide nada es ruido.
 */
export function decisionesDe(eventoId, decisiones = []) {
  if (!eventoId) return []
  return decisiones.filter(
    (d) => (d.blocks ?? []).includes(eventoId) && !DECISION_CERRADA.has(d.status ?? 'propuesto'),
  )
}

/**
 * A donde lleva el boton del mapa.
 *
 * Repite a proposito el criterio de `Proximo.jsx`: antes de un vuelo lo util
 * es el aeropuerto de SALIDA con su terminal, no la ciudad de destino. Un
 * enlace a «Madrid» no le sirve a nadie que este buscando la puerta.
 */
export function aDondeIr(evento) {
  if (!evento) return null
  if (evento.address) return evento.address
  if (evento.venue) return evento.venue
  if (evento.kind === 'flight') {
    const salida = evento.from?.name
    if (!salida) return null
    return `Aeropuerto de ${salida}${evento.from?.terminal ? ` ${evento.from.terminal}` : ''}`
  }
  return null
}

export function enlaceDeMapa(evento) {
  const destino = aDondeIr(evento)
  if (!destino) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`
}

/**
 * Que botones tiene sentido enseñar en esta tarjeta, y en que orden.
 *
 * Devuelve descriptores, no JSX: quien pinta decide como se ve, y esto se
 * puede probar sin montar un navegador.
 *
 * `puedeCerrar` es quien organiza el viaje. Confirmar un plan es decir «esto
 * va a pasar»; quitarlo, lo contrario. Las dos cosas las hace un owner, o
 * quien lo propuso mientras siga siendo solo una propuesta.
 */
/**
 * ¿Este momento pasa hoy? `hoy` es 'AAAA-MM-DD'; un alojamiento cuenta todos
 * los dias que dura, no solo el de la entrada.
 */
export function pasaHoy(evento, hoy) {
  if (!hoy || !evento?.start) return false
  const desde = String(evento.start).slice(0, 10)
  const hasta = evento.end ? String(evento.end).slice(0, 10) : desde
  return desde <= hoy && hoy <= hasta
}

/**
 * @param hoy  El dia que se esta mirando, 'AAAA-MM-DD', o null fuera del viaje.
 *             Nunca se lee el reloj aqui dentro: entra como dato, o no se
 *             puede ni probar ni previsualizar con `?hoy=`.
 */
export function accionesDe(evento, { decisiones = [], uid = null, esOwner = false, hoy = null } = {}) {
  if (!evento) return []
  const acciones = []

  for (const d of decisionesDe(evento.id, decisiones)) {
    acciones.push({
      id: `decidir-${d.id}`,
      tipo: 'decision',
      decisionId: d.id,
      etiqueta: d.title,
      urgencia: d.urgency ?? 'media',
    })
  }

  if (esPropuesta(evento)) {
    acciones.push({ id: 'votar', tipo: 'voto' })
    if (esOwner) acciones.push({ id: 'confirmar', tipo: 'estado', a: 'confirmado', etiqueta: 'Confirmar' })
    // Solo se quita lo que salio de la app. Un vuelo de la siembra no tiene
    // `createdBy` y por tanto no tiene boton: no hay forma de borrarlo sin
    // querer, ni siquiera siendo owner.
    if (loPusoAlguien(evento) && (esOwner || evento.createdBy === uid)) {
      // Editar va con quitar, no con confirmar. Quien puede borrar un plan
      // puede corregirlo, y obligar a borrar y volver a crear para cambiar
      // una hora es como se pierden los votos que ya tenia.
      acciones.push({ id: 'editar', tipo: 'editar', etiqueta: 'Editar' })
      acciones.push({ id: 'quitar', tipo: 'quitar', etiqueta: 'Quitar' })
      if (evento.rutaId) {
        acciones.push({
          id: 'quitar-ruta',
          tipo: 'quitar-ruta',
          rutaId: evento.rutaId,
          etiqueta: `Quitar la ruta «${evento.rutaNombre ?? 'sin nombre'}»`,
        })
      }
    }
  }

  /**
   * «Cómo llegar» SOLO en lo de hoy.
   *
   * La primera version lo ponia en las catorce tarjetas: tres enlaces
   * identicos al circuito de IFEMA en tres dias seguidos, y una fila mas de
   * alto en cada momento de la agenda. Justo el espacio que costo recuperar
   * en la pasada visual. A quince dias de la salida nadie necesita la ruta al
   * Bernabeu; el dia 11 a las diez de la mañana, si.
   */
  if (pasaHoy(evento, hoy)) {
    const mapa = enlaceDeMapa(evento)
    if (mapa) acciones.push({ id: 'mapa', tipo: 'enlace', url: mapa, etiqueta: 'Cómo llegar' })
  }

  return acciones
}
