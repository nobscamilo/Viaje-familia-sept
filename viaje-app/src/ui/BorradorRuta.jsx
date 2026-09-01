import { useState } from 'react'
import { guardarRutaBorrador, motivoPlan, recalcularRuta } from '../services/planes.js'
import { formatDay } from '../domain/dates.js'
import { miles, plural } from '../domain/cuentas.js'
import ReciboRuta from './ReciboRuta.jsx'
import Icon from './Icon.jsx'
import './borrador-ruta.css'

/**
 * La ruta ANTES de entrar en la agenda.
 *
 * El copiloto armaba una ruta y las seis paradas aparecian ya en «Ahora». Se
 * podian quitar de una vez, si — pero la primera vez que la familia veia el
 * recorrido era encontrandoselo metido, y cambiarle algo significaba
 * quitarlo entero y volver a pedirselo con otras palabras. Camilo lo dijo
 * claro: que lo ensene antes y espere.
 *
 * Aqui se puede quitar una parada, decir cuanto se quiere estar en cada sitio
 * y mover la hora de arranque. Cada cambio vuelve al servidor a recalcular:
 * las horas de llegada NUNCA se tocan desde el navegador, porque quitar la
 * parada del medio cambia todos los traslados que vienen detras y ajustarlos
 * a ojo daria un horario plausible y falso — que es la peor clase de error.
 *
 * Por eso mismo se recalcula al SOLTAR el campo y no en cada tecla: cada
 * recalculo es una llamada a Routes por tramo, y teclear «11:30» dispararia
 * cuatro.
 */
export default function BorradorRuta({ ruta: inicial, tripId, alDescartar }) {
  const [ruta, setRuta] = useState(inicial)
  const [hora, setHora] = useState(inicial.horaInicio ?? '10:00')
  const [estado, setEstado] = useState(null)
  const [fallo, setFallo] = useState(null)
  const [guardada, setGuardada] = useState(null)

  // Una vez guardada deja de ser un borrador: pasa a ser el recibo de lo que
  // hay en la agenda, con su boton de quitar. Mismo sitio, otro objeto.
  if (guardada) return <ReciboRuta ruta={guardada} tripId={tripId} />

  const rehacer = async (siguiente) => {
    setEstado('recalculando')
    setFallo(null)
    try {
      const r = await recalcularRuta(tripId, siguiente)
      setRuta(r.borrador)
      setHora(r.borrador.horaInicio)
    } catch (e) {
      setFallo(motivoPlan(e))
    }
    setEstado(null)
  }

  const quitarParada = (orden) => {
    const quedan = ruta.paradas.filter((p) => p.orden !== orden)
    if (quedan.length === 0) return alDescartar?.()
    rehacer({ ...ruta, paradas: quedan })
  }

  const cambiarMinutos = (orden, minutos) => {
    const n = Number(minutos)
    if (!Number.isFinite(n) || n <= 0) return
    const paradas = ruta.paradas.map((p) => (p.orden === orden ? { ...p, minutos: n } : p))
    rehacer({ ...ruta, paradas })
  }

  const cambiarArranque = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora) || hora === ruta.horaInicio) return
    rehacer({ ...ruta, horaInicio: hora })
  }

  const guardar = async () => {
    setEstado('guardando')
    setFallo(null)
    try {
      const r = await guardarRutaBorrador(tripId, ruta)
      setGuardada(r.ruta)
    } catch (e) {
      setFallo(motivoPlan(e))
      setEstado(null)
    }
  }

  const ocupado = Boolean(estado)

  return (
    <div className={`br ${ocupado ? 'es-ocupado' : ''}`}>
      <p className="br-cab">
        <Icon name="activity" size={15} />
        <span>
          Te propongo: <strong>{ruta.titulo}</strong>
          <span className="br-cuando">
            {formatDay(ruta.fecha)}{ruta.ciudad ? ` · ${ruta.ciudad}` : ''}
          </span>
          {/* Lo primero que hay que entender de esta tarjeta es que TODAVIA
              no ha pasado nada. Va arriba y no al lado del boton. */}
          <em>Todavía no está en la agenda</em>
        </span>
      </p>

      <label className="br-arranque">
        <span>Empezamos a las</span>
        <input
          type="time"
          className="br-hora"
          value={hora}
          disabled={ocupado}
          onChange={(e) => setHora(e.target.value)}
          onBlur={cambiarArranque}
        />
      </label>

      <ol className="br-paradas">
        {ruta.paradas.map((p) => (
          <li key={p.orden} className="br-parada">
            <span className="br-llegada">{p.llegada}</span>

            <div className="br-txt">
              <strong>{p.titulo}</strong>
              {p.nota && (
                <em className="br-nota">
                  ★ {p.nota}{p.resenas ? ` · ${miles(p.resenas)} ${plural(p.resenas, 'reseña', 'reseñas')}` : ''}
                </em>
              )}
              <label className="br-rato">
                <span>Nos quedamos</span>
                <input
                  type="number" min="15" max="480" step="15"
                  className="br-min"
                  defaultValue={p.minutos}
                  disabled={ocupado}
                  onBlur={(e) => cambiarMinutos(p.orden, e.target.value)}
                />
                <span>min</span>
              </label>
            </div>

            <button
              type="button"
              className="br-quitar-parada"
              disabled={ocupado}
              aria-label={`Quitar ${p.titulo} de la ruta`}
              onClick={() => quitarParada(p.orden)}
            >
              ×
            </button>

            {/* Cuanto se tarda hasta la siguiente. Va entre paradas porque es
                lo que se pierde al leer una lista de horas sueltas. */}
            {p.alSiguiente && <span className="br-traslado">{p.alSiguiente}</span>}
          </li>
        ))}
      </ol>

      {ruta.avisos?.length > 0 && (
        <ul className="br-avisos">
          {ruta.avisos.map((a, i) => (
            <li key={i}><Icon name="alert" size={13} /> <span>{a}</span></li>
          ))}
        </ul>
      )}

      <div className="br-botones">
        <button type="button" className="br-agregar" disabled={ocupado} onClick={guardar}>
          {estado === 'guardando' ? 'Agregando…' : 'Agregar a la agenda'}
        </button>
        <button type="button" className="br-descartar" disabled={ocupado} onClick={() => alDescartar?.()}>
          Descartar
        </button>
        {estado === 'recalculando' && <span className="br-calculando">Rehaciendo las horas…</span>}
      </div>

      {fallo && <p className="br-fallo">{fallo}</p>}
    </div>
  )
}
