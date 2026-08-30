import { useVotos } from '../hooks/useVotos.js'
import { useTrip } from '../hooks/useTrip.js'
import { esDeOpciones, puedeVotar, recuento, sePuedeCerrar } from '../domain/decisions.js'
import Opciones from './Opciones.jsx'
import './voto.css'

const OPCIONES = [
  { value: 'si', label: 'Sí' },
  { value: 'igual', label: 'Me da igual' },
  { value: 'no', label: 'No' },
]

export default function Voto({ decision }) {
  // Si hay varias opciones, la pregunta no es «¿sí o no?» sino «¿cuál?».
  if (esDeOpciones(decision)) return <Opciones decision={decision} />
  return <VotoSiNo decision={decision} />
}

function VotoSiNo({ decision }) {
  const { travelers, yo, modoLocal } = useTrip()
  const { votos, votar, miVoto } = useVotos(decision.id)

  const r = recuento(decision, travelers, votos)
  const cierre = sePuedeCerrar(decision, travelers, votos)
  const puedo = puedeVotar(yo)

  return (
    <div className="voto">
      <div className="voto-barra" role="img"
        aria-label={`${r.aFavor} a favor, ${r.enContra} en contra, de ${r.total}`}>
        {Array.from({ length: r.total }, (_, i) => {
          const estado = i < r.aFavor ? 'si' : i < r.aFavor + r.enContra ? 'no' : i < r.emitidos ? 'igual' : 'falta'
          return <span key={i} className={`voto-marca voto-${estado}`} />
        })}
      </div>

      <p className="voto-estado">
        {r.emitidos} de {r.total}
        {r.faltan.length > 0 && (
          <span className="voto-faltan"> · falta {r.faltan.map((t) => t.short).join(', ')}</span>
        )}
        {r.completa && <span className={cierre.puede ? 'voto-listo' : 'voto-trabado'}> · {cierre.puede ? 'listo para cerrar' : cierre.motivo}</span>}
      </p>

      {puedo ? (
        <div className="voto-botones" role="group" aria-label="Tu voto">
          {OPCIONES.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`voto-btn ${miVoto === o.value ? 'is-on' : ''} voto-btn-${o.value}`}
              onClick={() => votar(o.value)}
              disabled={modoLocal}
              title={modoLocal ? 'Modo local: sin servidor al que escribir' : undefined}
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="voto-nota">Esta decisión no te toca a ti.</p>
      )}

      {modoLocal && <p className="voto-nota">Modo local: los votos no se guardan todavía.</p>}
    </div>
  )
}
