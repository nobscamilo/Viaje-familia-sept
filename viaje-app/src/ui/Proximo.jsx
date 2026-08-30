import { cuantoFalta } from '../domain/agenda.js'
import { diaDelViaje, formatTime } from '../domain/dates.js'
import Icon from './Icon.jsx'
import Avatars from './Avatars.jsx'
import './proximo.css'

const ICONO = { flight: 'flight', lodging: 'lodging', f1: 'f1', transport: 'transport', activity: 'activity' }

/**
 * La tarjeta de arriba durante el viaje: qué está pasando y qué sigue.
 *
 * Es la razón de ser de la pantalla. Alguien que acaba de aterrizar en Barajas
 * con dos niños y cinco maletas no quiere una agenda de catorce días: quiere
 * saber a dónde va ahora y a qué hora.
 */
export default function Proximo({ base, enCurso, siguiente, ahora }) {
  const nada = base.length === 0 && enCurso.length === 0 && !siguiente
  if (nada) {
    return (
      <section className="prox prox-libre">
        <p className="prox-eyebrow">Ahora</p>
        <p className="prox-nada">Nada en la agenda. Día libre.</p>
      </section>
    )
  }

  return (
    <section className="prox">
      {enCurso.map((ev) => <Bloque key={ev.id} evento={ev} tono="curso" etiqueta="Ahora mismo" />)}

      {siguiente && (
        <Bloque
          evento={siguiente}
          tono="siguiente"
          etiqueta="Lo siguiente"
          apunte={cuantoFalta(siguiente, ahora)}
        />
      )}

      {base.map((ev) => (
        <p key={ev.id} className="prox-base">
          <Icon name="lodging" size={14} />
          <span>
            {seVanHoy(ev, ahora) ? 'Salen hoy de ' : 'Duermen en '}
            <strong>{ev.title}</strong>
            {ev.address && <em>{ev.address}</em>}
          </span>
        </p>
      ))}
    </section>
  )
}

/**
 * A donde hay que ir, y si tiene sentido abrir el mapa.
 *
 * Antes esto era `evento.to?.name` para los vuelos, o sea «Madrid»: el boton
 * «Como llegar» trazaba una ruta al centro de la ciudad de destino, que no le
 * sirve a nadie. Antes de un vuelo lo util es el aeropuerto de SALIDA; una vez
 * embarcados, la terminal de llegada, y ahi el mapa sobra.
 */
function aDonde(evento, tono) {
  if (evento.address) return { texto: evento.address, mapa: evento.address }
  if (evento.venue) return { texto: evento.venue, mapa: evento.venue }

  if (evento.kind === 'flight') {
    const destino = evento.to?.name ?? ''
    const terminal = evento.to?.terminal ?? ''
    const llegada = {
      texto: `Llega a ${terminal ? `${terminal} · ` : ''}${destino}`,
      mapa: destino ? `Aeropuerto de ${destino} ${terminal}`.trim() : null,
    }

    // Del AV182 solo conocemos la hora de aterrizaje: para quien lo mira, el
    // sitio al que hay que ir es la terminal de llegada, no Bogota.
    if (evento.horaEs === 'llegada') return llegada
    if (tono === 'curso') return { ...llegada, mapa: null }

    const salida = evento.from?.name
    if (!salida) return { texto: '', mapa: null }
    // La terminal de salida importa tanto como el aeropuerto: en Barajas,
    // equivocarse de terminal son treinta minutos largos.
    const desde = `Aeropuerto de ${salida}${evento.from?.terminal ? ` ${evento.from.terminal}` : ''}`
    return { texto: desde, mapa: desde }
  }

  return { texto: '', mapa: null }
}

/**
 * El dia del check-out, «Duermen en X» miente: esa noche duermen en otro sitio.
 * Pasa el 22 en Guardo, y el 14 en Madrid antes de Barcelona.
 */
function seVanHoy(evento, ahora) {
  return Boolean(evento.end) && String(evento.end).slice(0, 10) === diaDelViaje(ahora)
}

function Bloque({ evento, tono, etiqueta, apunte }) {
  const hora = formatTime(evento.start)
  const { texto: destino, mapa: aMapear } = aDonde(evento, tono)
  const mapa = aMapear
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(aMapear)}`
    : null

  return (
    <article className={`prox-bloque prox-${tono}`}>
      <header className="prox-head">
        <span className="prox-eyebrow">{etiqueta}</span>
        {apunte && <span className="prox-apunte">{apunte}</span>}
      </header>

      <div className="prox-cuerpo">
        <span className="prox-icono"><Icon name={ICONO[evento.kind] ?? 'activity'} size={20} /></span>
        <div className="prox-txt">
          <h2 className="prox-titulo">{evento.title}</h2>
          <p className="prox-meta">
            {hora && <span className="prox-hora">{hora}</span>}
            {destino && <span className="prox-donde">{destino}</span>}
          </p>
        </div>
        <Avatars travelerIds={evento.travelerIds} />
      </div>

      {evento.locator && <p className="prox-dato">Localizador <strong>{evento.locator}</strong></p>}
      {evento.warning && <p className="prox-aviso">{evento.warning}</p>}

      {mapa && (
        <a className="prox-ir" href={mapa} target="_blank" rel="noreferrer">
          Cómo llegar
        </a>
      )}
    </article>
  )
}
