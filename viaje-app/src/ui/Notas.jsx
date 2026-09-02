import { useState } from 'react'
import { useComentarios } from '../hooks/useComentarios.js'
import { useTrip } from '../hooks/useTrip.js'
import { byId } from '../data/travelers.js'
import './notas.css'

/**
 * Notas pegadas a un momento de la agenda.
 *
 * Lo pidio Camilo el 1 de septiembre probando la app: «recordar reservar» o
 * lo que a cada uno le haga falta. No es una funcion nueva del todo — es el
 * hilo de comentarios de una decision, colgando de la otra rama. Misma
 * coleccion, mismas reglas, mismo hook: `useComentarios(id, activo,
 * 'timeline')`.
 *
 * DOS DECISIONES QUE PARECEN UNA:
 *
 * · Las notas escritas SE VEN sin tocar nada. Una nota que hay que destapar
 *   no recuerda nada, y el sentido entero de «recordar reservar» es que te
 *   salte al ojo cuando miras el dia. Es justo lo contrario de los botones de
 *   gestion, que se plegaron esta misma tarde: gestionar se esconde, avisar
 *   no.
 * · Escribir SI esta plegado, tras «+ Nota». Un formulario en cada una de las
 *   tarjetas del dia convertiria la agenda en un cuaderno.
 *
 * Son de todos y van firmadas: nueve personas apuntando cada una por su lado
 * «hay que reservar» es el problema del que sale esta app, no la solucion.
 */
export default function Notas({ eventoId }) {
  const { travelers, yo, modoLocal } = useTrip()
  const { comentarios, enviar } = useComentarios(eventoId, true, 'timeline')
  const [escribiendo, setEscribiendo] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const nombre = (id) =>
    travelers.find((t) => t.id === id)?.short ?? byId(id)?.short ?? 'Alguien'

  const mandar = async (e) => {
    e.preventDefault()
    const limpio = texto.trim()
    if (!limpio || enviando) return
    setEnviando(true)
    setTexto('')
    await enviar(limpio)
    setEnviando(false)
    setEscribiendo(false)
  }

  // Sin notas y sin poder escribir (modo local), no se pinta nada: una
  // seccion vacia en cada tarjeta es ruido con formato.
  if (comentarios.length === 0 && modoLocal) return null

  return (
    <div className="nts">
      {comentarios.length > 0 && (
        <ul className="nts-lista">
          {comentarios.map((c) => (
            <li key={c.id} className={`nts-item ${c.travelerId === yo?.id ? 'es-mia' : ''}`}>
              <p className="nts-texto">{c.text}</p>
              <span className="nts-autor">{nombre(c.travelerId)}</span>
            </li>
          ))}
        </ul>
      )}

      {!modoLocal && !escribiendo && (
        <button type="button" className="nts-abrir" onClick={() => setEscribiendo(true)}>
          + Nota
        </button>
      )}

      {escribiendo && (
        <form className="nts-form" onSubmit={mandar}>
          {/* `autoFocus` aqui es correcto y no una molestia: el campo aparece
              porque alguien acaba de pedirlo con un toque. */}
          <input
            className="nts-campo"
            type="text"
            /* eslint-disable-next-line jsx-a11y/no-autofocus */
            autoFocus
            placeholder="Recordar reservar, llevar el contrato…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={2000}
          />
          <button type="submit" className="nts-guardar" disabled={!texto.trim() || enviando}>
            {enviando ? '…' : 'Guardar'}
          </button>
          <button
            type="button"
            className="nts-cancelar"
            onClick={() => { setEscribiendo(false); setTexto('') }}
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  )
}
