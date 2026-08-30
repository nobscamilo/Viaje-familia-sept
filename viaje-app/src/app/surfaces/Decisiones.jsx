import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { GROUPS } from '../../data/trip-madrid-2026.js'
import { DECISION_DEMO } from '../../data/demo-opciones.js'
import { useTrip } from '../../hooks/useTrip.js'
import { esDeOpciones, ordenar, puedeVotar } from '../../domain/decisions.js'
import Icon from '../../ui/Icon.jsx'
import Avatars from '../../ui/Avatars.jsx'
import Voto from '../../ui/Voto.jsx'
import Estado from '../../ui/Estado.jsx'
import Comentarios from '../../ui/Comentarios.jsx'
import Proponer from '../../ui/Proponer.jsx'
import './decisiones.css'

const URGENCIA = { alta: 'Urgente', media: 'Pendiente', baja: 'Cuando se pueda' }

const FILTROS = [
  { id: 'abiertas', label: 'Abiertas' },
  { id: 'mias', label: 'Me toca' },
  { id: 'alta', label: 'Urgentes' },
  { id: 'cerradas', label: 'Cerradas' },
  { id: 'todas', label: 'Todas' },
]

const CERRADAS = new Set(['decidido', 'reservado', 'pagado', 'descartado'])

export default function Decisiones() {
  const { decisions: reales, travelers, yo, modoLocal } = useTrip()
  const [filtro, setFiltro] = useState('abiertas')

  // `?demo` añade una decisión de opciones de mentira. Es la única forma de
  // revisar esta pantalla sin dejar basura en el viaje de la familia.
  const conDemo = typeof window !== 'undefined' && window.location.search.includes('demo')
  const decisions = useMemo(
    () => (conDemo ? [DECISION_DEMO, ...reales] : reales),
    [conDemo, reales],
  )
  const [proponiendo, setProponiendo] = useState(false)

  /**
   * Venir desde la agenda: /decisiones#dec-<id>.
   *
   * Con el filtro puesto en «Abiertas» se podia llegar a una decision que el
   * filtro escondia y ver la pantalla vacia, que es peor que no enlazar. Al
   * entrar por un ancla se abre «Todas» y punto.
   */
  const { hash } = useLocation()
  const buscada = hash.startsWith('#dec-') ? hash.slice(5) : null
  useEffect(() => { if (buscada) setFiltro('todas') }, [buscada])

  const visibles = useMemo(() => {
    const filtradas = decisions.filter((d) => {
      const cerrada = CERRADAS.has(d.status ?? 'propuesto')
      if (filtro === 'todas') return true
      if (filtro === 'cerradas') return cerrada
      if (filtro === 'abiertas') return !cerrada
      if (filtro === 'alta') return !cerrada && d.urgency === 'alta'
      if (filtro === 'mias') {
        if (!yo || cerrada) return false
        const ids = Object.values(GROUPS).find((g) => g.id === d.groupId)?.travelerIds
        return ids === 'all' || !ids || ids.includes(yo.id)
      }
      return true
    })
    return ordenar(filtradas, travelers)
  }, [decisions, travelers, filtro, yo])

  const abiertas = decisions.filter((d) => !CERRADAS.has(d.status ?? 'propuesto'))
  const urgentes = abiertas.filter((d) => d.urgency === 'alta').length

  return (
    <div className="dec">
      {/* Una linea, no un bloque. El «9» de dos centimetros que habia aqui
          ocupaba pantalla y no cambiaba ninguna decision. */}
      <p className="dec-hero">
        <strong>{abiertas.length} decisiones</strong> sin cerrar
        {urgentes > 0 && <> · <em>{urgentes} bloquean a otras personas</em></>}
      </p>

      <div className="dec-barra">
        <div className="dec-filters" role="tablist" aria-label="Filtrar decisiones">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              className={`dec-filter ${filtro === f.id ? 'is-on' : ''}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="dec-proponer"
          onClick={() => setProponiendo(true)}
          disabled={modoLocal || !puedeVotar(yo)}
          title={modoLocal ? 'Modo local' : undefined}
        >
          + Proponer
        </button>
      </div>

      <ul className="dec-list">
        {visibles.map((d) => <Tarjeta key={d.id} decision={d} destacada={d.id === buscada} />)}
      </ul>

      {visibles.length === 0 && (
        <p className="dec-empty">
          {filtro === 'abiertas' ? 'Nada pendiente. Buena señal.' : 'Nada en este filtro.'}
        </p>
      )}

      {proponiendo && <Proponer alCerrar={() => setProponiendo(false)} />}
    </div>
  )
}

function Tarjeta({ decision, destacada = false }) {
  const { timeline } = useTrip()
  const [abierta, setAbierta] = useState(false)
  const caja = useRef(null)

  // Llevar el ojo hasta ella. Sin esto, el enlace desde la agenda deja a la
  // persona en la lista completa buscando cual de las nueve era.
  useEffect(() => {
    if (destacada) caja.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [destacada])

  const estado = decision.status ?? 'propuesto'
  const grupo = Object.values(GROUPS).find((g) => g.id === decision.groupId)
  const bloqueados = (decision.blocks ?? [])
    .map((id) => timeline.find((e) => e.id === id))
    .filter(Boolean)

  return (
    <li
      ref={caja}
      id={`dec-${decision.id}`}
      className={`dec-card dec-${decision.urgency} ${CERRADAS.has(estado) ? 'dec-cerrada' : ''} ${destacada ? 'es-destacada' : ''}`}
    >
      <header className="dec-card-head">
        {/* Un punto, no la palabra URGENTE cuatro veces seguidas. Si todo
            grita, no se oye nada; el color ya lo dice y ocupa un pixel. */}
        <span className="dec-urg" title={URGENCIA[decision.urgency] ?? decision.urgency}>
          <i className="dec-punto" aria-hidden="true" />
          <span className="dec-urg-txt">{URGENCIA[decision.urgency] ?? decision.urgency}</span>
        </span>
        {grupo && <Avatars travelerIds={grupo.travelerIds} />}
      </header>

      <h3 className="dec-title">{decision.title}</h3>
      {decision.why && (
        <p className={`dec-why ${abierta ? '' : 'es-corto'}`}>{decision.why}</p>
      )}

      {bloqueados.length > 0 && (
        <p className="dec-blocks">
          {bloqueados.map((e) => (
            <span key={e.id} className={`dec-chip dec-chip-${e.kind}`}>{e.title}</span>
          ))}
        </p>
      )}

      <Estado decision={decision} />

      {(estado === 'votando' || (estado === 'propuesto' && esDeOpciones(decision))) && (
        <Voto decision={decision} />
      )}

      <button
        type="button"
        className="dec-mas"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
      >
        {abierta ? 'Ocultar la conversación' : 'Comentar'}
      </button>

      {abierta && <Comentarios decisionId={decision.id} abierto={abierta} />}
    </li>
  )
}
