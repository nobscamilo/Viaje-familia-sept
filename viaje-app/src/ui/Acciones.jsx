import { useState } from 'react'
import { useNavigate } from 'react-router'
import { GROUPS } from '../data/trip-madrid-2026.js'
import { useTrip } from '../hooks/useTrip.js'
import { useVotos } from '../hooks/useVotos.js'
import { accionesDe } from '../domain/acciones.js'
import { puedeVotar, recuento, sePuedeCerrar } from '../domain/decisions.js'
import { cambiarEstadoPlan } from '../services/tripRepo.js'
import { motivoPlan, quitarPlan, quitarRuta } from '../services/planes.js'
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
 * 15 estaba ahi, en gris, marcado «propuesto», y no habia nada que tocar. Ni
 * decir que si, ni quitarlo, ni saber quien mas lo queria.
 *
 * Lo que NO hace, a proposito: no pone botones de voto en las reservas. El
 * Vueling a Orly esta pagado; «descartar» encima de 431,91 € seria una trampa,
 * no una funcion. Quien decide que hay en cada tarjeta es `accionesDe`, que es
 * puro y esta probado.
 */
export default function Acciones({ evento, hoy = null }) {
  const { tripId, decisions, travelers, yo, user, rol, modoLocal } = useTrip()
  const navegar = useNavigate()

  const acciones = accionesDe(evento, {
    decisiones: decisions,
    uid: user?.uid,
    esOwner: rol === 'owner',
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
        <VotoDelPlan
          evento={evento}
          travelers={travelers}
          yo={yo}
          modoLocal={modoLocal}
          acciones={acciones}
          tripId={tripId}
          uid={user?.uid}
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
function VotoDelPlan({ evento, travelers, yo, modoLocal, acciones, tripId, uid }) {
  const { votos, votar, miVoto } = useVotos(evento.id, 'timeline')
  const [trabajando, setTrabajando] = useState(null)
  const [fallo, setFallo] = useState(null)

  // Un plan del grupo de F1 lo deciden los tres del circuito, no los nueve.
  const grupo = Object.values(GROUPS).find((g) => g.id === evento.groupId)
  const comoDecision = { id: evento.id, travelerIds: grupo?.travelerIds }

  const r = recuento(comoDecision, travelers, votos)
  const cierre = sePuedeCerrar(comoDecision, travelers, votos)
  const puedo = puedeVotar(yo) && !modoLocal

  const confirmar = acciones.find((a) => a.id === 'confirmar')
  const quitar = acciones.find((a) => a.id === 'quitar')
  const editar = acciones.find((a) => a.id === 'editar')
  const laRuta = acciones.find((a) => a.id === 'quitar-ruta')
  const [editando, setEditando] = useState(false)

  const hacer = async (que) => {
    setTrabajando(que)
    setFallo(null)
    try {
      if (que === 'confirmar') await cambiarEstadoPlan(tripId, evento.id, { status: 'confirmado', uid })
      if (que === 'quitar') await quitarPlan(tripId, evento.id)
      if (que === 'ruta') {
        const r = await quitarRuta(tripId, laRuta.rutaId)
        // Lo que ya se confirmo no se borra, y hay que decirlo: si no,
        // desaparecen cuatro paradas de seis y parece que fallo a medias.
        if (r?.intocables > 0) {
          setFallo(`Quité ${r.borradas}; ${r.intocables} ya estaban confirmadas y las dejo.`)
        }
      }
    } catch (e) {
      setFallo(motivoPlan(e))
    }
    setTrabajando(null)
  }

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

      {editando && (
        <EditarPlan evento={evento} tripId={tripId} alCerrar={() => setEditando(false)} />
      )}

      {(confirmar || quitar || editar) && !modoLocal && !editando && (
        <div className="acc-cierre">
          {confirmar && (
            <button type="button" className="acc-cerrar" disabled={Boolean(trabajando)}
              onClick={() => hacer('confirmar')}>
              {trabajando === 'confirmar' ? 'Un momento…' : 'Confirmar'}
            </button>
          )}
          {editar && (
            <button type="button" className="acc-editar" onClick={() => setEditando(true)}>
              Editar
            </button>
          )}
          {quitar && (
            <button type="button" className="acc-quitar" disabled={Boolean(trabajando)}
              onClick={() => hacer('quitar')}>
              {trabajando === 'quitar' ? 'Un momento…' : 'Quitar'}
            </button>
          )}
          {/* Quitar la ruta entera va aparte y en ultimo lugar: se lleva por
              delante hasta seis momentos y no puede compartir sitio con el
              boton que quita solo este. */}
          {laRuta && (
            <button type="button" className="acc-quitar-ruta" disabled={Boolean(trabajando)}
              onClick={() => hacer('ruta')}>
              {trabajando === 'ruta' ? 'Un momento…' : 'Quitar la ruta entera'}
            </button>
          )}
        </div>
      )}

      {fallo && <p className="acc-fallo">{fallo}</p>}
    </div>
  )
}
