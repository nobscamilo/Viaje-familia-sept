import { useState } from 'react'
import { useTrip } from '../hooks/useTrip.js'
import { cambiarEstado } from '../services/tripRepo.js'
import {
  ESTADO_LABEL, puedeCerrar, puedeTransicionar, recuento, sePuedeCerrar,
} from '../domain/decisions.js'
import './estado.css'

/** Qué botones tiene sentido ofrecer desde cada estado. */
const SIGUIENTES = {
  propuesto: [['votando', 'Abrir votación'], ['descartado', 'Descartar']],
  votando: [['decidido', 'Cerrar: adelante'], ['descartado', 'Descartar']],
  decidido: [['reservado', 'Ya está reservado'], ['descartado', 'Descartar']],
  reservado: [['pagado', 'Ya está pagado']],
  pagado: [],
  descartado: [['propuesto', 'Reabrir']],
}

export default function Estado({ decision }) {
  const { tripId, travelers, yo, user, modoLocal } = useTrip()
  const [trabajando, setTrabajando] = useState(null)
  const [fallo, setFallo] = useState(null)

  const estado = decision.status ?? 'propuesto'
  const soyResponsable = puedeCerrar(yo)

  const mover = async (destino) => {
    if (!puedeTransicionar(estado, destino)) return
    setTrabajando(destino)
    setFallo(null)
    try {
      await cambiarEstado(tripId, decision.id, { status: destino, uid: user.uid })
    } catch {
      setFallo('No se pudo. Solo quien organiza el viaje puede mover el estado.')
    }
    setTrabajando(null)
  }

  return (
    <div className="est">
      <div className="est-fila">
        <span className={`est-pill est-${estado}`}>{ESTADO_LABEL[estado] ?? estado}</span>
        {estado === 'votando' && <Aviso decision={decision} travelers={travelers} />}
      </div>

      {soyResponsable && !modoLocal && SIGUIENTES[estado]?.length > 0 && (
        <div className="est-acciones">
          {SIGUIENTES[estado].map(([destino, etiqueta]) => (
            <button
              key={destino}
              type="button"
              className={`est-btn ${destino === 'descartado' ? 'est-btn-suave' : ''}`}
              onClick={() => mover(destino)}
              disabled={Boolean(trabajando)}
            >
              {trabajando === destino ? 'Un momento…' : etiqueta}
            </button>
          ))}
        </div>
      )}

      {fallo && <p className="est-fallo">{fallo}</p>}
    </div>
  )
}

/** Durante la votación, decir si ya se puede cerrar y por qué no. */
function Aviso({ decision, travelers }) {
  const r = recuento(decision, travelers, decision.votos ?? {})
  const cierre = sePuedeCerrar(decision, travelers, decision.votos ?? {})
  if (r.total === 0) return null
  return (
    <span className={cierre.puede ? 'est-nota est-ok' : 'est-nota'}>
      {cierre.puede ? 'Listo para cerrar' : cierre.motivo}
    </span>
  )
}
