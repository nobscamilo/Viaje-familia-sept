import { useState } from 'react'
import { useTrip } from '../hooks/useTrip.js'
import { proponerDecision } from '../services/tripRepo.js'
import { GROUPS } from '../data/trip-madrid-2026.js'
import './proponer.css'

const URGENCIAS = [
  ['alta', 'Urgente'],
  ['media', 'Pendiente'],
  ['baja', 'Cuando se pueda'],
]

/**
 * Proponer algo. Es la pieza que convierte la app de folleto en herramienta:
 * hasta ahora todo el contenido lo había sembrado yo en el código.
 */
export default function Proponer({ alCerrar }) {
  const { tripId, user, yo, modoLocal } = useTrip()
  const [titulo, setTitulo] = useState('')
  const [porque, setPorque] = useState('')
  const [urgencia, setUrgencia] = useState('media')
  const [grupo, setGrupo] = useState('todos')
  const [estado, setEstado] = useState(null)

  const valido = titulo.trim().length >= 4

  const enviar = async (e) => {
    e.preventDefault()
    if (!valido || estado === 'enviando') return
    setEstado('enviando')
    try {
      await proponerDecision(tripId, {
        title: titulo.trim(),
        why: porque.trim() || null,
        urgency: urgencia,
        groupId: grupo,
        travelerIds: GROUPS[grupo === 'sin-f1' ? 'sinF1' : grupo]?.travelerIds ?? 'all',
      }, user.uid)
      alCerrar()
    } catch {
      setEstado('No se pudo guardar. ¿Sigues con sesión abierta?')
    }
  }

  return (
    <div className="prop-fondo" role="dialog" aria-label="Proponer algo">
      <form className="prop" onSubmit={enviar}>
        <header className="prop-head">
          <h2 className="prop-titulo">Proponer algo</h2>
          <button type="button" className="prop-cerrar" onClick={alCerrar} aria-label="Cerrar">×</button>
        </header>

        <label className="prop-campo">
          <span>¿Qué hay que decidir?</span>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Dónde cenamos el viernes en Madrid"
            maxLength={140}
            autoFocus
          />
        </label>

        <label className="prop-campo">
          <span>¿Por qué? <em>Opcional, pero ayuda a que la gente vote con criterio</em></span>
          <textarea
            value={porque}
            onChange={(e) => setPorque(e.target.value)}
            placeholder="Volvemos del circuito a las 19:00 y con los niños no aguantamos mucho más."
            rows={3}
            maxLength={600}
          />
        </label>

        <div className="prop-fila">
          <label className="prop-campo">
            <span>Urgencia</span>
            <select value={urgencia} onChange={(e) => setUrgencia(e.target.value)}>
              {URGENCIAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>

          <label className="prop-campo">
            <span>¿A quién le toca?</span>
            <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
              <option value="todos">Toda la familia</option>
              <option value="f1">Grupo F1</option>
              <option value="sin-f1">Plan sin F1</option>
            </select>
          </label>
        </div>

        <p className="prop-nota">
          Lo propone {yo?.short ?? 'alguien'}. Entra como <strong>propuesto</strong>: nadie
          vota hasta que se abra la votación.
        </p>

        <button type="submit" className="prop-enviar" disabled={!valido || modoLocal || estado === 'enviando'}>
          {estado === 'enviando' ? 'Guardando…' : 'Proponer'}
        </button>

        {modoLocal && <p className="prop-fallo">Modo local: no hay servidor donde guardar.</p>}
        {estado && estado !== 'enviando' && <p className="prop-fallo">{estado}</p>}
      </form>
    </div>
  )
}
