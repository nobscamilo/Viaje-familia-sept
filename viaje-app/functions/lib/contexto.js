/**
 * Lo que el copiloto sabe del viaje antes de que nadie le pregunte nada.
 *
 * Vivia dentro de `index.js`, que paso de 400 lineas el dia que el contexto
 * empezo a incluir las cuentas. No es transporte: es lo que hace que el
 * modelo pueda responder «cuanto debo» sin llamar a ninguna herramienta, y
 * que sepa en que ciudad esta la familia cada dia — sin eso, «Sol» era un bar
 * de Velilla del Rio Carrion.
 */
import { db } from './admin.js'
import { HOGARES, saldos } from './hogares.js'

/** El contexto que ve el modelo. Texto plano: es lo que mejor entiende. */
export async function construirContexto(tripId) {
  const [viajeros, agenda, decisiones, gastos, liquidaciones] = await Promise.all([
    db.collection(`trips/${tripId}/travelers`).get(),
    db.collection(`trips/${tripId}/timeline`).orderBy('start').get(),
    db.collection(`trips/${tripId}/decisions`).get(),
    db.collection(`trips/${tripId}/gastos`).get(),
    db.collection(`trips/${tripId}/liquidaciones`).get(),
  ])

  const gente = viajeros.docs.map((d) => d.data())
  const adultos = gente.filter((t) => t.age >= 18)
  const ninos = gente.filter((t) => t.age < 18)

  /**
   * Que ciudad y a que hora, dia a dia.
   *
   * Es lo que permite que una ruta se calcule desde la ciudad correcta y para
   * el momento correcto. Sin esto, «Sol» era un bar de Velilla del Rio
   * Carrion y el metro se consultaba para esta madrugada.
   */
  const porDia = {}
  for (const d of agenda.docs) {
    const e = d.data()
    const dia = String(e.start ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) continue
    porDia[dia] ??= { ciudad: null, hora: null }
    if (!porDia[dia].ciudad && e.city) porDia[dia].ciudad = e.city
    const hhmm = String(e.start ?? '').slice(11, 16)
    if (!porDia[dia].hora && /^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) porDia[dia].hora = hhmm
  }

  const dias = Object.keys(porDia).sort()
  const hoy = new Date().toISOString().slice(0, 10)
  const diaPorDefecto = dias.find((d) => d >= hoy) ?? dias[dias.length - 1] ?? null

  return {
    porDia,
    diaPorDefecto,
    ciudadPorDefecto: porDia[diaPorDefecto]?.ciudad ?? 'Madrid',
    grupo:
      `${gente.length} viajeros: ${adultos.length} adultos ` +
      `(${adultos.map((a) => `${a.short} ${a.age}`).join(', ')})` +
      (ninos.length
        ? `, y ${ninos.length} ninos: ${ninos.map((n) => `${n.short} de ${n.age} anos`).join(' y ')}.`
        : '.'),

    agenda: agenda.docs.map((d) => {
      const e = d.data()
      const cuando = String(e.start ?? '').slice(0, 16).replace('T', ' ')
      const quien = Array.isArray(e.travelerIds) ? ` [${e.travelerIds.length} personas]` : ''
      const donde = e.city ? ` · ${e.city}` : ''
      return `- ${cuando}${donde} · ${e.title} (${e.status})${quien}${e.venue ? ` · ${e.venue}` : ''}`
    }).join('\n') || '(vacia)',

    decisiones: decisiones.docs
      .map((d) => d.data())
      .filter((x) => !['decidido', 'reservado', 'pagado', 'descartado'].includes(x.status))
      .map((x) => `- [${x.urgency}] ${x.title}`)
      .join('\n') || '(ninguna)',

    /**
     * Las cuentas, para que no haya que explicarselas.
     *
     * Sin esto, «cuanto llevamos gastado» obligaba al copiloto a llamar a
     * `listarGastos` cada vez, y «cuanto debo» no lo sabia responder aunque
     * la respuesta este a un calculo de distancia.
     */
    cuentas: (() => {
      const lista = gastos.docs.map((d) => d.data())
      const cuenta = saldos(lista, liquidaciones.docs.map((d) => d.data()))
      const total = lista.reduce((n, g) => n + (g.importeCent || 0), 0)
      const linea = (h) => {
        const c = cuenta[h.id]
        const eur = (n) => `${(n / 100).toFixed(2).replace('.', ',')} €`
        return `- ${h.nombre}: ha puesto ${eur(c.pagado)}, le toca ${eur(c.debe)}, ` +
          `${c.saldo === 0 ? 'en paz' : c.saldo > 0 ? `le deben ${eur(c.saldo)}` : `debe ${eur(-c.saldo)}`}`
      }
      return `Total gastado: ${(total / 100).toFixed(2).replace('.', ',')} € en ${lista.length} gastos.\n` +
        HOGARES.map(linea).join('\n') +
        '\nCada gasto se reparte entre los ADULTOS que participan; los dos ninos nunca pagan. ' +
        'Julian David esta en el hogar de sus abuelos porque su abuelo cubre sus gastos.'
    })(),
  }
}
