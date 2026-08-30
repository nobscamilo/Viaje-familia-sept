import { useState } from 'react'
import { useComentarios } from '../hooks/useComentarios.js'
import { useTrip } from '../hooks/useTrip.js'
import { byId } from '../data/travelers.js'
import './comentarios.css'

/**
 * El hilo de una decisión. Es el sustituto del grupo de WhatsApp donde hoy se
 * pierde el porqué de las cosas: aquí la conversación queda pegada a la
 * decisión que la provocó.
 */
export default function Comentarios({ decisionId, abierto }) {
  const { travelers, yo, modoLocal } = useTrip()
  const { comentarios, enviar } = useComentarios(decisionId, abierto)
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
  }

  return (
    <div className="com">
      {comentarios.length > 0 && (
        <ul className="com-lista">
          {comentarios.map((c) => (
            <li key={c.id} className={`com-item ${c.travelerId === yo?.id ? 'es-mio' : ''}`}>
              <span className="com-autor">{nombre(c.travelerId)}</span>
              <p className="com-texto">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      {comentarios.length === 0 && (
        <p className="com-vacio">Nadie ha dicho nada todavía.</p>
      )}

      <form className="com-form" onSubmit={mandar}>
        <input
          className="com-campo"
          type="text"
          placeholder={modoLocal ? 'Modo local: no se guarda' : 'Escribe algo…'}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={modoLocal}
          maxLength={2000}
        />
        <button type="submit" className="com-enviar" disabled={!texto.trim() || modoLocal}>
          Enviar
        </button>
      </form>
    </div>
  )
}
