import { useEffect, useRef, useState } from 'react'
import { cargarMapas, mapasListo } from '../services/mapas.js'
import { ESTILO_OSCURO, pinNumerado } from '../services/estilo-mapa.js'
import './mini-mapa.css'

const COLOR = '#f0a05a'

/**
 * Los sitios sugeridos, en un mapa, ANTES de agregarlos.
 *
 * Hasta ahora un sitio solo aparecia en el mapa cuando ya estaba en la
 * agenda: para saber si tres restaurantes caian cerca del hotel habia que
 * meterlos, mirar el mapa y quitar dos. Escoger mirando donde caen es medio
 * criterio, y se estaba perdiendo entero.
 *
 * SOLO SE MONTA EN EL ULTIMO MENSAJE que trae sitios. Cada mapa que se pinta
 * cuenta contra el tope diario de Maps JS (300), y un hilo largo con un mapa
 * por respuesta se lo come en una tarde de planificacion. Lo decide quien
 * pinta el hilo, no este componente.
 */
export default function MiniMapa({ lugares = [], elegido = null, alElegir }) {
  const caja = useRef(null)
  const mapa = useRef(null)
  const marcas = useRef([])
  const [error, setError] = useState(mapasListo ? null : 'sin-clave')

  const puntos = lugares
    .map((l, i) => ({ ...l, numero: i + 1 }))
    .filter((l) => Number.isFinite(l.location?.lat) && Number.isFinite(l.location?.lng))

  useEffect(() => {
    if (!mapasListo || puntos.length === 0) return
    let vivo = true
    cargarMapas()
      .then((gm) => {
        if (!vivo || !caja.current) return
        mapa.current ??= new gm.Map(caja.current, {
          center: { lat: puntos[0].location.lat, lng: puntos[0].location.lng },
          zoom: 14,
          styles: ESTILO_OSCURO,
          disableDefaultUI: true,
          gestureHandling: 'cooperative',
        })

        for (const m of marcas.current) m.setMap(null)
        marcas.current = puntos.map((p) => {
          const activo = elegido === p.placeId
          const m = new gm.Marker({
            map: mapa.current,
            position: { lat: p.location.lat, lng: p.location.lng },
            title: p.name,
            zIndex: activo ? 99 : 1,
            icon: {
              url: pinNumerado(COLOR, p.numero),
              scaledSize: new gm.Size(activo ? 38 : 28, activo ? 47 : 35),
              anchor: new gm.Point(activo ? 19 : 14, activo ? 47 : 35),
            },
          })
          m.addListener('click', () => alElegir?.(p.placeId))
          return m
        })

        if (puntos.length > 1) {
          const b = new gm.LatLngBounds()
          for (const p of puntos) b.extend({ lat: p.location.lat, lng: p.location.lng })
          mapa.current.fitBounds(b, 36)
        }
      })
      .catch(() => vivo && setError('no-carga'))
    return () => { vivo = false }
    // `puntos` se recalcula en cada render; lo que importa es que cambien los
    // sitios o cual esta elegido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lugares, elegido])

  // Sin coordenadas no hay mapa que pintar, y un recuadro vacio con un mensaje
  // de error donde no hay error es peor que no poner nada.
  if (puntos.length === 0 || error) return null

  return (
    <div className="mm" ref={caja} role="application"
      aria-label={`Mapa con ${puntos.length} sitios sugeridos`} />
  )
}
