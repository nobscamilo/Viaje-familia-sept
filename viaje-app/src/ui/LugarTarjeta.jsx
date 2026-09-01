import AgregarPlan from './AgregarPlan.jsx'
import { plural } from '../domain/cuentas.js'
import './lugar-tarjeta.css'

/**
 * La foto manda. Es lo unico verdaderamente visual que tiene esta app, y
 * antes iba en una miniatura de 84 px al lado del texto: no decidia nada.
 * Un sitio para cenar se escoge por la pinta que tiene.
 */
export default function Lugar({ lugar, tripId, alAgregar, elegido = false, alElegir }) {
  const resenas = lugar.userRatingCount
    ? plural(lugar.userRatingCount, 'reseña', 'reseñas')
    : null

  return (
    <li className={`cop-lugar ${elegido ? 'es-elegido' : ''}`}
      onPointerEnter={() => alElegir?.(lugar.placeId)}>
      <a href={lugar.googleMapsUri} target="_blank" rel="noreferrer">
        {lugar.photoUri
          ? <img className="cop-foto" src={lugar.photoUri} alt="" loading="lazy" />
          : <span className="cop-foto cop-sinfoto" aria-hidden="true" />}

        <div className="cop-lugar-txt">
          <h3>{lugar.name}</h3>
          <p className="cop-meta">
            {lugar.rating && (
              <span className="cop-nota">★ {lugar.rating}</span>
            )}
            {resenas && <span className="cop-resenas">{resenas}</span>}
          </p>
          <p className="cop-dir">{lugar.formattedAddress}</p>
        </div>
      </a>

      {tripId && <AgregarPlan tripId={tripId} lugar={lugar} alHecho={alAgregar} />}
    </li>
  )
}
