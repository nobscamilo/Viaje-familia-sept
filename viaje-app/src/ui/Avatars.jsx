import { byId } from '../data/travelers.js'
import './avatars.css'

const initials = (t) =>
  t.short.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

/**
 * Quien participa, de un vistazo. Es la pregunta que mas se repite en un viaje
 * de nueve personas donde no todos hacen todo, y la app vieja no la respondia
 * en ninguna pantalla.
 */
export default function Avatars({ travelerIds, max = 5 }) {
  if (travelerIds === 'all') {
    return <span className="avatars-all">Los 9</span>
  }
  if (!Array.isArray(travelerIds) || travelerIds.length === 0) {
    return <span className="avatars-unknown">Sin asignar</span>
  }

  const people = travelerIds.map(byId).filter(Boolean)
  const shown = people.slice(0, max)
  const rest = people.length - shown.length

  return (
    <span className="avatars" title={people.map((p) => p.short).join(', ')}>
      {shown.map((p) => (
        <span
          key={p.id}
          className={`avatar ${p.age < 18 ? 'avatar-child' : ''}`}
          style={p.color ? { background: p.color } : undefined}
          title={p.short}
        >
          {initials(p)}
        </span>
      ))}
      {rest > 0 && <span className="avatar avatar-rest">+{rest}</span>}
    </span>
  )
}
