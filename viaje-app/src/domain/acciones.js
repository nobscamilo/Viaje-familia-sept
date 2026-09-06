/**
 * Que se puede HACER con un momento de la agenda.
 *
 * Nace de una queja concreta: «esta ahi pero no se puede hacer nada». La
 * primera version resolvio la mitad: un plan PROPUESTO se votaba, se editaba
 * y se quitaba, pero en cuanto alguien lo confirmaba se congelaba para
 * siempre. Corregirle una hora al plan del Camp Nou ya confirmado era
 * imposible, y para las reservas sembradas —los vuelos, los hoteles— no
 * habia ningun boton nunca.
 *
 * Desde el 1 de septiembre de 2026 manda otra regla, que Camilo pidio
 * explicitamente: **cualquier adulto puede editar o quitar cualquier
 * momento**. Sin excepciones por estado ni por origen.
 *
 * Lo que queda en su lugar no es un candado, son tres cosas:
 *   · `esReserva()` marca lo que no salio de la app. Quien pinta usa esa
 *     marca para pedir un segundo toque antes de borrar: un dedo torpe sobre
 *     el Vueling de 431,91 € no puede costar una reserva.
 *   · El servidor deja huella (`tocadoAMano`, lapida en `borrados/`), para
 *     que `npm run publicar` no revierta el cambio al dia siguiente.
 *   · Mover el ESTADO —confirmar, devolver a propuesto— sigue siendo del
 *     owner. Editar y quitar es de cualquier adulto; decir «esto va a pasar»
 *     es de quien organiza.
 *
 * Y la pieza que ya estaba: una decision declara `blocks: ['bernabeu']`. Ese
 * enlace existia en los datos y no se veia en ningun sitio. Eso es lo que
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
 * Una RESERVA: lo escribio la siembra, no una persona.
 *
 * Se mira `origen` Y la ausencia de autor, igual que en el servidor: la marca
 * `origen: 'seed'` es de agosto y los documentos anteriores solo se
 * distinguen por no tener `createdBy`.
 *
 * No sirve para prohibir nada. Sirve para que quitar un vuelo pida un segundo
 * toque y quitar una cena propuesta no lo pida: la friccion se pone donde
 * esta el dano, no en todas partes.
 */
export function esReserva(evento) {
  return evento?.origen === 'seed' || !evento?.createdBy
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
 * Que botones tiene sentido ensenar en esta tarjeta, y en que orden.
 *
 * Devuelve descriptores, no JSX: quien pinta decide como se ve, y esto se
 * puede probar sin montar un navegador.
 *
 * @param esAdulto  Owner o adult. Un `viewer` mira y no toca: es el unico
 *                  limite que queda, y es sobre QUIEN toca, no sobre QUE.
 * @param hoy       El dia que se esta mirando, 'AAAA-MM-DD', o null fuera del
 *                  viaje. Nunca se lee el reloj aqui dentro: entra como dato,
 *                  o no se puede ni probar ni previsualizar con `?hoy=`.
 */
export function accionesDe(
  evento,
  { decisiones = [], _uid = null, esOwner = false, esAdulto = true, hoy = null } = {},
) {
  if (!evento) return []
  const acciones = []
  const puedeTocar = esOwner || esAdulto

  for (const d of decisionesDe(evento.id, decisiones)) {
    acciones.push({
      id: `decidir-${d.id}`,
      tipo: 'decision',
      decisionId: d.id,
      etiqueta: d.title,
      urgencia: d.urgency ?? 'media',
    })
  }

  // Votar sigue siendo solo de lo que esta propuesto. Votar algo que ya esta
  // pagado no cambia nada, y ponerle marcas de voto al Vueling seria fingir
  // que la familia decide sobre un billete emitido.
  if (esPropuesta(evento)) acciones.push({ id: 'votar', tipo: 'voto' })

  if (puedeTocar) {
    const reserva = esReserva(evento)

    // El estado lo mueve quien organiza, en los dos sentidos. Confirmar es
    // decir «esto va a pasar»; devolverlo a propuesto es abrirlo otra vez a
    // votacion SIN perder los votos que ya tenia, que es justo lo que se
    // perdia cuando la unica salida era borrar y volver a crear.
    if (esOwner) {
      if (esPropuesta(evento)) {
        acciones.push({ id: 'confirmar', tipo: 'estado', a: 'confirmado', etiqueta: 'Confirmar' })
      } else if ((evento.status ?? 'confirmado') === 'confirmado') {
        acciones.push({
          id: 'desconfirmar',
          tipo: 'estado',
          a: 'propuesto',
          etiqueta: 'Volver a proponer',
          peligroso: reserva,
          // `discreta`: no se pinta a la vista, vive detras del banner
          // «Editar o quitar». Lo pidio Camilo el 1 de septiembre: con los
          // tres botones siempre puestos, cada tarjeta parecia un panel de
          // administracion y la agenda dejaba de leerse. Confirmar NO es
          // discreta: es la accion que el plan esta esperando.
          discreta: true,
        })
      }
    }

    acciones.push({ id: 'editar', tipo: 'editar', etiqueta: 'Editar', discreta: true })
    acciones.push({
      id: 'quitar',
      tipo: 'quitar',
      etiqueta: 'Quitar',
      // El segundo toque va aqui, en el dato, no en el JSX: asi se puede
      // probar que el vuelo lo pide y la cena propuesta no.
      peligroso: reserva,
      discreta: true,
      aviso: reserva
        ? 'Esto no lo puso nadie desde la app: es una reserva. Se quita de verdad.'
        : null,
    })

    if (evento.rutaId) {
      acciones.push({
        id: 'quitar-ruta',
        tipo: 'quitar-ruta',
        rutaId: evento.rutaId,
        etiqueta: `Quitar la ruta «${evento.rutaNombre ?? 'sin nombre'}»`,
        peligroso: true,
        discreta: true,
      })
    }
  }

  /**
   * «Como llegar» SOLO en lo de hoy.
   *
   * La primera version lo ponia en las catorce tarjetas: tres enlaces
   * identicos al circuito de IFEMA en tres dias seguidos, y una fila mas de
   * alto en cada momento de la agenda. Justo el espacio que costo recuperar
   * en la pasada visual. A quince dias de la salida nadie necesita la ruta al
   * Bernabeu; el dia 11 a las diez de la manana, si.
   */
  if (pasaHoy(evento, hoy)) {
    const mapa = enlaceDeMapa(evento)
    if (mapa) acciones.push({ id: 'mapa', tipo: 'enlace', url: mapa, etiqueta: 'Como llegar' })
  }

  return acciones
}
