/**
 * Copia de `src/data/hogares.js` para el servidor.
 *
 * Duplicar datos es feo y aqui es inevitable: `firebase deploy` solo sube la
 * carpeta `functions/`, asi que un `import '../../src/data/hogares.js'`
 * compila en local y revienta en produccion.
 *
 * Lo que hace que la copia sea aceptable es que NO se puede desincronizar sin
 * que salte una prueba: `test/copiloto.test.js` lee los dos archivos y exige
 * que digan lo mismo. Antes de esto ya habia una lista de adultos duplicada en
 * `gastos.js` sin nadie vigilandola.
 *
 * Los dos ninos no estan, y Julian David esta con sus abuelos desde el 30 de
 * agosto de 2026 porque su abuelo cubre sus gastos: las casas son bolsillos,
 * no domicilios.
 */
export const HOGARES = [
  { id: 'camilo', nombre: 'Camilo y Juliana', miembros: ['camilo', 'juliana-bueno'] },
  { id: 'padres', nombre: 'Julián, Cielo y Julián David', miembros: ['julian-padre', 'cielo', 'julian-david'] },
  { id: 'hermana', nombre: 'Juliana y Fernando', miembros: ['juliana-hermana', 'fernando'] },
]

export const ADULTOS = HOGARES.flatMap((h) => h.miembros)

export function hogarDe(travelerId) {
  return HOGARES.find((h) => h.miembros.includes(travelerId)) ?? null
}

/** Reparte centimos enteros; lo que sobra va a los primeros por orden. */
export function repartir(cent, ids) {
  const n = ids.length
  if (n === 0) return {}
  const base = Math.floor(cent / n)
  let resto = cent - base * n
  const trozos = {}
  for (const id of [...ids].sort()) {
    trozos[id] = base + (resto > 0 ? 1 : 0)
    if (resto > 0) resto -= 1
  }
  return trozos
}

const GRUPOS = {
  todos: ADULTOS,
  f1: ['camilo', 'juliana-bueno', 'fernando'],
  'sin-f1': ['julian-padre', 'cielo', 'juliana-hermana', 'julian-david'],
}

/** Quien reparte un gasto: los adultos entre sus participantes. */
export function pagadoresDe(participantes) {
  if (!participantes || participantes === 'all' || participantes === 'todos') return ADULTOS
  if (typeof participantes === 'string') return GRUPOS[participantes] ?? ADULTOS
  return participantes.filter((id) => ADULTOS.includes(id))
}

/**
 * Saldos por hogar, en centimos. Misma regla que el cliente: quien paga suma,
 * y lo que le toca a cada uno se reparte entre los adultos participantes.
 */
export function saldos(gastos = [], liquidaciones = []) {
  const cuenta = Object.fromEntries(HOGARES.map((h) => [h.id, { pagado: 0, debe: 0, saldo: 0 }]))

  for (const g of gastos) {
    const cent = Math.round(g.importeCent ?? 0)
    if (!Number.isFinite(cent) || cent <= 0) continue
    const quien = hogarDe(g.pagadoPor)
    if (quien) cuenta[quien.id].pagado += cent

    const pagadores = pagadoresDe(g.participantes)
    if (pagadores.length === 0) {
      if (quien) cuenta[quien.id].debe += cent
      continue
    }
    for (const [id, parte] of Object.entries(repartir(cent, pagadores))) {
      const h = hogarDe(id)
      if (h) cuenta[h.id].debe += parte
    }
  }

  for (const l of liquidaciones) {
    const cent = Math.round(l.importeCent ?? 0)
    if (!Number.isFinite(cent) || cent <= 0) continue
    if (cuenta[l.de]) cuenta[l.de].pagado += cent
    if (cuenta[l.a]) cuenta[l.a].pagado -= cent
  }

  for (const h of HOGARES) cuenta[h.id].saldo = cuenta[h.id].pagado - cuenta[h.id].debe
  return cuenta
}
