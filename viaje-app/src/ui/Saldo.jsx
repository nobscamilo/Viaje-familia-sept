import { useState } from 'react'
import { HOGARES, etiquetaHogar } from '../data/hogares.js'
import { euros } from '../domain/cuentas.js'
import { diaDelViaje } from '../domain/dates.js'
import { anotarLiquidacion } from '../services/cuentas.js'
import { useTrip } from '../hooks/useTrip.js'
import './saldo.css'

/**
 * Lo único que la gente quiere saber: cuánto debo, o cuánto me deben.
 *
 * Va arriba del todo y sin rodeos. Debajo, las transferencias concretas —«los
 * de la hermana le pasan 2.644,42 € a los papás»— porque un saldo no se
 * arregla solo: alguien tiene que hacer un Bizum, y hay que decirle a quién y
 * cuánto. Con tres subfamilias salen como mucho dos transferencias.
 */
export default function Saldo({ cuenta, pagos, miHogar }) {
  const mio = miHogar ? cuenta[miHogar] : null

  return (
    <section className="sal">
      {mio && (
        <p className={`sal-mio ${mio.saldo > 0 ? 'es-acreedor' : mio.saldo < 0 ? 'es-deudor' : ''}`}>
          {mio.saldo === 0
            ? <>Estáis <strong>en paz</strong>.</>
            : mio.saldo > 0
              ? <>Os deben <strong>{euros(mio.saldo)}</strong></>
              : <>Debéis <strong>{euros(-mio.saldo)}</strong></>}
        </p>
      )}

      <ul className="sal-hogares">
        {HOGARES.map((h) => {
          const c = cuenta[h.id] ?? { pagado: 0, debe: 0, saldo: 0 }
          return (
            <li key={h.id} className={`sal-h ${h.id === miHogar ? 'es-mio' : ''}`}>
              <span className="sal-h-punto" style={{ background: h.color }} aria-hidden="true" />
              <span className="sal-h-nombre">{etiquetaHogar(h.id, miHogar)}</span>
              <span className="sal-h-puso">puso {euros(c.pagado)}</span>
              <span className={`sal-h-saldo ${c.saldo > 0 ? 'es-mas' : c.saldo < 0 ? 'es-menos' : ''}`}>
                {c.saldo === 0 ? '—' : `${c.saldo > 0 ? '+' : '−'}${euros(Math.abs(c.saldo), false)}`}
              </span>
            </li>
          )
        })}
      </ul>

      {pagos.length > 0 && (
        <ul className="sal-pagos">
          {pagos.map((p) => <Pago key={`${p.de}-${p.a}`} pago={p} miHogar={miHogar} />)}
        </ul>
      )}
    </section>
  )
}

/**
 * Una transferencia pendiente, y el botón para decir que ya se hizo.
 *
 * Sin esto las cuentas no cierran nunca: el día que la familia de la hermana
 * le pase los 2.644,42 € al padre, la app seguiría diciendo que los debe, y a
 * la tercera vez que eso pase nadie vuelve a abrirla.
 *
 * Se anota el importe EXACTO que propone la app, no lo que uno teclee. Si la
 * transferencia real fue distinta —redondearon, pagaron a medias— se anota
 * este pago y luego se corrige; teclear a mano aquí es la vía rápida a un
 * saldo que no cuadra con nada.
 */
function Pago({ pago, miHogar }) {
  const { tripId, user, modoLocal } = useTrip()
  const [estado, setEstado] = useState(null)

  const marcar = async () => {
    setEstado('guardando')
    try {
      await anotarLiquidacion(tripId, {
        de: pago.de,
        a: pago.a,
        importeCent: pago.importeCent,
        fecha: diaDelViaje(),
      }, user?.uid)
      // No hace falta tocar nada más: el `onSnapshot` de las liquidaciones
      // recalcula el saldo y esta fila desaparece sola.
    } catch {
      setEstado('No se pudo. Inténtalo otra vez.')
    }
  }

  return (
    <li className="sal-pago">
      {/* Los nombres por un lado y el par «importe + botón» por otro. En un
          iPhone SE la fila no cabe entera, y con todo suelto el botón caía
          solo a la línea de abajo, huérfano y a la izquierda. Agrupados,
          bajan los dos juntos y alineados a la derecha. */}
      <span className="sal-pago-quien">
        <strong>{etiquetaHogar(pago.de, miHogar)}</strong>
        <span className="sal-flecha" aria-label="paga a">→</span>
        <strong>{etiquetaHogar(pago.a, miHogar)}</strong>
      </span>
      <span className="sal-pago-fin">
      <span className="sal-cuanto">{euros(pago.importeCent)}</span>
      <button
        type="button"
        className="sal-hecho"
        onClick={marcar}
        disabled={modoLocal || estado === 'guardando'}
        title={modoLocal ? 'Modo local: no hay servidor al que escribir' : 'Marcar esta transferencia como hecha'}
      >
        {estado === 'guardando' ? '…' : 'Ya está'}
      </button>
      </span>
      {typeof estado === 'string' && estado !== 'guardando' && (
        <span className="sal-fallo">{estado}</span>
      )}
    </li>
  )
}
