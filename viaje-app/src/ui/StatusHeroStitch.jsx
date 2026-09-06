import { TRIP } from '../data/trip-madrid-2026.js'
import { TRAVELERS } from '../data/travelers.js'
import { daysUntil, formatRange } from '../domain/dates.js'
import { diaDeViaje } from '../domain/agenda.js'
import { FASES } from '../domain/agenda.js'
import './status-hero-stitch.css'

export default function StatusHeroStitch({ timeline = [], fase, ahora }) {
  const faltan = daysUntil(TRIP.startDate, ahora)
  const enViaje = diaDeViaje(TRIP, ahora)
  const pendientes = timeline.filter((e) => e.status !== 'confirmado').length
  const totalViajeros = TRAVELERS.length

  return (
    <section className="ahora-hero-stitch">
      <div className="ahora-hero-badge">
        <span className="ahora-hero-dot" aria-hidden="true" />
        <span>Expedición Planificada</span>
      </div>

      <h1 className="ahora-hero-title">
        Madrid, Barcelona y París
      </h1>

      <p className="ahora-hero-sub">
        Cuaderno de ruta pausado y coordinado para tres generaciones en marcha.
      </p>

      <div className="ahora-status-capsule-wrapper">
        <div className="ahora-status-capsule">
          <div className="ahora-status-item">
            <span className="ahora-status-val">14</span>
            <span className="ahora-status-lbl">Días</span>
          </div>
          <span className="ahora-status-sep" aria-hidden="true">•</span>
          <div className="ahora-status-item">
            <span className="ahora-status-val">3</span>
            <span className="ahora-status-lbl">Ciudades</span>
          </div>
          <span className="ahora-status-sep" aria-hidden="true">•</span>
          <div className="ahora-status-item">
            <span className="ahora-status-val">{totalViajeros}</span>
            <span className="ahora-status-lbl">Viajeros</span>
          </div>
          <span className="ahora-status-sep" aria-hidden="true">•</span>
          <div className="ahora-status-item">
            <span className="ahora-status-dates">
              {formatRange(TRIP.startDate, TRIP.endDate)}
            </span>
          </div>
          <span className="ahora-status-sep" aria-hidden="true">•</span>
          <div className="ahora-status-item">
            {enViaje ? (
              <span className="ahora-status-highlight">
                Día {enViaje.n} de {enViaje.total}
              </span>
            ) : fase === FASES.DESPUES ? (
              <span className="ahora-status-highlight">Finalizado</span>
            ) : (
              <span className="ahora-status-highlight">
                Faltan {faltan} {faltan === 1 ? 'día' : 'días'}
              </span>
            )}
          </div>
        </div>
      </div>

      {pendientes > 0 && (
        <div className="ahora-hero-pendientes">
          <span>{pendientes} {pendientes === 1 ? 'momento pendiente' : 'momentos pendientes'} por confirmar</span>
        </div>
      )}
    </section>
  )
}
