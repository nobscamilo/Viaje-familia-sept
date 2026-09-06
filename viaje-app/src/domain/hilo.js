import { diaDelViaje } from './dates.js'

/**
 * Cuando una conversacion con el copiloto deja de ser la misma.
 *
 * El hilo se guarda desde el 30 de agosto y esa parte esta bien: sin ella,
 * recargar la pagina borraba el contexto y «¿y en metro?» dejaba de tener
 * sentido. Lo que estaba mal es que no se acababa NUNCA. Camilo lo dijo
 * probandola: abres el copiloto y te encuentras todo lo de anteayer, sin
 * forma de empezar de cero — porque el boton que llamaba a `olvidar()` no
 * existia, aunque la funcion llevaba semanas escrita.
 *
 * Y el problema no era solo de vista. Cada pregunta viaja al modelo con las
 * ultimas doce intervenciones: si son de hace tres dias y de otra ciudad, el
 * copiloto contesta con una seguridad que no le corresponde. Es la misma
 * familia de error que la ruta calculada «para ahora» un dia que aun no ha
 * llegado: un resultado plausible y falso.
 *
 * Asi que una conversacion se acaba sola. Dos cortes, y los dos son de
 * sentido comun en un viaje:
 *
 *   · Un silencio largo. Lo de la mañana y lo de la noche no son lo mismo.
 *   · Un cambio de dia. El dia 14 se duerme en Barcelona y el 13 en Madrid;
 *     arrastrar el contexto de ayer es arrastrar la ciudad de ayer.
 *
 * Puro y sin reloj propio: `ahora` entra como dato, igual que en el resto del
 * dominio. Si no, ni se prueba ni se puede previsualizar con `?hoy=`.
 */

/** Cuanto silencio acaba una conversacion. Cuatro horas: una mañana. */
export const HUECO_SESION_MS = 4 * 60 * 60 * 1000

/** El dia de un mensaje, en la zona del viaje. */
const diaDe = (ms) => diaDelViaje(new Date(ms))

/**
 * Los mensajes que siguen siendo la conversacion de AHORA.
 *
 * `mensajes` viene ordenado de mas viejo a mas nuevo, con `en` en
 * milisegundos. Devuelve la cola: desde el ultimo corte hasta el final. Si el
 * ultimo mensaje ya cayo del otro lado del hueco, no hay conversacion viva y
 * se devuelve vacio — que es lo que hace que al abrir salga la bienvenida con
 * sus atajos en vez de la charla de anteayer.
 *
 * Un mensaje sin `en` (recien guardado, el `serverTimestamp` aun no ha
 * vuelto) cuenta como de ahora mismo: nunca se corta lo que se acaba de
 * escribir.
 */
export function sesionActual(mensajes = [], ahora = new Date()) {
  if (mensajes.length === 0) return []
  const t = ahora instanceof Date ? ahora.getTime() : Number(ahora)
  const en = (m) => (Number.isFinite(m?.en) ? m.en : t)

  // ¿Sigue viva? El silencio se mide contra el ultimo mensaje, no contra el
  // primero: una charla de dos horas no caduca por haber empezado temprano.
  const ultimo = en(mensajes[mensajes.length - 1])
  if (t - ultimo >= HUECO_SESION_MS) return []
  if (diaDe(ultimo) !== diaDelViaje(ahora)) return []

  // Y hacia atras hasta el primer corte.
  let desde = 0
  for (let i = mensajes.length - 1; i > 0; i -= 1) {
    const actual = en(mensajes[i])
    const previo = en(mensajes[i - 1])
    if (actual - previo >= HUECO_SESION_MS || diaDe(actual) !== diaDe(previo)) {
      desde = i
      break
    }
  }
  return mensajes.slice(desde)
}


/** Los borradores pendientes sobreviven al cambio de sesión; no son contexto. */
export function pendientes(mensajes = []) {
  return mensajes.filter((m) => m.borradores?.length || m.borradoresPlan?.length).map((m) => ({
    ...m, texto: 'Borrador pendiente de revisar', soloBorrador: true,
    tarjetas: [], busquedas: [], rutas: [], planes: [], itinerarios: [], propuestas: [],
  }))
}

export function restaurarConversacion(mensajes = [], ahora = new Date()) {
  const conversacion = mensajes.filter((m) => !m.soloBorrador)
  const vivos = sesionActual(conversacion, ahora)
  return [...pendientes(mensajes.filter((m) => !vivos.includes(m))), ...vivos]
}

/** El modelo solo recibe la conversación viva, nunca las tarjetas ni los fallos. */
export function contextoVivo(mensajes, ahora = new Date()) {
  return sesionActual(mensajes.filter((m) => !m.soloBorrador && !m.fallo), ahora)
    .slice(-12).map(({ rol, texto }) => ({ rol, texto }))
}

export function estadoSerializable(mensajes) {
  return JSON.parse(JSON.stringify(mensajes.slice(-60), (k, v) => {
    if (k === 'photoUri' || k === 'photoUris' || k === 'photoNames' || k === 'photoName' || k === 'photos' || k === 'createdAt') return undefined
    return v
  }))
}
