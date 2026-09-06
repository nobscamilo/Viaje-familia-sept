import { useEffect, useMemo, useRef, useState } from 'react'
import { useTrip } from '../../hooks/useTrip.js'
import { useAhora } from '../../hooks/useAhora.js'
import { cargarMapas, mapasListo } from '../../services/mapas.js'
import { ESTILO_OSCURO, pinNumerado } from '../../services/estilo-mapa.js'
import { diaPorDefecto, diasConPuntos, encuadre, puntosDelDia, puntosDelViaje, recorridos } from '../../domain/puntos.js'
import { formatDay, formatTime } from '../../domain/dates.js'
import Icon from '../../ui/Icon.jsx'
import './mapa.css'

const COLOR = {
  flight: '#7c8cff', lodging: '#2ec4a6', f1: '#a78bfa',
  transport: '#7c8cff', activity: '#f0a05a', food: '#f0a05a',
}

export default function Mapa() {
  const { timeline } = useTrip()
  const { ahora } = useAhora(60_000)
  const dias = useMemo(() => diasConPuntos(timeline), [timeline])
  const [dia, setDia] = useState(null)
  const [elegido, setElegido] = useState(null)

  // El dia por defecto depende del reloj, y el reloj tarda un tick en llegar.
  useEffect(() => { if (dia === null && dias.length) setDia(diaPorDefecto(timeline, ahora)) }, [dia, dias, timeline, ahora])

  const puntos = useMemo(
    () => (dia === 'todo' ? puntosDelViaje(timeline) : dia ? puntosDelDia(timeline, dia) : []),
    [timeline, dia],
  )

  return (
    <div className="mapa">
      <div className="mapa-dias" role="tablist" aria-label="Días del viaje">
        <button type="button" role="tab" aria-selected={dia === 'todo'}
          className={`mapa-dia ${dia === 'todo' ? 'es-activo' : ''}`} onClick={() => { setDia('todo'); setElegido(null) }}>
          Todo
        </button>
        {dias.map((d) => (
          <button key={d} type="button" role="tab" aria-selected={dia === d}
            className={`mapa-dia ${dia === d ? 'es-activo' : ''}`} onClick={() => { setDia(d); setElegido(null) }}>
            {formatDay(d)}
          </button>
        ))}
      </div>

      <Lienzo puntos={puntos} elegido={elegido} alElegir={setElegido} />

      <ol className="mapa-lista">
        {puntos.map((p) => (
          <li key={p.id} className="mapa-fila">
            <button type="button" className={`mapa-item ${elegido === p.id ? 'es-activo' : ''}`}
              onClick={() => setElegido(elegido === p.id ? null : p.id)}>
              <span className="mapa-num" style={{ background: COLOR[p.kind] ?? COLOR.activity }}>{p.numero}</span>
              <span className="mapa-txt">
                <strong>{p.titulo}</strong>
                <em>{[formatTime(p.start), p.address ?? p.etiqueta].filter(Boolean).join(' · ')}</em>
                {/* De que ruta es esta parada. Sin esto, seis momentos
                    seguidos de un domingo parecen seis planes sin relacion. */}
                {p.rutaNombre && (
                  <span className="mapa-ruta">{p.rutaNombre} · parada {p.rutaOrden}</span>
                )}
              </span>
              {p.status !== 'confirmado' && <span className="mapa-tag">{p.status}</span>}
            </button>

            {/* Aqui no dibujamos la ruta: se la pasamos a Google Maps, que
                tiene los horarios del metro en vivo y nosotros no. Fingir que
                somos un navegador seria enseñar una linea bonita y dejar a
                alguien esperando un metro que ya no pasa. */}
            {elegido === p.id && (
              <a className="mapa-ir" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                target="_blank" rel="noreferrer">
                Cómo llegar
              </a>
            )}
          </li>
        ))}
        {puntos.length === 0 && <li className="mapa-vacio">Ese día no hay nada con dirección.</li>}
      </ol>
    </div>
  )
}

function Lienzo({ puntos, elegido, alElegir }) {
  const caja = useRef(null)
  const mapa = useRef(null)
  const marcas = useRef([])
  const lineas = useRef([])
  const [error, setError] = useState(mapasListo ? null : 'sin-clave')
  // El mapa se crea en un `.then()`, asi que existe DESPUES del primer render.
  // Sin este estado el efecto de los marcadores corre una sola vez, cuando
  // todavia no hay mapa, y no vuelve: el mapa sale, pero vacio de pines.
  const [listo, setListo] = useState(false)

  useEffect(() => {
    if (!mapasListo || !caja.current) return
    let vivo = true
    cargarMapas()
      .then((gm) => {
        if (!vivo || mapa.current) return
        // Sin `mapId` a proposito: `styles` solo se aplica en mapas sin el,
        // y crear un Map ID hay que hacerlo a mano en la consola de Google.
        mapa.current = new gm.Map(caja.current, {
          center: { lat: 40.4165, lng: -3.7026 },
          zoom: 12,
          styles: ESTILO_OSCURO,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'cooperative',
        })
        setListo(true)
      })
      .catch(() => vivo && setError('no-carga'))
    return () => { vivo = false }
  }, [])

  useEffect(() => {
    const gm = window.google?.maps
    if (!gm || !mapa.current) return

    for (const m of marcas.current) m.setMap(null)
    for (const l of lineas.current) l.setMap(null)

    /**
     * Las paradas de una ruta, unidas y en orden.
     *
     * Seis pines sueltos no dicen en que orden se visitan; una linea si, y es
     * justo lo que se pide cuando se pide «una ruta». La linea va punteada y
     * por debajo de los pines: es contexto, no es el contenido.
     */
    lineas.current = recorridos(puntos).map((r) => new gm.Polyline({
      map: mapa.current,
      path: r.paradas.map((p) => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeOpacity: 0,
      zIndex: 0,
      icons: [{
        icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.9, strokeWeight: 2, scale: 3 },
        offset: '0',
        repeat: '14px',
      }],
      strokeColor: COLOR.activity,
    }))
    // Marcadores clasicos: los nuevos (AdvancedMarkerElement) exigen Map ID,
    // y el Map ID es incompatible con el estilo oscuro en codigo.
    marcas.current = puntos.map((p) => {
      const activo = elegido === p.id
      const m = new gm.Marker({
        map: mapa.current,
        position: { lat: p.lat, lng: p.lng },
        title: p.titulo,
        zIndex: activo ? 99 : 1,
        icon: {
          url: pinNumerado(COLOR[p.kind] ?? COLOR.activity, p.numero),
          scaledSize: new gm.Size(activo ? 42 : 32, activo ? 52 : 40),
          anchor: new gm.Point(activo ? 21 : 16, activo ? 52 : 40),
        },
      })
      m.addListener('click', () => alElegir(p.id))
      return m
    })

    const e = encuadre(puntos)
    if (!e) return
    if (e.unico) mapa.current.setCenter(e.centro), mapa.current.setZoom(15)
    else {
      mapa.current.fitBounds(
        new gm.LatLngBounds({ lat: e.sur, lng: e.oeste }, { lat: e.norte, lng: e.este }),
        48,
      )
    }
  }, [puntos, elegido, alElegir, listo])

  if (error) {
    return (
      <div className="mapa-lienzo mapa-error">
        <Icon name="alert" size={18} />
        <p>{error === 'sin-clave'
          ? 'El mapa no está configurado en esta copia. La lista de abajo sigue funcionando.'
          : 'No se pudo cargar el mapa. Mira la lista de abajo: las direcciones están ahí.'}</p>
      </div>
    )
  }

  return <div className="mapa-lienzo" ref={caja} role="application" aria-label="Mapa del viaje" />
}
