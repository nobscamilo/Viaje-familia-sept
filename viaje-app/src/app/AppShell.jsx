import { NavLink, Outlet, useNavigate } from 'react-router'
import { TRIP } from '../data/trip-madrid-2026.js'
import { daysUntil, formatRange } from '../domain/dates.js'
import { diaDeViaje } from '../domain/agenda.js'
import { useTrip } from '../hooks/useTrip.js'
import { useAhora } from '../hooks/useAhora.js'
import './app-shell.css'

const NAV = [
  { to: '/', label: 'Ahora', end: true },
  { to: '/decisiones', label: 'Decidir' },
  { to: '/mapa', label: 'Mapa' },
  // Quinta pestaña. La barra es un grid de columnas iguales, así que entra
  // sola; lo que aprieta es el texto. Por eso «Cuentas» y no «Presupuesto»,
  // y «Decidir» en lugar de «Decisiones»: con cinco columnas en un móvil de
  // 390 px cada una mide 78 px, y «Decisiones» a 0,75 rem no cabe.
  { to: '/cuentas', label: 'Cuentas' },
  { to: '/copiloto', label: 'Copiloto' },
]

export default function AppShell() {
  const { yo, modoLocal } = useTrip()
  const navegar = useNavigate()
  const { ahora } = useAhora(60_000)
  const enViaje = diaDeViaje(TRIP, ahora)
  const faltan = daysUntil(TRIP.startDate, ahora)

  return (
    <div className="shell">
      <header className="shell-top">
        <div className="shell-top-main">
          <span className="shell-trip">{TRIP.name}</span>
          <span className="shell-dates">{formatRange(TRIP.startDate, TRIP.endDate)}</span>
        </div>
        <div className="shell-top-right">
          {enViaje ? (
            <span className="shell-countdown" aria-label={`Día ${enViaje.n} de ${enViaje.total}`}>
              {enViaje.n}<span>/{enViaje.total}</span>
            </span>
          ) : faltan > 0 ? (
            <span className="shell-countdown" aria-label={`Faltan ${faltan} días`}>
              {faltan} <span>días</span>
            </span>
          ) : null}
          {yo && (
            <button
              type="button"
              className="shell-yo"
              onClick={() => navegar('/ajustes')}
              style={yo.color ? { background: yo.color, color: 'var(--s-base)' } : undefined}
              title={`Ajustes (${yo.short})`}
              aria-label={`Ajustes, has entrado como ${yo.short}`}
            >
              {yo.short.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
            </button>
          )}
        </div>
      </header>

      <main className="shell-main">
        <Outlet />
      </main>

      <nav className="shell-nav" aria-label="Secciones">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="shell-nav-item">
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
