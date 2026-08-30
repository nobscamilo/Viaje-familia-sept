import { useState } from 'react'
import { etiquetaHogar } from '../data/hogares.js'
import { aCentimos, euros } from '../domain/cuentas.js'
import { borrarLiquidacion, editarLiquidacion } from '../services/cuentas.js'
import './saldado.css'

/**
 * Lo que ya se ha pagado entre subfamilias, y cómo deshacerlo.
 *
 * Faltaba, y era el mismo error que la lista de gastos: las reglas de
 * Firestore dejaban borrar una liquidación desde el primer día y no había
 * ningún botón que lo hiciera. Un «Ya está» pulsado sin querer dejaba el
 * saldo mal para siempre y sin rastro de por qué.
 *
 * Se corrige el importe —un Bizum de 200 que en realidad fueron 180— pero no
 * la dirección: quién le paga a quién lo decide el saldo, no una persona. Si
 * la dirección está mal es que los gastos están mal.
 */
export default function Saldado({ liquidaciones, miHogar, tripId, uid, rol, modoLocal }) {
  if (!liquidaciones?.length) return null

  return (
    <div className="sdo">
      <p className="sdo-titulo">Ya pagado entre vosotros</p>
      <ul className="sdo-list">
        {[...liquidaciones]
          .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))
          .map((l) => (
            <Fila key={l.id} l={l} miHogar={miHogar} tripId={tripId} uid={uid} rol={rol} modoLocal={modoLocal} />
          ))}
      </ul>
    </div>
  )
}

function Fila({ l, miHogar, tripId, uid, rol, modoLocal }) {
  const [abierta, setAbierta] = useState(false)
  const [importe, setImporte] = useState(() => euros(l.importeCent, false))
  const [estado, setEstado] = useState(null)

  // Mismas cerraduras que en Firestore: quien la anotó, o quien organiza.
  const puedo = !modoLocal && (rol === 'owner' || !l.createdBy || l.createdBy === uid)
  const cent = aCentimos(importe)

  const hacer = async (que) => {
    setEstado('trabajando')
    try {
      if (que === 'guardar') {
        if (cent === null || cent <= 0) { setEstado('Eso no es un importe.'); return }
        await editarLiquidacion(tripId, l.id, cent)
      } else {
        await borrarLiquidacion(tripId, l.id)
      }
      setAbierta(false)
      setEstado(null)
    } catch {
      setEstado('No se pudo. Puede que la anotara otra persona.')
    }
  }

  return (
    <li className={`sdo-fila ${abierta ? 'es-abierta' : ''}`}>
      {/* Se abre siempre; lo que se apaga es actuar. Una fila que no se abre
          no se puede ni revisar: ni por quien mira, ni en una captura. */}
      <button type="button" className="sdo-abrir" onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}>
        <span className="sdo-quien">
          {etiquetaHogar(l.de, miHogar)} <span className="sdo-flecha">→</span> {etiquetaHogar(l.a, miHogar)}
        </span>
        <span className="sdo-cuanto">{euros(l.importeCent)}</span>
      </button>

      {abierta && (
        <div className="sdo-editar">
          <label className="sdo-campo">
            <span>Importe</span>
            <input type="text" inputMode="decimal" value={importe} readOnly={!puedo}
              onChange={(e) => setImporte(e.target.value)} aria-label="Importe de la transferencia" />
          </label>
          <div className="sdo-acciones">
            <button type="button" className="sdo-guardar" disabled={!puedo || estado === 'trabajando'}
              onClick={() => hacer('guardar')}>Guardar</button>
            <button type="button" className="sdo-deshacer" disabled={!puedo || estado === 'trabajando'}
              onClick={() => hacer('borrar')}>Deshacer el pago</button>
          </div>
          {!puedo && !modoLocal && (
            <p className="sdo-nota">La anotó otra persona: solo puede tocarla quien la puso o quien organiza.</p>
          )}
          {modoLocal && <p className="sdo-nota">Modo local: no hay servidor al que escribir.</p>}
          {typeof estado === 'string' && estado !== 'trabajando' && <p className="sdo-mal">{estado}</p>}
        </div>
      )}
    </li>
  )
}
