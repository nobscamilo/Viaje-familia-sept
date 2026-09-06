import { useState } from 'react'
import { TRIP } from '../../data/trip-madrid-2026.js'
import { useTrip } from '../../hooks/useTrip.js'
import { useAhora } from '../../hooks/useAhora.js'
import {
  diasConAviso, diasDelViaje, eventosDelDia, estadoDeEvento, FASES, faseDelViaje, loQueSigue,
} from '../../domain/agenda.js'
import { formatDayLong, formatTime, mismoDia, noches } from '../../domain/dates.js'
import { diaDelViaje } from '../../domain/dates.js'
import Icon from '../../ui/Icon.jsx'
import Avatars from '../../ui/Avatars.jsx'
import Proximo from '../../ui/Proximo.jsx'
import Acciones from '../../ui/Acciones.jsx'
import Notas from '../../ui/Notas.jsx'
import DiasCarrusel from '../../ui/DiasCarrusel.jsx'
import StatusHeroStitch from '../../ui/StatusHeroStitch.jsx'
import BannerCopilotoAhora from '../../ui/BannerCopilotoAhora.jsx'
import './ahora.css'

const KIND = {
  flight: { icon: 'flight', label: 'Vuelo' },
  lodging: { icon: 'lodging', label: 'Alojamiento' },
  f1: { icon: 'f1', label: 'Circuito' },
  activity: { icon: 'activity', label: 'Plan' },
  food: { icon: 'activity', label: 'Comida' },
  transport: { icon: 'transport', label: 'Traslado' },
}

/**
 * «Ahora», dia a dia (rediseño del 1 de septiembre de 2026).
 *
 * Hasta hoy esta pantalla era la lista entera: catorce dias de scroll, y el
 * 11 en Madrid habia que pasar el 10 para llegar a lo tuyo. La maqueta que
 * trajo Camilo la convierte en UN dia con un carrusel encima, y de paso
 * resuelve un pendiente que estaba apuntado desde agosto: durante el viaje
 * arranca anclada en hoy.
 *
 * `?hoy=` sigue mandando: el ancla sale de `useAhora`, nunca del reloj.
 */
export default function Ahora() {
  const { timeline } = useTrip()
  const { ahora, simulado } = useAhora()

  const fase = faseDelViaje(TRIP, ahora)
  const enViaje = fase === FASES.DURANTE
  const hoy = diaDelViaje(ahora)
  const dias = diasDelViaje(TRIP.startDate, TRIP.endDate)

  // Antes del viaje se abre en el primer dia; durante, en hoy; despues, en
  // el ultimo — el recuerdo del viaje, no una pantalla vacia.
  const ancla = enViaje ? hoy : fase === FASES.ANTES ? dias[0] : dias[dias.length - 1]
  const [dia, setDia] = useState(ancla)

  const eventos = eventosDelDia(timeline, dia)
  const avisos = diasConAviso(timeline)
  const i = dias.indexOf(dia)

  return (
    <div className="ahora">
      {simulado && (
        <p className="ahora-simulado">
          Vista previa del {formatDayLong(hoy)}. Quita <code>?hoy=</code> de la dirección para volver al día real.
        </p>
      )}

      <StatusHeroStitch timeline={timeline} fase={fase} ahora={ahora} />

      {enViaje && dia === hoy && (
        <Proximo {...loQueSigue(timeline, ahora)} ahora={ahora} />
      )}

      <div className="ahora-itinerario-seccion">
        <div className="ahora-itinerario-head">
          <div className="ahora-itinerario-titulos">
            <h2 className="ahora-itinerario-titulo">Cuaderno Diario</h2>
            <span className="ahora-itinerario-badge">
              {i >= 0 ? `Día ${String(i + 1).padStart(2, '0')} de ${dias.length}` : `${dias.length} Etapas`}
            </span>
          </div>
          <p className="ahora-itinerario-sub">
            Secuencia pausada y coordinada para toda la familia
          </p>
        </div>

        <DiasCarrusel dias={dias} dia={dia} alElegir={setDia} avisos={avisos} hoy={enViaje ? hoy : null} />

        <div className="ahora-cabecera-dia">
          <button
            type="button" className="ahora-flecha" aria-label="Día anterior"
            disabled={i <= 0} onClick={() => setDia(dias[i - 1])}
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <h3 className="ahora-dia-titulo">
            {dia === hoy && enViaje ? 'Hoy · ' : ''}{formatDayLong(dia)}
          </h3>
          <button
            type="button" className="ahora-flecha" aria-label="Día siguiente"
            disabled={i >= dias.length - 1} onClick={() => setDia(dias[i + 1])}
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>

        <BannerCopilotoAhora />

        {eventos.length === 0 ? (
          <p className="ahora-vacio">Este día no tiene nada en la agenda. El copiloto sabe proponer.</p>
        ) : (
          <ol className="tl-events">
            {eventos.map((ev) => (
              <EventRow
                key={ev.id}
                event={ev}
                dia={dia}
                ahora={ahora}
                enViaje={enViaje}
                hoy={enViaje ? hoy : null}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function cuando(event, dia) {
  const inicio = formatTime(event.start)
  const fin = formatTime(event.end)
  // Un alojamiento arrastrado de otro dia no tiene hora HOY: lo que importa
  // es hasta cuando te quedas.
  if (String(event.start ?? '').slice(0, 10) !== dia) {
    return {
      principal: 'Sigues aquí',
      secundario: event.end ? `hasta ${formatDayLong(event.end).replace(/ de \w+$/, '')}${fin ? ` · ${fin}` : ''}` : null,
    }
  }
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
 * Una fila de la agenda: tarjeta de vidrio con la burbuja del tipo dentro.
 *
 * Compacta por defecto y se abre al tocarla. Lo que nunca se pliega es el
 * aviso: un evento que avisa de algo lo avisa aunque no lo abras.
 */
function EventRow({ event, dia, ahora, enViaje, hoy }) {
  const kind = KIND[event.kind] ?? KIND.activity
  const { principal, secundario } = cuando(event, dia)
  const estado = enViaje ? estadoDeEvento(event, ahora) : null
  const [abierto, setAbierto] = useState(false)

  const hayDetalle = Boolean(event.notes || event.sessions || event.todos?.length)

  return (
    <li className={`ev ev-${event.status} ev-kind-${event.kind} ${estado ? `ev-t-${estado}` : ''} ${abierto ? 'es-abierto' : ''}`}>
      <div className="ev-card">
        <header className="ev-head">
          <span className="ev-burbuja" aria-hidden="true"><Icon name={kind.icon} size={15} /></span>
          <div className="ev-head-txt">
            <div className="ev-linea1">
              <span className="ev-when">{principal}</span>
              <Avatars travelerIds={event.travelerIds} max={4} />
            </div>
            {secundario && <span className="ev-hasta">{secundario}</span>}
            <h3 className="ev-title">{event.title}</h3>
          </div>
        </header>

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

        {/* Las notas van ANTES de las acciones y con las escritas a la
            vista: «recordar reservar» tiene que verse al mirar el dia, no
            detrás de un toque. Lo que se pliega es escribir, no leer. */}
        <Notas eventoId={event.id} />

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
