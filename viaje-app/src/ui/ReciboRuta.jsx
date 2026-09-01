import { useState } from 'react'
import { motivoPlan, quitarRuta } from '../services/planes.js'
import { formatDay } from '../domain/dates.js'
import { plural } from '../domain/cuentas.js'
import Icon from './Icon.jsx'
import './recibo-ruta.css'

/**
 * Lo que el copiloto dejo en la agenda cuando armo una ruta.
 *
 * Un recibo, no una lista de seis planes sueltos. Es la diferencia entre
 * «te he metido seis cosas» y «te he metido esta manana»: lo primero da
 * miedo y lo segundo se entiende, y solo lo segundo se puede deshacer de un
 * toque.
 *
 * Los avisos van DENTRO del recibo y no escondidos en el texto: que una
 * parada este cerrada o pise un vuelo es lo mas util que devuelve la
 * herramienta, y es justo lo que un modelo tiende a suavizar al redactar.
 */
export default function ReciboRuta({ ruta, tripId, alQuitar }) {
  const avisos = ruta.avisos ?? []
  const [estado, setEstado] = useState(null)
  const [fuera, setFuera] = useState(false)

  const quitar = async () => {
    setEstado('quitando')
    try {
      const r = await quitarRuta(tripId, ruta.id)
      if (r?.intocables > 0) {
        setEstado(`Quité ${r.borradas}; ${r.intocables} ya estaban confirmadas y las dejo.`)
      } else {
        setFuera(true)
        alQuitar?.(ruta.id)
      }
    } catch (e) {
      setEstado(motivoPlan(e))
    }
  }

  if (fuera) return null

  return (
    <div className="rr">
      <p className="rr-cab">
        <Icon name="activity" size={15} />
        <span>
          En la agenda: <strong>{ruta.titulo}</strong>
          <span className="rr-cuando">
            {formatDay(ruta.fecha)}{ruta.ciudad ? ` · ${ruta.ciudad}` : ''}
          </span>
          <em>Propuesta hasta que alguien la confirme</em>
        </span>
      </p>

      <ol className="rr-paradas">
        {ruta.paradas?.map((p) => (
          <li key={p.orden} className="rr-parada">
            <span className="rr-hora">{p.llegada}</span>
            <span className="rr-txt">
              <strong>{p.titulo}</strong>
              {p.nota && (
                <em className="rr-nota">
                  ★ {p.nota}{p.resenas ? ` · ${plural(p.resenas, 'reseña', 'reseñas')}` : ''}
                </em>
              )}
            </span>
            {/* Cuanto se tarda hasta la siguiente. Va entre paradas porque es
                lo que se pierde al leer una lista de horas sueltas. */}
            {p.alSiguiente && <span className="rr-traslado">{p.alSiguiente}</span>}
          </li>
        ))}
      </ol>

      {avisos.length > 0 && (
        <ul className="rr-avisos">
          {avisos.map((a, i) => (
            <li key={i}><Icon name="alert" size={13} /> <span>{a}</span></li>
          ))}
        </ul>
      )}

      {tripId && (
        <button type="button" className="rr-quitar" disabled={estado === 'quitando'} onClick={quitar}>
          {estado === 'quitando' ? '…' : 'Quitar la ruta entera'}
        </button>
      )}

      {estado && estado !== 'quitando' && <p className="rr-fallo">{estado}</p>}
    </div>
  )
}
