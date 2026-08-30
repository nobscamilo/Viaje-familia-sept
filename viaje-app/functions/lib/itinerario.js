/**
 * El reloj de una ruta de turismo. Sin red y sin Firestore, a proposito.
 *
 * Encadenar «llego, me quedo un rato, tardo tanto en llegar al siguiente» es
 * aritmetica, y la aritmetica se prueba sola. Lo que necesita internet
 * —buscar el sitio, preguntar cuanto se tarda— vive en `rutas.js`. Si esto
 * estuviera mezclado con las llamadas a Google, la unica forma de comprobar
 * que una ruta de cinco paradas cuadra seria gastando nueve peticiones.
 */

/**
 * Cuanto se queda uno, por defecto, segun que sea.
 *
 * Son estimaciones, y por eso el modelo puede sobrescribirlas parada a
 * parada: una comida familiar de nueve no dura lo mismo que un cafe.
 */
export const MINUTOS_POR_TIPO = { food: 90, activity: 75, transport: 15, lodging: 30 }

/** Tope de paradas. Mas que esto no es una ruta, es una maraton. */
export const MAX_PARADAS = 6

/** Con ninos de 4 y 9 anos, seis paradas es una crueldad. */
export const MAX_CON_NINOS = 4

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export function aMinutos(hhmm) {
  if (!HHMM.test(hhmm ?? '')) return null
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** De minutos a HH:MM. Pasadas las 23:59 se queda ahi y lo dice quien llama. */
export function aHora(min) {
  const t = Math.max(0, Math.min(Math.round(min), 24 * 60 - 1))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/**
 * Encadena las paradas: a que hora se llega a cada una y a que hora se sale.
 *
 * `traslados[i]` son los minutos de la parada i a la i+1. Un traslado que no
 * se pudo calcular entra como null y se cuenta como 0, pero se marca: una
 * ruta con un hueco desconocido sigue siendo util, mentir sobre el no.
 */
export function encadenar(paradas = [], horaInicio = '10:00', traslados = []) {
  const arranque = aMinutos(horaInicio) ?? aMinutos('10:00')
  let reloj = arranque
  const tramos = []

  for (const [i, p] of paradas.entries()) {
    const dura = Number.isFinite(p?.minutos) && p.minutos > 0
      ? Math.min(p.minutos, 8 * 60)
      : (MINUTOS_POR_TIPO[p?.tipo] ?? MINUTOS_POR_TIPO.activity)

    const llegadaMin = reloj
    const salidaMin = llegadaMin + dura
    const traslado = i < paradas.length - 1 ? traslados[i] : null

    tramos.push({
      ...p,
      orden: i + 1,
      llegada: aHora(llegadaMin),
      salida: aHora(salidaMin),
      minutos: dura,
      llegadaMin,
      salidaMin,
      trasladoMin: Number.isFinite(traslado) ? traslado : null,
      // Un dia que se pasa de medianoche no es un dia: es un aviso.
      seSalePorArriba: salidaMin >= 24 * 60,
    })

    reloj = salidaMin + (Number.isFinite(traslado) ? traslado : 0)
  }

  return tramos
}

/**
 * Choques con lo que ya estaba reservado.
 *
 * Solo se avisa de lo que se puede afirmar. Un evento sin hora no choca con
 * nada; uno sin final tampoco tiene duracion que inventarle, asi que solo
 * cuenta si su comienzo cae dentro de una parada. Estirar los eventos a una
 * duracion supuesta llenaria esto de falsos avisos y nadie los leeria.
 */
export function choques(tramos = [], eventos = []) {
  const avisos = []
  for (const e of eventos) {
    const ini = aMinutos(e?.inicio)
    if (ini === null) continue
    const fin = aMinutos(e?.fin)
    for (const t of tramos) {
      const solapa = fin === null
        ? ini >= t.llegadaMin && ini < t.salidaMin
        : ini < t.salidaMin && fin > t.llegadaMin
      if (solapa) {
        avisos.push(`${t.titulo ?? `Parada ${t.orden}`} (${t.llegada}-${t.salida}) pisa «${e.titulo}» a las ${e.inicio}.`)
        break
      }
    }
  }
  return avisos
}

/** Cuanto dura la ruta entera, de la primera llegada a la ultima salida. */
export function duracionTotal(tramos = []) {
  if (tramos.length === 0) return 0
  return tramos[tramos.length - 1].salidaMin - tramos[0].llegadaMin
}
