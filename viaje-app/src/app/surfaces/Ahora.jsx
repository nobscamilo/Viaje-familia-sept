import { useState } from 'react'
import { TRIP } from '../../data/trip-madrid-2026.js'
import { useTrip } from '../../hooks/useTrip.js'
import { useAhora } from '../../hooks/useAhora.js'
import { FASES, estadoDeEvento, faseDelViaje, loQueSigue } from '../../domain/agenda.js'
import { daysUntil, formatDayLong, formatTime, groupByDay, mismoDia, noches } from '../../domain/dates.js'
import { diaDelViaje } from '../../domain/dates.js'
import Icon from '../../ui/Icon.jsx'
import Avatars from '../../ui/Avatars.jsx'
import Proximo from '../../ui/Proximo.jsx'
import Acciones from '../../ui/Acciones.jsx'
import './ahora.css'

const KIND = {
  flight: { icon: 'flight', label: 'Vuelo' },
  lodging: { icon: 'lodging', label: 'Alojamiento' },
  f1: { icon: 'f1', label: 'Circuito' },
  activity: { icon: 'activity', label: 'Plan' },
  food: { icon: 'activity', label: 'Comida' },
  transport: { icon: 'transport', label: 'Traslado' },
}

export default function Ahora() {
  const { timeline } = useTrip()
  const { ahora, simulado } = useAhora()
  const [verPasado, setVerPasado] = useState(false)

  const fase = faseDelViaje(TRIP, ahora)
  const enViaje = fase === FASES.DURANTE
  const hoy = diaDelViaje(ahora)

  const dias = groupByDay(timeline)
  const pasados = dias.filter((d) => d.day < hoy)
  const porVenir = dias.filter((d) => d.day >= hoy)
  const visibles = enViaje && !verPasado ? porVenir : dias

  return (
    <div className="ahora">
      {simulado && (
        <p className="ahora-simulado">
          Vista previa del {formatDayLong(hoy)}. Quita <code>?hoy=</code> de la dirección para volver al día real.
        </p>
      )}

      {enViaje
        ? <Proximo {...loQueSigue(timeline, ahora)} ahora={ahora} />
        : <Hero timeline={timeline} fase={fase} />}

      {enViaje && pasados.length > 0 && (
        <button type="button" className="ahora-pasado" onClick={() => setVerPasado((v) => !v)}>
          {verPasado
            ? 'Ocultar lo que ya pasó'
            : pasados.length === 1
              ? 'Ver el día que ya pasó'
              : `Ver los ${pasados.length} días que ya pasaron`}
        </button>
      )}

      <ol className="tl">
        {visibles.map(({ day, items }) => (
          <li key={day} className={`tl-day ${day === hoy ? 'es-hoy' : ''} ${day < hoy ? 'es-pasado' : ''}`}>
            <h2 className="tl-day-head">
              <span className="tl-day-name">
                {day === hoy && enViaje ? 'Hoy · ' : ''}{formatDayLong(day)}
              </span>
              <span className="tl-day-count">{items.length}</span>
            </h2>
            <ol className="tl-events">
              {items.map((ev) => (
                <EventRow key={ev.id} event={ev} ahora={ahora} enViaje={enViaje} hoy={enViaje ? hoy : null} />
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * Antes del viaje, una sola linea.
 *
 * Aqui habia un «14» de dos centimetros que ocupaba un sexto de la pantalla y
 * no cambiaba ninguna decision. El espacio de arriba es el mas caro de la app:
 * lo gana la agenda, no un contador.
 */
function Hero({ timeline, fase }) {
  const faltan = daysUntil(TRIP.startDate)
  const pendientes = timeline.filter((e) => e.status !== 'confirmado').length

  if (fase === FASES.DESPUES) {
    return <p className="hero"><strong>Se acabó.</strong> Catorce días, {timeline.length} momentos.</p>
  }

  return (
    <p className="hero">
      <strong>Faltan {faltan} días.</strong> {timeline.length} momentos
      {pendientes > 0 && <> · <em>{pendientes} sin cerrar</em></>}
    </p>
  )
}

function cuando(event) {
  const inicio = formatTime(event.start)
  const fin = formatTime(event.end)
  if (!inicio) return { principal: 'Sin hora', secundario: null }
  if (event.horaEs === 'llegada') return { principal: `llega ${inicio}`, secundario: null }
  if (!event.end || !fin) return { principal: inicio, secundario: null }
  if (mismoDia(event.start, event.end)) return { principal: `${inicio}–${fin}`, secundario: null }

  const n = noches(event.start, event.end)
  return {
    principal: inicio,
    secundario: `hasta ${formatDayLong(event.end).replace(/ de \w+$/, '')} · ${fin}` +
      (n ? ` · ${n} ${n === 1 ? 'noche' : 'noches'}` : ''),
  }
}

/**
 * Una fila de la agenda.
 *
 * Compacta por defecto y se abre al tocarla. Antes lo enseñaba TODO siempre:
 * la tarjeta del apartamento de Madrid ocupaba una pantalla entera de movil
 * con notas, tres tareas y dos etiquetas. Nadie lee eso de pie en Barajas.
 *
 * Lo que nunca se pliega es el aviso: un evento que avisa de algo lo avisa
 * aunque no lo abras. Esconderlo detras de un toque seria como no ponerlo.
 */
function EventRow({ event, ahora, enViaje, hoy }) {
  const kind = KIND[event.kind] ?? KIND.activity
  const { principal, secundario } = cuando(event)
  const estado = enViaje ? estadoDeEvento(event, ahora) : null
  const [abierto, setAbierto] = useState(false)

  const hayDetalle = Boolean(event.notes || event.sessions || event.todos?.length)

  return (
    <li className={`ev ev-${event.status} ev-kind-${event.kind} ${estado ? `ev-t-${estado}` : ''} ${abierto ? 'es-abierto' : ''}`}>
      <div className="ev-dot" aria-hidden="true"><Icon name={kind.icon} size={14} /></div>

      <div className="ev-card">
        <header className="ev-head">
          <span className="ev-when">{principal}</span>
          {secundario && <span className="ev-hasta">{secundario}</span>}
          <Avatars travelerIds={event.travelerIds} />
        </header>

        <h3 className="ev-title">{event.title}</h3>

        {(event.address || event.venue) && (
          <p className="ev-sub"><span className="ev-addr">{event.address ?? event.venue}</span></p>
        )}

        <footer className="ev-foot">
          {estado === 'enCurso' && <Tag tone="curso">Ahora</Tag>}
          {event.status !== 'confirmado' && <Tag tone={event.status}>{event.status}</Tag>}
          {event.refundable === false && <Tag tone="danger">No reembolsable</Tag>}
          {event.locator && <Tag mono>{event.locator}</Tag>}
          {event.confirmation && !event.locator && <Tag mono>#{event.confirmation}</Tag>}
        </footer>

        {event.warning && (
          <p className="ev-warn"><Icon name="alert" size={15} /><span>{event.warning}</span></p>
        )}

        {abierto && (
          <>
            {event.sessions && <Sessions sessions={event.sessions} />}
            {event.notes && <p className="ev-note">{event.notes}</p>}
            {event.todos?.length > 0 && (
              <ul className="ev-todos">{event.todos.map((t) => <li key={t}>{t}</li>)}</ul>
            )}
          </>
        )}

        {hayDetalle && (
          <button type="button" className="ev-mas" onClick={() => setAbierto((v) => !v)}>
            {abierto ? 'Menos' : detalleResumen(event)}
          </button>
        )}

        {/* Siempre visible, nunca plegado: un plan que se puede votar y no
            enseña como se vota es exactamente el cartel del que venimos. */}
        <Acciones evento={event} hoy={hoy} />
      </div>
    </li>
  )
}

/** Que hay dentro, dicho en el propio boton: abrir a ciegas cansa. */
function detalleResumen(event) {
  const partes = []
  if (event.sessions) partes.push(`${event.sessions.length} sesiones`)
  if (event.todos?.length) partes.push(`${event.todos.length} por hacer`)
  if (event.notes) partes.push('detalle')
  return partes.join(' · ')
}

function Sessions({ sessions }) {
  return (
    <ul className="ses">
      {sessions.map((s) => (
        <li key={s.name} className={s.name.includes('CARRERA') ? 'ses-row ses-key' : 'ses-row'}>
          <span className="ses-time">{s.time}</span>
          <span className="ses-name">{s.name}</span>
        </li>
      ))}
    </ul>
  )
}

function Tag({ children, mono = false, tone }) {
  return <span className={`tag ${mono ? 'tag-mono' : ''} ${tone ? `tag-${tone}` : ''}`}>{children}</span>
}
