import { useState } from 'react'
import { TRIP } from '../data/trip-madrid-2026.js'
import { diasDelViaje } from '../domain/agenda.js'
import { formatDay } from '../domain/dates.js'
import { editarPlan, motivoPlan } from '../services/planes.js'
import './editar-plan.css'

const TIPOS = [
  { id: 'activity', label: 'Visita' },
  { id: 'food', label: 'Comida' },
  { id: 'transport', label: 'Traslado' },
  { id: 'lodging', label: 'Dormir' },
]

/**
 * Corregir un plan sin borrarlo.
 *
 * Hasta ahora, cambiar la hora de algo que habia puesto el copiloto era
 * quitarlo y volver a crearlo, y eso se lleva por delante los votos que ya
 * tenia. Peor: quien no es owner no puede volver a crear en el mismo sitio,
 * asi que en la practica no lo corregia nadie.
 *
 * El sitio se manda como TEXTO y lo resuelve el servidor contra Places, con
 * la ciudad de ese dia. Aqui no se toca ninguna coordenada: si esta pantalla
 * pudiera escribir un pin, un dedo torpe podria mover el Camp Nou.
 */
export default function EditarPlan({ evento, tripId, alCerrar }) {
  const [titulo, setTitulo] = useState(evento.title ?? '')
  const [dia, setDia] = useState(String(evento.start ?? '').slice(0, 10))
  const [hora, setHora] = useState(String(evento.start ?? '').slice(11, 16))
  const [lugar, setLugar] = useState(evento.address ?? '')
  const [tipo, setTipo] = useState(evento.kind ?? 'activity')
  const [estado, setEstado] = useState(null)

  const guardar = async () => {
    if (!titulo.trim()) return setEstado('Ponle un nombre.')
    setEstado('guardando')
    try {
      const r = await editarPlan(tripId, evento.id, {
        titulo: titulo.trim(),
        fecha: dia,
        hora: hora || '',
        lugar: lugar.trim(),
        tipo,
      })
      // Si Places no encontro el sitio nuevo, el plan se queda sin pin. Se
      // dice, porque desaparecer del mapa sin avisar parece un fallo.
      if (r?.sinPin) setEstado('Guardado, pero no encontré ese sitio: se ha quedado sin punto en el mapa.')
      else alCerrar?.()
    } catch (e) {
      setEstado(motivoPlan(e))
    }
  }

  return (
    <div className="ed">
      <label className="ed-campo">
        <span>Qué es</span>
        <input className="ed-txt" value={titulo} maxLength={140}
          onChange={(e) => setTitulo(e.target.value)} />
      </label>

      <div className="ed-campo">
        <span>Qué día</span>
        <div className="ed-dias">
          {diasDelViaje(TRIP.startDate, TRIP.endDate).map((d) => (
            <button key={d} type="button"
              className={`ed-dia ${dia === d ? 'es-activo' : ''}`}
              onClick={() => setDia(d)}>
              {formatDay(d)}
            </button>
          ))}
        </div>
      </div>

      <div className="ed-fila">
        <label className="ed-campo ed-corto">
          <span>A qué hora</span>
          <input className="ed-hora" type="time" value={hora}
            onChange={(e) => setHora(e.target.value)} />
        </label>

        <div className="ed-campo ed-corto">
          <span>Qué tipo</span>
          <div className="ed-tipos" role="group" aria-label="Tipo de plan">
            {TIPOS.map((t) => (
              <button key={t.id} type="button"
                className={`ed-tipo ${tipo === t.id ? 'es-activo' : ''}`}
                onClick={() => setTipo(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="ed-campo">
        <span>Dónde</span>
        <input className="ed-txt" value={lugar} maxLength={200}
          placeholder="Nombre del sitio o dirección"
          onChange={(e) => setLugar(e.target.value)} />
        <em className="ed-pista">Lo busco en Google Maps para poner el punto en el mapa.</em>
      </label>

      <div className="ed-botones">
        <button type="button" className="ed-guardar" disabled={estado === 'guardando'}
          onClick={guardar}>
          {estado === 'guardando' ? 'Un momento…' : 'Guardar'}
        </button>
        <button type="button" className="ed-cancelar" onClick={() => alCerrar?.()}>
          Cancelar
        </button>
      </div>

      {estado && estado !== 'guardando' && <p className="ed-aviso">{estado}</p>}
    </div>
  )
}
