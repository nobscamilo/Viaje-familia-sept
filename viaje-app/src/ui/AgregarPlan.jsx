import { useState } from 'react'
import { TRIP } from '../data/trip-madrid-2026.js'
import { formatDay } from '../domain/dates.js'
import { diasDelViaje } from '../domain/agenda.js'
import { agregarPlan, motivoPlan } from '../services/planes.js'
import './agregar-plan.css'

/**
 * Meter un sitio en la agenda desde la propia tarjeta.
 *
 * Antes habia que volver a escribirle al copiloto «agrega Rosi La Loca al
 * jueves a la una» con la tarjeta de Rosi La Loca delante. Aqui las
 * coordenadas y la direccion ya las tenemos: no hay que buscar nada otra vez.
 */
export default function AgregarPlan({ tripId, lugar, alHecho }) {
  const [abierto, setAbierto] = useState(false)
  const [dia, setDia] = useState('')
  const [hora, setHora] = useState('')
  const [estado, setEstado] = useState(null)

  const guardar = async () => {
    if (!dia) return
    setEstado('guardando')
    try {
      const r = await agregarPlan(tripId, {
        titulo: lugar.name,
        fecha: dia,
        hora: hora || undefined,
        tipo: 'food',
        lugar: lugar.formattedAddress,
        placeId: lugar.placeId,
        coords: lugar.location,
      })
      setAbierto(false)
      setEstado(null)
      alHecho?.(r)
    } catch (e) {
      setEstado(motivoPlan(e))
    }
  }

  if (!abierto) {
    return (
      <button type="button" className="ap-abrir" onClick={() => setAbierto(true)}>
        Agregar al plan
      </button>
    )
  }

  return (
    <div className="ap">
      <p className="ap-titulo">¿Qué día?</p>
      <div className="ap-dias">
        {diasDelViaje(TRIP.startDate, TRIP.endDate).map((d) => (
          <button
            key={d}
            type="button"
            className={`ap-dia ${dia === d ? 'es-activo' : ''}`}
            onClick={() => setDia(d)}
          >
            {formatDay(d)}
          </button>
        ))}
      </div>

      <div className="ap-fila">
        <input
          className="ap-hora"
          type="time"
          value={hora}
          aria-label="Hora, si la hay"
          onChange={(e) => setHora(e.target.value)}
        />
        <button
          type="button"
          className="ap-guardar"
          disabled={!dia || estado === 'guardando'}
          onClick={guardar}
        >
          {estado === 'guardando' ? 'Un momento…' : 'Añadir'}
        </button>
        <button type="button" className="ap-cancelar" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>

      {estado && estado !== 'guardando' && <p className="ap-fallo">{estado}</p>}
    </div>
  )
}
