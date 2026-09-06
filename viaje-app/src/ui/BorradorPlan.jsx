import { useState } from 'react'
import { TRIP } from '../data/trip-madrid-2026.js'
import { diasDelViaje } from '../domain/agenda.js'
import { formatDay } from '../domain/dates.js'
import { agregarPlan, motivoPlan } from '../services/planes.js'
import Icon from './Icon.jsx'
import './borrador-plan.css'

/**
 * Un plan suelto que el copiloto PROPONE, con el dia y la hora a mano.
 *
 * Hermano pequeno de `BorradorRuta`, y por la misma razon: «agrégalo al
 * jueves» escribia en la agenda directamente y la unica forma de corregir la
 * hora era ir a «Ahora» a editarlo. Aqui se ajusta antes de que exista.
 *
 * La direccion y las coordenadas ya vienen resueltas contra Places desde el
 * servidor: aqui no se toca ningun pin. Si esta pantalla pudiera escribir
 * unas coordenadas, un dedo torpe podria mover el Camp Nou.
 */
export default function BorradorPlan({ plan, tripId, alAgregado, alDescartar, alCambiar }) {
  const [dia, setDia] = useState(plan.fecha ?? '')
  const [hora, setHora] = useState(plan.hora ?? '')
  const [estado, setEstado] = useState(null)

  const agregar = async () => {
    if (!dia) return setEstado('Dime qué día.')
    setEstado('guardando')
    try {
      const r = await agregarPlan(tripId, {
        titulo: plan.titulo,
        fecha: dia,
        hora: hora || undefined,
        duracionMinutos: plan.duracionMinutos ?? undefined,
        tipo: plan.tipo,
        grupo: plan.grupo,
        lugar: plan.lugar ?? undefined,
        coords: plan.coords ?? undefined,
        placeId: plan.placeId ?? undefined,
        nota: plan.nota ?? undefined,
        deCopiloto: true,
      })
      alAgregado?.(r)
    } catch (e) {
      setEstado(motivoPlan(e))
    }
  }

  return (
    <div className="bp">
      <p className="bp-cab">
        <Icon name="activity" size={15} />
        <span>
          Te propongo: <strong>{plan.titulo}</strong>
          {plan.lugar && <span className="bp-donde">{plan.lugar}</span>}
          <em>Todavía no está en la agenda</em>
        </span>
      </p>

      <div className="bp-dias">
        {diasDelViaje(TRIP.startDate, TRIP.endDate).map((d) => (
          <button
            key={d}
            type="button"
            className={`bp-dia ${dia === d ? 'es-activo' : ''}`}
            disabled={estado === 'guardando'}
            onClick={() => { setDia(d); alCambiar?.({ ...plan, fecha: d, hora }) }}
          >
            {formatDay(d)}
          </button>
        ))}
      </div>

      <div className="bp-botones">
        <input
          className="bp-hora"
          type="time"
          value={hora}
          aria-label="Hora, si la hay"
          disabled={estado === 'guardando'}
          onChange={(e) => { setHora(e.target.value); alCambiar?.({ ...plan, fecha: dia, hora: e.target.value }) }}
        />
        <button type="button" className="bp-agregar" disabled={estado === 'guardando'} onClick={agregar}>
          {estado === 'guardando' ? 'Agregando…' : 'Agregar a la agenda'}
        </button>
        <button type="button" className="bp-descartar" disabled={estado === 'guardando'} onClick={() => alDescartar?.()}>
          Descartar
        </button>
      </div>

      {estado && estado !== 'guardando' && <p className="bp-fallo">{estado}</p>}
    </div>
  )
}
