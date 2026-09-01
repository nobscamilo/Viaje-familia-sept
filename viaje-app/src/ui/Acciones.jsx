import { useState } from 'react'
import { useNavigate } from 'react-router'
import { GROUPS } from '../data/trip-madrid-2026.js'
import { useTrip } from '../hooks/useTrip.js'
import { useVotos } from '../hooks/useVotos.js'
import { accionesDe } from '../domain/acciones.js'
import { puedeVotar, recuento, sePuedeCerrar } from '../domain/decisions.js'
import Cierre from './Cierre.jsx'
import EditarPlan from './EditarPlan.jsx'
import Icon from './Icon.jsx'
import './acciones.css'

const VOTO = [
  { value: 'si', label: 'Sí' },
  { value: 'igual', label: 'Igual' },
  { value: 'no', label: 'No' },
]

/**
 * Lo que se puede hacer con un momento, dentro de su propia tarjeta.
 *
 * Antes la agenda era un cartel: el plan del Camp Nou que el copiloto dejo el
 * 15 estaba ahi, en gris, marcado «propuesto», y no habia nada que tocar.
 *
 * Y despues fue un cartel a medias: se podia tocar mientras estuviera
 * propuesto, pero confirmarlo lo congelaba. Los botones de cierre vivian
 * DENTRO del bloque de votacion, asi que desaparecian con ella. Ahora `Cierre`
 * es un componente aparte y se pinta haya voto o no.
 *
 * Quien decide que botones salen sigue siendo `accionesDe`, que es puro y
 * esta probado. Aqui no se razona sobre estados ni sobre reservas.
 */
export default function Acciones({ evento, hoy = null }) {
  const { tripId, decisions, travelers, yo, user, rol, modoLocal } = useTrip()
  const navegar = useNavigate()
  const [editando, setEditando] = useState(false)

  const acciones = accionesDe(evento, {
    decisiones: decisions,
    uid: user?.uid,
    esOwner: rol === 'owner',
    esAdulto: rol === 'owner' || rol === 'adult',
    hoy,
  })
  if (acciones.length === 0) return null

  const porDecidir = acciones.filter((a) => a.tipo === 'decision')
  const hayVoto = acciones.some((a) => a.tipo === 'voto')
  const mapa = acciones.find((a) => a.tipo === 'enlace')

  return (
    <div className="acc">
      {porDecidir.length > 0 && (
        <div className="acc-decs">
          {porDecidir.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`acc-dec acc-dec-${a.urgencia}`}
              onClick={() => navegar(`/decisiones#dec-${a.decisionId}`)}
            >
              <Icon name="alert" size={13} />
              <span className="acc-dec-txt">{a.etiqueta}</span>
              <span className="acc-dec-ir" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      )}

      {hayVoto && (
        <VotoDelPlan evento={evento} travelers={travelers} yo={yo} modoLocal={modoLocal} />
      )}

      {editando && (
        <EditarPlan evento={evento} tripId={tripId} alCerrar={() => setEditando(false)} />
      )}

      {/* En modo local no hay servidor al que pedirle nada: ensenar botones
          que van a fallar es peor que no ensenarlos. */}
      {!modoLocal && (
        <Cierre
          evento={evento}
          acciones={acciones}
          tripId={tripId}
          uid={user?.uid}
          editando={editando}
          alEditar={setEditando}
        />
      )}

      {mapa && (
        <a className="acc-mapa" href={mapa.url} target="_blank" rel="noreferrer">
          {mapa.etiqueta}
        </a>
      )}
    </div>
  )
}

/**
 * El voto de un plan propuesto.
 *
 * Reusa el mismo recuento que las decisiones: mismo electorado, mismos ninos
 * fuera, mismo «falta Cielo». Lo unico distinto es de que rama de Firestore
 * cuelgan los votos, y eso lo resuelve `useVotos(id, 'timeline')`.
 */
function VotoDelPlan({ evento, travelers, yo, modoLocal }) {
  const { votos, votar, miVoto } = useVotos(evento.id, 'timeline')

  // Un plan del grupo de F1 lo deciden los tres del circuito, no los nueve.
  const grupo = Object.values(GROUPS).find((g) => g.id === evento.groupId)
  const comoDecision = { id: evento.id, travelerIds: grupo?.travelerIds }

  const r = recuento(comoDecision, travelers, votos)
  const cierre = sePuedeCerrar(comoDecision, travelers, votos)
  const puedo = puedeVotar(yo) && !modoLocal

  return (
    <div className="acc-voto">
      <div className="acc-marcas" role="img"
        aria-label={`${r.aFavor} a favor, ${r.enContra} en contra, de ${r.total}`}>
        {Array.from({ length: r.total }, (_, i) => {
          const estado = i < r.aFavor ? 'si'
            : i < r.aFavor + r.enContra ? 'no'
              : i < r.emitidos ? 'igual' : 'falta'
          return <span key={i} className={`acc-marca acc-m-${estado}`} />
        })}
        <span className="acc-cuenta">
          {r.emitidos === 0
            ? 'Nadie ha dicho nada'
            : r.completa
              ? cierre.puede ? 'Listo' : cierre.motivo
              : `${r.emitidos} de ${r.total}`}
        </span>
      </div>

      {puedo && (
        <div className="acc-btns" role="group" aria-label="Tu voto">
          {VOTO.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`acc-btn acc-v-${o.value} ${miVoto === o.value ? 'is-on' : ''}`}
              onClick={() => votar(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
