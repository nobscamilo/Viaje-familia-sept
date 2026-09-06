import { useState } from 'react'
import { CATEGORIAS, hogarDe } from '../../data/hogares.js'
import { useTrip } from '../../hooks/useTrip.js'
import { useCuentas } from '../../hooks/useCuentas.js'
import { euros, plural } from '../../domain/cuentas.js'
import { formatDayLong } from '../../domain/dates.js'
import NuevoGasto from '../../ui/NuevoGasto.jsx'
import Saldo from '../../ui/Saldo.jsx'
import Saldado from '../../ui/Saldado.jsx'
import './cuentas.css'

const CAT_LABEL = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.label]))

/**
 * Las cuentas del viaje.
 *
 * Nueve personas, tres bolsillos. Cada gasto se divide entre los ADULTOS que
 * participan —los niños consumen pero su parte la ponen los siete— y la deuda
 * se salda entre subfamilias, porque nadie le va a pedir tres euros sueltos a
 * su madre.
 *
 * Lo primero que se ve es lo único que la gente quiere saber: cuánto debo o
 * cuánto me deben. El detalle va debajo.
 */
export default function Cuentas() {
  const { yo, user, rol, tripId, modoLocal } = useTrip()
  const { gastos, liquidaciones: reales, cuenta, pagos, totalCent, categorias } = useCuentas()

  /**
   * `?demo` añade una transferencia de mentira para poder ver «Ya pagado»
   * sin haber saldado nada. Mismo truco que en Decisiones, y por lo mismo:
   * una pantalla que solo aparece cuando ya ha pasado algo es una pantalla
   * que nadie revisa hasta que es tarde.
   */
  const conDemo = typeof window !== 'undefined' && window.location.search.includes('demo')
  const liquidaciones = conDemo
    ? [{ id: 'demo', de: 'hermana', a: 'padres', importeCent: 50000, fecha: '2026-09-12' }, ...reales]
    : reales
  // `?anotar` abre la hoja al cargar. Es la unica forma de capturar el
  // formulario para revisarlo, igual que `?hoy=` para la agenda: sin esto,
  // la pantalla que mas se va a usar en el viaje no se puede mirar sin
  // tocarla a mano en un movil.
  const [editando, setEditando] = useState(null)
  const [anotando, setAnotando] = useState(
    () => typeof window !== 'undefined' && window.location.search.includes('anotar'),
  )
  const [verTodo, setVerTodo] = useState(false)

  const miHogar = hogarDe(yo?.id)?.id ?? null

  // 12 y no 8: con nueve reservas sembradas, cortar en 8 escondía una sola
  // y obligaba a un toque para ver un gasto. Un botón que revela un elemento
  // es un botón que sobra.
  const visibles = verTodo ? gastos : gastos.slice(0, 12)

  return (
    <div className="ctas">
      <Saldo cuenta={cuenta} pagos={pagos} miHogar={miHogar} />

      <Saldado
        liquidaciones={liquidaciones}
        miHogar={miHogar}
        tripId={tripId}
        uid={user?.uid}
        rol={rol}
        modoLocal={modoLocal}
      />

      <p className="ctas-total">
        <strong>{euros(totalCent)}</strong> en {plural(gastos.length, 'gasto', 'gastos')}
        {categorias.length > 0 && (
          <span className="ctas-cats">
            {categorias.map((c) => (
              <span key={c.categoria} className="ctas-cat">
                {CAT_LABEL[c.categoria] ?? c.categoria} <b>{euros(c.cent)}</b>
              </span>
            ))}
          </span>
        )}
      </p>

      <button
        type="button"
        className="ctas-nuevo"
        onClick={() => setAnotando(true)}
        disabled={!miHogar}
        title={miHogar ? undefined : 'Entra al viaje para anotar gastos'}
      >
        + Anotar un gasto
      </button>

      <ul className="ctas-list">
        {visibles.map((g) => (
          <Gasto key={g.id} gasto={g} miHogar={miHogar} alTocar={() => setEditando(g)} />
        ))}
      </ul>

      {gastos.length > visibles.length && (
        <button type="button" className="ctas-mas" onClick={() => setVerTodo(true)}>
          Ver {plural(gastos.length - visibles.length, 'gasto más', 'gastos más')}
        </button>
      )}

      {gastos.length === 0 && <p className="ctas-vacio">Todavía no hay ningún gasto.</p>}

      {anotando && <NuevoGasto alCerrar={() => setAnotando(false)} />}
      {editando && <NuevoGasto gasto={editando} alCerrar={() => setEditando(null)} />}
    </div>
  )
}

function Gasto({ gasto, miHogar, alTocar }) {
  const { travelers } = useTrip()
  const pagador = travelers.find((t) => t.id === gasto.pagadoPor)
  const hogar = hogarDe(gasto.pagadoPor)
  const mio = hogar?.id === miHogar

  const quienes = gasto.participantes === 'all' || !gasto.participantes
    ? 'los nueve'
    : Array.isArray(gasto.participantes)
      ? gasto.participantes.map((id) => travelers.find((t) => t.id === id)?.short ?? id).join(' y ')
      : gasto.participantes === 'f1' ? 'el grupo de F1' : 'el grupo sin F1'

  return (
    /* La fila entera abre el gasto. Antes era papel pintado: se podía anotar
       un gasto y no había forma de corregir un cero de más. El borrado existía
       en el servidor y en las reglas desde el primer día, sin ningún botón que
       lo llamara — la mitad invisible de una función es una función que no
       está. */
    <li className={`ctas-g ${mio ? 'es-mio' : ''}`}>
      <span className="ctas-g-barra" style={hogar ? { background: hogar.color } : undefined} />
      <button type="button" className="ctas-g-abrir" onClick={alTocar}
        aria-label={`Abrir ${gasto.concepto}`}>
      <span className="ctas-g-txt">
        <span className="ctas-g-concepto">{gasto.concepto}</span>
        <span className="ctas-g-meta">
          {pagador?.short ?? '—'} · {quienes}
          {gasto.fecha && <> · {formatDayLong(gasto.fecha).replace(/^\w+ /, '')}</>}
        </span>
        {gasto.copCent > 0 && (
          // Con la tasa al lado: sin ella, dentro de tres meses nadie sabría
          // por qué 200.000 pesos son estos euros y no otros.
          <span className="ctas-g-cop">
            {(gasto.copCent / 100).toLocaleString('es-CO')} COP
            {gasto.tasaCopPorEur && <> · a {Math.round(gasto.tasaCopPorEur).toLocaleString('es-ES')} por euro</>}
          </span>
        )}
        {/* La nota dice DE DÓNDE sale el número («Mastercard a nombre de
            Guillermo Julián»): es procedencia, y va en gris. El aviso es otra
            cosa —algo que hay que mirar— y ese sí va en naranja. Tres notas
            de procedencia en naranja convertían la lista en una alarma. */}
        {gasto.nota && <span className="ctas-g-nota">{gasto.nota}</span>}
        {gasto.aviso && <span className="ctas-g-aviso">{gasto.aviso}</span>}
      </span>
      <span className="ctas-g-importe">{euros(gasto.importeCent)}</span>
      </button>
    </li>
  )
}
