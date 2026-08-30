/**
 * El cambio de pesos colombianos a euros.
 *
 * Por qué esto no es una constante en un archivo: el peso se mueve, y un tipo
 * de cambio escrito a mano envejece en silencio. Un gasto de 200.000 COP
 * apuntado con la tasa del año pasado puede irse quince euros.
 *
 * Dos fuentes, y en este orden a propósito:
 *
 *  1. La de jsDelivr da la tasa con ocho decimales.
 *  2. `open.er-api.com` la da con seis. Para el peso eso es demasiado poco:
 *     0,000275 y 0,00027199 se parecen, pero el primero dice 3.636 COP por
 *     euro y el segundo 3.677 — un 1,1 % de diferencia, once euros en mil.
 *     Vale como respaldo, no como primera opción.
 *
 * REGLA QUE NO SE NEGOCIA: la tasa se GUARDA con el gasto. Lo que se apunta
 * son los euros, y la tasa queda al lado como justificante. Si se recalculara
 * al vuelo, la cena del día 12 valdría distinto cada vez que alguien abre la
 * app, y los saldos bailarían solos.
 *
 * Y esto es una referencia de mercado, no lo que cobra un banco: la tarjeta
 * añade su diferencial y su comisión. Sirve para repartir una cuenta entre
 * hermanos, no para cuadrar un extracto al céntimo. La interfaz lo dice.
 */

const FUENTES = [
  {
    nombre: 'jsDelivr',
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cop.json',
    leer: (d) => ({ eurPorCop: d?.cop?.eur, fecha: d?.date }),
  },
  {
    nombre: 'exchangerate-api',
    url: 'https://open.er-api.com/v6/latest/COP',
    leer: (d) => ({ eurPorCop: d?.rates?.EUR, fecha: d?.time_last_update_utc?.slice(5, 16) }),
  },
]

const SEIS_HORAS = 6 * 60 * 60 * 1000
let cache = null

/**
 * Devuelve { copPorEur, fecha, fuente } o null si ninguna fuente responde.
 *
 * Null no es un fallo silencioso: la interfaz tiene que enseñar que no hay
 * cambio y dejar escribir los euros a mano. Inventarse una tasa aproximada
 * sería lo peor de los dos mundos.
 */
export async function tasaCop() {
  if (cache && Date.now() - cache.pedidoEn < SEIS_HORAS) return cache.valor

  for (const f of FUENTES) {
    try {
      const r = await fetch(f.url, { signal: AbortSignal.timeout(6000) })
      if (!r.ok) continue
      const { eurPorCop, fecha } = f.leer(await r.json())
      if (!Number.isFinite(eurPorCop) || eurPorCop <= 0) continue
      const valor = {
        copPorEur: 1 / eurPorCop,
        fecha: fecha ?? null,
        fuente: f.nombre,
      }
      cache = { pedidoEn: Date.now(), valor }
      return valor
    } catch {
      // Siguiente fuente. Sin red, se devuelve null y se teclean los euros.
    }
  }
  return null
}

/**
 * Pesos (en céntimos de peso) a céntimos de euro.
 *
 * Entero a entero, sin pasar por euros con decimales: es la misma regla que
 * gobierna todo el dinero de esta app.
 */
export function copAEur(copCent, copPorEur) {
  if (!Number.isFinite(copCent) || !Number.isFinite(copPorEur) || copPorEur <= 0) return null
  return Math.round(copCent / copPorEur)
}

/** El camino de vuelta: céntimos de euro a céntimos de peso. */
export function eurACop(eurCent, copPorEur) {
  if (!Number.isFinite(eurCent) || !Number.isFinite(copPorEur) || copPorEur <= 0) return null
  return Math.round(eurCent * copPorEur)
}

/** «3.676,59 COP por euro» */
export function tasaLegible(copPorEur) {
  if (!Number.isFinite(copPorEur)) return null
  return `${copPorEur.toLocaleString('es-ES', { maximumFractionDigits: 0, useGrouping: 'always' })} COP por euro`
}
