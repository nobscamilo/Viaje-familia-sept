import { analizar } from '../domain/marcado.js'
import './marcado.css'

/**
 * Pinta el poco markdown que escribe el copiloto.
 *
 * El texto iba a un `<p>` tal cual, así que en pantalla salía literalmente
 * `*   **En transporte público:** Se tardan…`, asteriscos incluidos. Un modelo
 * escribe listas y negritas se le pida o no: es más barato pintarlas que
 * pelearse con él para que no las use.
 *
 * Se construyen ELEMENTOS de React, nunca `dangerouslySetInnerHTML`: este
 * texto lo escribe un modelo que ha leído páginas de internet. Es la única
 * entrada de la app que no controla nadie de la familia.
 */
export default function Marcado({ texto, className = '' }) {
  return (
    <div className={`md ${className}`}>
      {analizar(texto).map((b, i) => (
        b.tipo === 'lista'
          ? (
            <ul key={i} className="md-lista">
              {b.puntos.map((trozos, j) => <li key={j}>{pintar(trozos)}</li>)}
            </ul>
          )
          : <p key={i} className="md-p">{pintar(b.trozos)}</p>
      ))}
    </div>
  )
}

const pintar = (trozos) => trozos.map((t, i) => (
  t.fuerte ? <strong key={i}>{t.texto}</strong> : <span key={i}>{t.texto}</span>
))
