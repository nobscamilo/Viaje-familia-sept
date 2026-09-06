import { useRef, useState } from 'react'
import MiniMapa from './MiniMapa.jsx'
import Lugar from './LugarTarjeta.jsx'
import { pedirMasLugares } from '../services/copiloto.js'
import './sitios-copiloto.css'

/** Amplía una búsqueda concreta sin reinterpretarla con Gemini. */
export default function SitiosCopiloto({ tarjetas, busquedas, tripId, conMapa, alAgregar, alCambiar }) {
  const [elegido, setElegido] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [fallo, setFallo] = useState(null)
  const [aviso, setAviso] = useState('')
  const cerrojo = useRef(false)
  const carril = useRef(null)
  const mas = async (busqueda, indice) => {
    if (cerrojo.current) return
    cerrojo.current = true
    setOcupado(true)
    setFallo(null)
    try {
      const r = await pedirMasLugares(tripId, busqueda)
      if (r.error || !r.busqueda || !Array.isArray(r.tarjetas)) throw new Error('respuesta-incompleta')
      const ids = new Set(tarjetas.map((l) => l.placeId))
      const nuevas = r.tarjetas.filter((l) => !ids.has(l.placeId))
      alCambiar({ tarjetas: [...tarjetas, ...nuevas], busquedas: busquedas.map((b, i) => i === indice ? r.busqueda : b) })
      setAviso(nuevas.length ? `${nuevas.length} opciones nuevas. ${tarjetas.length + nuevas.length} en total.` : 'No hay más opciones para esta búsqueda. Prueba otra zona o tipo de sitio.')
      requestAnimationFrame(() => {
        carril.current?.children[tarjetas.length]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
      })
    } catch {
      setFallo('No pude buscar más sitios. Inténtalo de nuevo; las opciones anteriores siguen aquí.')
    } finally {
      cerrojo.current = false
      setOcupado(false)
    }
  }
  return <>
    {conMapa && <MiniMapa lugares={tarjetas} elegido={elegido} alElegir={setElegido} />}
    <p className="cop-opciones">{tarjetas.length} opciones · desliza para comparar</p>
    <ul ref={carril} className={`cop-lugares ${tarjetas.length > 1 ? 'es-carrusel' : ''}`}>
      {tarjetas.map((l) => <Lugar key={l.placeId} lugar={l} tripId={tripId} alAgregar={alAgregar}
        elegido={elegido === l.placeId} alElegir={setElegido} />)}
    </ul>
    <div className="cop-mas-opciones">
      {busquedas.map((b, i) => b.agotada
        ? <p key={i} className="cop-opciones">Has visto las opciones disponibles{busquedas.length > 1 ? ` para «${b.consulta}»` : ''}. Puedes probar otra zona o tipo de sitio.</p>
        : <button key={i} type="button" disabled={ocupado} onClick={() => mas(b, i)}>
          {ocupado ? 'Buscando más…' : 'Ver 5 opciones más'}{busquedas.length > 1 ? ` · ${b.consulta}` : ''}
        </button>)}
      <span role="status" className="cop-opciones">{aviso}</span>
      {fallo && <p role="alert" className="cop-fallo">{fallo}</p>}
    </div>
  </>
}
