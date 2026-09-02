import { useState } from 'react'
import { useComentarios } from '../hooks/useComentarios.js'
import { useTrip } from '../hooks/useTrip.js'
import { puedeBorrarNota, puedeEditarNota } from '../domain/notas.js'
import { byId } from '../data/travelers.js'
import './notas.css'

/**
 * Notas pegadas a un momento de la agenda.
 *
 * Lo pidio Camilo el 1 de septiembre probando la app: «recordar reservar» o
 * lo que a cada uno le haga falta. No es una funcion nueva del todo — es el
 * hilo de comentarios de una decision colgando de la otra rama. Misma
 * coleccion, mismas reglas, mismo hook: `useComentarios(id, activo,
 * 'timeline')`.
 *
 * DOS DECISIONES QUE PARECEN UNA:
 *
 * · Las notas escritas SE VEN sin tocar nada. Una nota que hay que destapar
 *   no recuerda nada, y el sentido entero de «recordar reservar» es que te
 *   salte al ojo cuando miras el dia. Es justo lo contrario de los botones de
 *   gestion, que se plegaron esa misma tarde: gestionar se esconde, avisar no.
 * · Escribir y CORREGIR si estan plegados: escribir tras «+ Nota», y editar o
 *   quitar tocando la propia nota. Cuatro iconos permanentes en una tarjeta
 *   que ya lleva aviso, decisiones y acciones serian cuatro de mas.
 *
 * Son de todos y van firmadas: nueve personas apuntando cada una por su lado
 * «hay que reservar» es el problema del que sale esta app, no la solucion.
 *
 * Quien puede editar y quien puede borrar lo dice `domain/notas.js`, que
 * espeja las reglas de Firestore. Aqui no se razona sobre permisos.
 */
export default function Notas({ eventoId }) {
  const { travelers, yo, user, rol, modoLocal } = useTrip()
  const { comentarios, enviar, editar, borrar } = useComentarios(eventoId, true, 'timeline')
  const [escribiendo, setEscribiendo] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const [editando, setEditando] = useState(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const esOwner = rol === 'owner'
  const nombre = (id) =>
    travelers.find((t) => t.id === id)?.short ?? byId(id)?.short ?? 'Alguien'

  const cerrar = () => { setAbierta(null); setEditando(null); setTexto('') }

  const mandar = async (e) => {
    e.preventDefault()
    const limpio = texto.trim()
    if (!limpio || enviando) return
    setEnviando(true)
    setTexto('')
    if (editando) await editar(editando, limpio)
    else await enviar(limpio)
    setEnviando(false)
    setEscribiendo(false)
    cerrar()
  }

  const quitar = async (id) => {
    cerrar()
    await borrar(id)
  }

  // Sin notas y sin poder escribir (modo local), no se pinta nada: una
  // seccion vacia en cada tarjeta es ruido con formato.
  if (comentarios.length === 0 && modoLocal) return null

  return (
    <div className="nts">
      {comentarios.length > 0 && (
        <ul className="nts-lista">
          {comentarios.map((c) => {
            const mia = c.travelerId === yo?.id
            const puedeEditar = !modoLocal && puedeEditarNota(c, user?.uid)
            const puedeBorrar = !modoLocal && puedeBorrarNota(c, { uid: user?.uid, esOwner })
            const tocable = puedeEditar || puedeBorrar
            const firma = `${nombre(c.travelerId)}${c.editadoEn ? ' · editada' : ''}`

            if (editando === c.id) {
              return (
                <li key={c.id} className={`nts-item ${mia ? 'es-mia' : ''}`}>
                  <Formulario
                    texto={texto} setTexto={setTexto} enviando={enviando}
                    alGuardar={mandar} alCancelar={cerrar} etiqueta="Guardar"
                  />
                </li>
              )
            }

            return (
              <li key={c.id} className={`nts-item ${mia ? 'es-mia' : ''} ${abierta === c.id ? 'es-abierta' : ''}`}>
                {tocable ? (
                  <button
                    type="button"
                    className="nts-toque"
                    aria-expanded={abierta === c.id}
                    onClick={() => setAbierta((a) => (a === c.id ? null : c.id))}
                  >
                    <span className="nts-texto">{c.text}</span>
                    <span className="nts-autor">{firma}</span>
                  </button>
                ) : (
                  <>
                    <p className="nts-texto">{c.text}</p>
                    <span className="nts-autor">{firma}</span>
                  </>
                )}

                {abierta === c.id && (
                  <div className="nts-acciones">
                    {puedeEditar && (
                      <button
                        type="button" className="nts-editar"
                        onClick={() => { setEditando(c.id); setTexto(c.text); setEscribiendo(false) }}
                      >
                        Editar
                      </button>
                    )}
                    {puedeBorrar && (
                      <button type="button" className="nts-quitar" onClick={() => quitar(c.id)}>
                        Quitar
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!modoLocal && !escribiendo && !editando && (
        <button type="button" className="nts-abrir" onClick={() => setEscribiendo(true)}>
          + Nota
        </button>
      )}

      {escribiendo && (
        <Formulario
          texto={texto} setTexto={setTexto} enviando={enviando}
          alGuardar={mandar} alCancelar={() => { setEscribiendo(false); setTexto('') }}
          etiqueta="Guardar"
        />
      )}
    </div>
  )
}

/** El mismo formulario para escribir y para corregir: es el mismo gesto. */
function Formulario({ texto, setTexto, enviando, alGuardar, alCancelar, etiqueta }) {
  return (
    <form className="nts-form" onSubmit={alGuardar}>
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
        {enviando ? '…' : etiqueta}
      </button>
      <button type="button" className="nts-cancelar" onClick={alCancelar}>
        Cancelar
      </button>
    </form>
  )
}
