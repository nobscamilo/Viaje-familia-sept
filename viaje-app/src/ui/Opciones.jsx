import { useTrip } from '../hooks/useTrip.js'
import { useVotos } from '../hooks/useVotos.js'
import { recuentoOpciones, sePuedeCerrarOpciones, puedeVotar } from '../domain/decisions.js'
import Avatars from './Avatars.jsx'
import './opciones.css'

/**
 * Escoger entre varias, no decir si o no.
 *
 * «Donde comemos el domingo» con tres restaurantes delante no se resuelve
 * votando «si»: se resuelve señalando uno. Es lo que el copiloto necesitaba
 * para servir de algo — buscaba tres sitios buenisimos y luego no habia forma
 * de que la familia eligiera sin abrir WhatsApp.
 *
 * Se ve quien ha votado que. En una decision de si/no dar nombres seria
 * señalar al que dice que no; aqui es lo contrario: saber que dos ya quieren
 * el mismo sitio es lo que hace que la cosa se cierre.
 */
export default function Opciones({ decision }) {
  const { travelers, yo, modoLocal } = useTrip()
  const { votos, votar, miVoto } = useVotos(decision.id)

  const r = recuentoOpciones(decision, travelers, votos)
  const cierre = sePuedeCerrarOpciones(decision, travelers, votos)
  const puedo = puedeVotar(yo) && !modoLocal

  return (
    <div className="opc">
      <ul className="opc-list">
        {r.opciones.map((o) => {
          const mia = miVoto === o.id
          const gana = r.ganadora?.id === o.id
          return (
            <li key={o.id} className={`opc-item ${mia ? 'es-mia' : ''} ${gana ? 'es-gana' : ''}`}>
              <button
                type="button"
                className="opc-btn"
                onClick={() => puedo && votar(o.id)}
                disabled={!puedo}
                aria-pressed={mia}
              >
                <span className="opc-marca" aria-hidden="true" />
                <span className="opc-txt">
                  <span className="opc-title">{o.title}</span>
                  {o.detail && <span className="opc-detail">{o.detail}</span>}
                  {(o.address || Number.isFinite(o.priceEur)) && (
                    <span className="opc-meta">
                      {o.address && <span className="opc-addr">{o.address}</span>}
                      {Number.isFinite(o.priceEur) && <span className="opc-precio">{o.priceEur} €</span>}
                    </span>
                  )}
                </span>
                <span className="opc-votos">
                  {o.votos > 0
                    ? <Avatars travelerIds={o.votantes.map((t) => t.id)} />
                    : <span className="opc-cero">—</span>}
                </span>
              </button>

              {o.url && (
                <a className="opc-ver" href={o.url} target="_blank" rel="noreferrer">Ver</a>
              )}
            </li>
          )
        })}
      </ul>

      <p className={`opc-estado ${cierre.puede ? 'es-listo' : ''}`}>
        {r.emitidos === 0
          ? `Nadie ha escogido todavía · ${r.total} deciden`
          : cierre.puede
            ? `Gana ${r.ganadora.title}`
            : `${r.emitidos} de ${r.total}${r.faltan.length ? ` · falta ${r.faltan.map((t) => t.short).join(', ')}` : ''}${r.empate ? ' · empate' : ''}`}
      </p>

      {modoLocal && <p className="opc-nota">Modo local: los votos no se guardan.</p>}
    </div>
  )
}
