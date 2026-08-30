import { useEffect, useState } from 'react'
import { useTrip } from '../../hooks/useTrip.js'
import { desvincular, verGente } from '../../services/ajustes.js'
import { TRAVELERS } from '../../data/travelers.js'
import './ajustes.css'

/**
 * Quien ha entrado, con que codigo, y como arreglarlo.
 *
 * Hasta hoy, si alguien se apuntaba con el nombre equivocado la unica salida
 * era la consola de Firebase o el terminal de Camilo. Eso no es un producto:
 * es un recado.
 *
 * No esta en la barra de abajo a proposito. Ahi caben cuatro cosas que se usan
 * todos los dias; esto se usa dos veces en el viaje y vive detras del avatar,
 * que es donde la gente busca los ajustes.
 */
export default function Ajustes() {
  const { tripId, yo, rol, salir, modoLocal } = useTrip()
  const [gente, setGente] = useState(null)
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(null)

  // En modo local no hay rol ni servidor, y la pantalla salia en blanco: no
  // habia forma de trabajar su aspecto. Con los viajeros del repo se ve igual,
  // con codigos de mentira y avisando de que lo son.
  const esOwner = rol === 'owner' || modoLocal

  useEffect(() => {
    if (!esOwner) return
    if (modoLocal) {
      setGente(TRAVELERS.filter((t) => t.age >= 18).map((t, i) => ({
        id: t.id, short: t.short, age: t.age, color: t.color,
        codigo: 'XXXX0000', uid: i < 3 ? 'demo' : null,
      })))
      return
    }
    verGente(tripId).then((r) => setGente(r.gente)).catch((e) => setError(e?.message ?? 'no se pudo'))
  }, [tripId, esOwner, modoLocal])

  const soltar = async (p) => {
    setOcupado(p.id)
    try {
      await desvincular(tripId, p.id)
      const r = await verGente(tripId)
      setGente(r.gente)
    } catch (e) {
      setError(e?.message ?? 'no se pudo')
    }
    setOcupado(null)
  }

  return (
    <div className="aj">
      <p className="aj-hero">
        <strong>{yo?.short ?? 'Sin identificar'}</strong>
        {rol && <> · {rol === 'owner' ? 'organiza el viaje' : 'viaja y vota'}</>}
      </p>

      {esOwner && (
        <section className="aj-bloque">
          <h2 className="aj-titulo">Quién ha entrado</h2>
          <p className="aj-nota">
            Manda a cada uno <strong>solo su código</strong>. Un código compartido
            vuelve a ser el problema de antes.
          </p>
          {modoLocal && <p className="aj-fallo">Modo local: los códigos de abajo son de mentira.</p>}

          {!gente && !error && <p className="aj-nota">Un momento…</p>}
          {error && <p className="aj-fallo">{error}</p>}

          <ul className="aj-lista">
            {gente?.map((p) => (
              <li key={p.id} className={`aj-fila ${p.uid ? 'es-dentro' : ''}`}>
                <span className="aj-punto" style={p.color ? { background: p.color } : undefined} />
                <span className="aj-quien">
                  <strong>{p.short}</strong>
                  <em>{p.uid ? 'Ya entró' : p.codigo ? 'Sin entrar' : 'No tiene cuenta'}</em>
                </span>
                {p.codigo && <Codigo valor={p.codigo} />}
                {p.uid && p.id !== yo?.id && (
                  <button
                    type="button"
                    className="aj-soltar"
                    disabled={ocupado === p.id}
                    onClick={() => soltar(p)}
                  >
                    {ocupado === p.id ? '…' : 'Soltar'}
                  </button>
                )}
              </li>
            ))}
          </ul>

          <p className="aj-nota">
            <strong>Soltar</strong> no borra nada: los votos y los planes de esa
            persona siguen ahí. Solo libera el nombre para que lo coja quien toca.
          </p>
        </section>
      )}

      {!esOwner && !modoLocal && (
        <p className="aj-nota">
          Los códigos y los enlaces los gestiona quien organiza el viaje.
        </p>
      )}

      <button type="button" className="aj-salir" onClick={salir} disabled={modoLocal}>
        {modoLocal ? 'Modo local' : 'Salir de la sesión'}
      </button>
    </div>
  )
}

/**
 * El codigo, copiable de un toque.
 *
 * El caso de uso de esta pantalla es «mandarle a cada uno el suyo»: si hay que
 * seleccionar ocho caracteres a mano en un movil, la pantalla no sirve para lo
 * unico que tiene que servir.
 */
function Codigo({ valor }) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1600)
    } catch {
      // Sin permiso de portapapeles no pasa nada: el codigo sigue a la vista.
      setCopiado(false)
    }
  }

  return (
    <button type="button" className={`aj-codigo ${copiado ? 'es-copiado' : ''}`} onClick={copiar}
      title="Copiar para mandárselo">
      {copiado ? 'copiado' : valor}
    </button>
  )
}
