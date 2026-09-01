import { useEffect, useRef } from 'react'
import './dias-carrusel.css'

const DOW = new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'Europe/Madrid' })

/**
 * Los catorce dias del viaje en un carril, para elegir con el pulgar.
 *
 * Es la pieza central del rediseño del 1 de septiembre: «Ahora» dejo de ser
 * una lista de catorce dias en la que el 11 habia que pasar el 10 haciendo
 * scroll, y paso a ser UN dia con este carrusel encima. Lo usa tambien el
 * mapa: dos superficies que navegan por dia no pueden navegar distinto.
 *
 * El punto magenta es un aviso de verdad (un evento con `warning` ese dia),
 * no decoracion. Mismo criterio que la banda dentro de la tarjeta: si merece
 * banda dentro, merece punto fuera.
 */
export default function DiasCarrusel({ dias = [], dia, alElegir, avisos, hoy = null }) {
  const activoRef = useRef(null)

  // El dia elegido entra en pantalla solo: con catorce chips, los ultimos
  // viven fuera del carril y "hoy" el dia 20 quedaria invisible.
  useEffect(() => {
    activoRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [dia])

  return (
    <div className="dc-carril" role="tablist" aria-label="Días del viaje">
      {dias.map((d) => {
        const activo = d === dia
        const fecha = new Date(`${d}T12:00:00Z`)
        return (
          <button
            key={d}
            ref={activo ? activoRef : null}
            type="button"
            role="tab"
            aria-selected={activo}
            className={`dc-dia ${activo ? 'es-activo' : ''} ${d === hoy ? 'es-hoy' : ''}`}
            onClick={() => alElegir?.(d)}
          >
            <span className="dc-num">{d.slice(8, 10)}</span>
            <span className="dc-dow">{DOW.format(fecha).replace('.', '')}</span>
            {avisos?.has(d) && <span className="dc-aviso" aria-label="con aviso" />}
          </button>
        )
      })}
    </div>
  )
}
