/**
 * El reparto del dinero. Puro: sin React, sin Firestore, sin reloj.
 *
 * DOS REGLAS GOBIERNAN ESTE ARCHIVO, y las dos vienen de Camilo:
 *
 *  1. Un gasto se divide entre los ADULTOS que participan en él, nunca entre
 *     los nueve. Una comida de todos se parte en siete; un plan del grupo de
 *     F1, en tres; el vuelo Bilbao-Madrid que solo cogen Camilo y Juliana, en
 *     dos, y a los demás no se les pide nada.
 *  2. La deuda se salda entre HOGARES, no entre personas. Nadie le va a pedir
 *     tres euros a su madre por separado.
 *
 * TODO EN CÉNTIMOS ENTEROS. Nunca en euros con decimales.
 *
 * No es purismo. `0.1 + 0.2` en JavaScript da 0.30000000000000004, y un
 * reparto de 100 € entre 7 da 14,285714... siete veces: sumado en coma
 * flotante no vuelve a dar 100. En una app de cuentas ese céntimo que sobra o
 * falta aparece como un saldo fantasma que nadie sabe de dónde sale, y la
 * gente deja de fiarse del número. Aquí el reparto SIEMPRE suma exactamente
 * lo que se pagó, y hay una prueba que lo comprueba con importes feos.
 */
import { HOGARES, hogarDe } from '../data/hogares.js'
import { puedeVotar } from './decisions.js'

/**
 * Quién paga de un gasto: los adultos entre los participantes.
 *
 * `participantes` puede ser 'all', el id de un grupo, o una lista de
 * viajeros. Los niños que estén dentro se descartan aquí: consumen, pero su
 * parte se la reparten los adultos presentes.
 */
export function adultosDe(participantes, travelers, grupos = {}) {
  let ids = participantes
  if (ids === 'all' || !ids) ids = travelers.map((t) => t.id)
  else if (typeof ids === 'string') {
    const g = Object.values(grupos).find((x) => x.id === ids)
    ids = g?.travelerIds === 'all' || !g ? travelers.map((t) => t.id) : g.travelerIds
  }
  return travelers
    .filter((t) => ids.includes(t.id) && puedeVotar(t))
    .map((t) => t.id)
    .sort()
}

/**
 * Reparte `cent` entre `ids`, sin perder ni inventar un céntimo.
 *
 * Lo que no se puede dividir exacto se le da de uno en uno a los primeros por
 * orden alfabético de id. Es arbitrario, pero es ESTABLE: el mismo gasto
 * reparte igual hoy y mañana, y en cualquier móvil. Un desempate aleatorio
 * haría que el saldo cambiara solo al recargar.
 */
export function repartir(cent, ids) {
  const n = ids.length
  if (n === 0) return {}
  const base = Math.floor(cent / n)
  let resto = cent - base * n
  const trozos = {}
  // Ordenar AQUI, no fiarse de que llegue ordenado. El comentario de arriba
  // decia «por orden alfabetico» y el codigo repartia en el orden en que
  // vinieran: los mismos tres adultos en distinto orden daban repartos
  // distintos. Lo cazo la prueba de estabilidad, no la lectura.
  for (const id of [...ids].sort()) {
    trozos[id] = base + (resto > 0 ? 1 : 0)
    if (resto > 0) resto -= 1
  }
  return trozos
}

const vacio = () => ({ pagado: 0, debe: 0, saldo: 0 })

/**
 * ¿Hay alguien que pueda pagar esto?
 *
 * La interfaz lo usa para no dejar guardar un gasto que no reparte entre
 * nadie. `saldos()` tiene además su propia red debajo, porque un documento
 * puede llegar de otra versión de la app o del copiloto.
 */
export function tienePagadores(participantes, travelers, grupos = {}) {
  return adultosDe(participantes, travelers, grupos).length > 0
}

/**
 * Saldos por hogar.
 *
 *   pagado → lo que ha puesto de su bolsillo
 *   debe   → lo que le toca de todos los gastos en los que participa
 *   saldo  → pagado − debe. Positivo: le deben. Negativo: debe.
 *
 * `liquidaciones` son las transferencias entre ellos («Fernando me pasó
 * 200 €»): suman al que paga y restan al que cobra, porque saldar una deuda
 * es exactamente lo mismo que haber puesto ese dinero.
 */
export function saldos(gastos = [], travelers = [], grupos = {}, liquidaciones = []) {
  const cuenta = Object.fromEntries(HOGARES.map((h) => [h.id, vacio()]))

  for (const g of gastos) {
    const cent = Math.round(g.importeCent ?? 0)
    if (!Number.isFinite(cent) || cent <= 0) continue

    const quienPago = hogarDe(g.pagadoPor)
    if (quienPago) cuenta[quienPago.id].pagado += cent

    const pagadores = adultosDe(g.participantes, travelers, grupos)

    if (pagadores.length === 0) {
      // Un gasto sin ningún adulto entre los participantes —una entrada solo
      // para los dos niños, o una lista mal guardada— rompería la invariante:
      // alguien ha puesto el dinero y nadie lo debe, así que los saldos
      // dejarían de sumar cero y aparecería un crédito de la nada. Lo asume
      // quien lo pagó, que es lo único que no inventa deuda.
      if (quienPago) cuenta[quienPago.id].debe += cent
      continue
    }

    const trozos = repartir(cent, pagadores)
    for (const [travelerId, parte] of Object.entries(trozos)) {
      const h = hogarDe(travelerId)
      if (h) cuenta[h.id].debe += parte
    }
  }

  for (const l of liquidaciones) {
    const cent = Math.round(l.importeCent ?? 0)
    if (!Number.isFinite(cent) || cent <= 0) continue
    if (cuenta[l.de]) cuenta[l.de].pagado += cent
    if (cuenta[l.a]) cuenta[l.a].pagado -= cent
  }

  for (const h of HOGARES) {
    const c = cuenta[h.id]
    c.saldo = c.pagado - c.debe
  }
  return cuenta
}

/**
 * Quién le paga a quién, con el menor número de transferencias.
 *
 * Voraz: el que más debe le paga al que más le deben, hasta que uno de los
 * dos queda a cero. Con tres hogares salen como mucho dos transferencias, y
 * dos transferencias es lo que de verdad va a pasar en la vida real.
 *
 * Se ignoran los saldos de menos de un céntimo por definición (son enteros) y
 * los de exactamente cero: nadie hace un Bizum de 0 €.
 */
export function liquidar(cuenta) {
  const acreedores = HOGARES.map((h) => ({ id: h.id, v: cuenta[h.id]?.saldo ?? 0 }))
    .filter((x) => x.v > 0).sort((a, b) => b.v - a.v)
  const deudores = HOGARES.map((h) => ({ id: h.id, v: -(cuenta[h.id]?.saldo ?? 0) }))
    .filter((x) => x.v > 0).sort((a, b) => b.v - a.v)

  const pagos = []
  let i = 0
  let j = 0
  while (i < deudores.length && j < acreedores.length) {
    const cuanto = Math.min(deudores[i].v, acreedores[j].v)
    if (cuanto > 0) pagos.push({ de: deudores[i].id, a: acreedores[j].id, importeCent: cuanto })
    deudores[i].v -= cuanto
    acreedores[j].v -= cuanto
    if (deudores[i].v === 0) i += 1
    if (acreedores[j].v === 0) j += 1
  }
  return pagos
}

export function total(gastos = []) {
  return gastos.reduce((s, g) => s + (Math.round(g.importeCent) || 0), 0)
}

/** Cuánto llevamos gastado y en qué. Ordenado de más a menos. */
export function porCategoria(gastos = []) {
  const mapa = new Map()
  for (const g of gastos) {
    const k = g.categoria ?? 'otros'
    mapa.set(k, (mapa.get(k) ?? 0) + (Math.round(g.importeCent) || 0))
  }
  return [...mapa.entries()]
    .map(([categoria, cent]) => ({ categoria, cent }))
    .sort((a, b) => b.cent - a.cent)
}

/** «1.234,56 €». Sin librerías: es lo único que hay que formatear. */
export function euros(cent, conSimbolo = true) {
  const n = (Math.round(cent) || 0) / 100
  // `useGrouping: 'always'`: el español no separa los miles hasta cinco
  // cifras («3058,74», no «3.058,74»), que es correcto en prosa y horrible en
  // una columna de importes. Aquí manda la columna.
  const txt = n.toLocaleString('es-ES', {
    minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always',
  })
  return conSimbolo ? `${txt} €` : txt
}

/**
 * «4.210», no «4210».
 *
 * Mismo motivo que en `euros`, y encontrado dos veces ya: el español no
 * separa los miles hasta cinco cifras, asi que una lista con «32.871 reseñas»
 * encima de «4210 reseñas» parece que la segunda tiene un error. En una
 * columna, todos los numeros se separan o ninguno.
 */
export function miles(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return ''
  return v.toLocaleString('es-ES', { useGrouping: 'always', maximumFractionDigits: 0 })
}

/**
 * «1 gasto» / «7 gastos».
 *
 * Existe porque ya escribí «Ver los 1 días que ya pasaron» una vez, lo
 * arreglé, y a la semana escribí «Ver los 1 gastos restantes». Concatenar una
 * `s` a mano es un error que se comete solo.
 */
export function plural(n, singular, pluralForma) {
  return n === 1 ? `${n} ${singular}` : `${n} ${pluralForma}`
}

/**
 * Lee un importe escrito a mano y devuelve céntimos. null si no es un número.
 *
 * El punto es ambiguo en español y hay que desambiguarlo con la forma, no con
 * una suposición:
 *
 *   «1.234,56»    hay coma → la coma decide, los puntos son de miles
 *   «3.676.590»   grupos de tres → todos los puntos son de miles
 *   «1.000»       un grupo de tres → miles. Nadie escribe «1.000» por un euro
 *   «12.50»       dos decimales, no tres → punto decimal, a la inglesa
 *
 * El caso de los grupos de tres NO estaba, y con los pesos colombianos se
 * notó de golpe: «3.676.590» devolvía null, así que al pasar 1.000 € a pesos
 * el campo quedaba con un número que la propia app no sabía leer.
 */
export function aCentimos(texto) {
  const limpio = String(texto ?? '').trim().replace(/[\s€$]|COP/gi, '')
  if (!limpio) return null

  let normal
  if (limpio.includes(',')) normal = limpio.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) normal = limpio.replace(/\./g, '')
  else normal = limpio

  const n = Number(normal)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

/** Pesos enteros con separador de miles: «3.676.590». */
export function pesos(copCent) {
  return Math.round((Math.round(copCent) || 0) / 100)
    .toLocaleString('es-CO', { useGrouping: 'always' })
}
