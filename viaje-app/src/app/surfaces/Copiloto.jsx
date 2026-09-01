import { useEffect, useRef, useState } from 'react'
import { useTrip } from '../../hooks/useTrip.js'
import { useHilo } from '../../hooks/useHilo.js'
import { formatDay } from '../../domain/dates.js'
import AgregarPlan from '../../ui/AgregarPlan.jsx'
import MiniMapa from '../../ui/MiniMapa.jsx'
import ReciboRuta from '../../ui/ReciboRuta.jsx'
import BorradorRuta from '../../ui/BorradorRuta.jsx'
import BorradorPlan from '../../ui/BorradorPlan.jsx'
import { motivoPlan, quitarPlan } from '../../services/planes.js'
import { preguntarCopiloto } from '../../services/copiloto.js'
import Icon from '../../ui/Icon.jsx'
import { miles, plural } from '../../domain/cuentas.js'
import Marcado from '../../ui/Marcado.jsx'
import './copiloto.css'

const ATAJOS = [
  'Dónde cenamos cerca de Sol con dos niños',
  '¿Cuánto se tarda del apartamento a IFEMA en metro?',
  'Qué hacemos el viernes los que no vamos al circuito',
  'Un plan de mañana para mis papás, tranquilo',
  'Busca dónde cenar cerca de Sol y agrégalo al jueves',
]

/**
 * `?demo` carga una conversacion de ejemplo con datos reales de Places y
 * Routes. Solo en modo local: es para trabajar el aspecto sin tener que
 * hablar con el copiloto en cada iteracion. El estado vacio no dice nada del
 * diseno; lo que hay que ver son las fotos, las rutas y los avisos.
 */
const demoPedida = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('demo')

export default function Copiloto() {
  const { tripId, yo, modoLocal } = useTrip()
  const { guardados, cargando, guardar, olvidar } = useHilo()
  const [mensajes, setMensajes] = useState([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const finRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensajes, pensando])

  /**
   * El hilo guardado, al abrir.
   *
   * Antes la conversacion vivia solo en memoria: recargar la borraba, y con
   * ella el contexto. Preguntabas «¿y en metro?» despues de recargar y el
   * copiloto no sabia de que hablabas.
   *
   * Solo se vuelca si aun no se ha escrito nada en esta sesion: si alguien ya
   * esta hablando, una respuesta tardia del servidor no le va a pisar el hilo.
   */
  useEffect(() => {
    if (cargando || guardados.length === 0) return
    setMensajes((ms) => (ms.length === 0 ? guardados : ms))
  }, [cargando, guardados])

  // Carga diferida: la conversacion de ejemplo son unos kilobytes de fotos y
  // texto que no pinta nada en produccion. Con `import()` solo se descarga si
  // alguien pide `?demo`, y no viaja en el paquete de arranque.
  useEffect(() => {
    if (!modoLocal || !demoPedida()) return
    import('../../data/demo-copiloto.js').then((m) => setMensajes(m.DEMO))
  }, [modoLocal])

  /**
   * Un plan agregado desde una tarjeta se pega al mensaje que la enseño.
   * Si apareciera suelto al final del hilo, no se sabria de que sitio salio.
   */
  const anadirRecibo = (indice, plan) => setMensajes((ms) => ms.map((m, i) =>
    i === indice ? { ...m, planes: [...(m.planes ?? []), plan] } : m))

  const borrarRecibo = (indice, id) => setMensajes((ms) => ms.map((m, i) =>
    i === indice ? { ...m, planes: (m.planes ?? []).filter((p) => p.id !== id) } : m))

  /**
   * Descartar un borrador lo saca del hilo y ya esta: no habia nada escrito
   * que deshacer. Es justo lo que hace util el paso previo — decir que no
   * cuesta un toque y no deja rastro en la agenda de nadie.
   */
  const soltarBorrador = (indice, lista, j) => setMensajes((ms) => ms.map((m, i) =>
    i === indice ? { ...m, [lista]: (m[lista] ?? []).filter((_, k) => k !== j) } : m))

  const preguntar = async (pregunta) => {
    const limpio = (pregunta ?? texto).trim()
    if (!limpio || pensando) return

    const mio = { rol: 'yo', texto: limpio }
    const nuevos = [...mensajes, mio]
    setMensajes(nuevos)
    setTexto('')
    setPensando(true)
    guardar(mio)

    try {
      const r = await preguntarCopiloto(tripId, nuevos)
      const suyo = {
        rol: 'copiloto',
        texto: r.texto,
        tarjetas: r.tarjetas,
        rutas: r.rutas,
        propuestas: r.propuestas,
        planes: r.planes,
        itinerarios: r.itinerarios,
        borradores: r.borradores,
        borradoresPlan: r.borradoresPlan,
      }
      setMensajes([...nuevos, suyo])
      // Solo se guarda el texto: las fotos y las rutas se vuelven a pedir si
      // hacen falta, y guardarlas seria pagar almacenamiento por decoracion.
      guardar({ rol: 'copiloto', texto: r.texto })
    } catch (e) {
      setMensajes([...nuevos, {
        rol: 'copiloto',
        texto: `No pude responder: ${e?.message ?? 'error desconocido'}`,
        fallo: true,
      }])
    }
    setPensando(false)
  }

  /**
   * En que mensaje se pinta el mini mapa: en el ultimo que trajo sitios.
   *
   * Cada mapa cuenta contra el tope diario de Maps JS (300 cargas). Un hilo
   * de planificacion con un mapa por respuesta se lo come en una tarde, y los
   * de arriba ya no los mira nadie.
   */
  const ultimoConSitios = mensajes.reduce(
    (ultimo, m, i) => (m.tarjetas?.length > 0 ? i : ultimo), -1)

  return (
    <div className="cop">
      <div className="cop-hilo">
        {mensajes.length === 0 && <Bienvenida yo={yo} alElegir={preguntar} />}

        {mensajes.map((m, i) => (
          <Mensaje
            key={i}
            mensaje={m}
            conMapa={i === ultimoConSitios}
            tripId={tripId}
            alAgregar={(plan) => anadirRecibo(i, plan)}
            alQuitar={(id) => borrarRecibo(i, id)}
            alSoltar={(lista, j) => soltarBorrador(i, lista, j)}
          />
        ))}

        {pensando && (
          <div className="cop-msg cop-de-copiloto">
            <span className="cop-pensando">Buscando<i /><i /><i /></span>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <form
        className="cop-barra"
        onSubmit={(e) => { e.preventDefault(); preguntar() }}
      >
        <input
          className="cop-campo"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={modoLocal ? 'Modo local: sin copiloto' : 'Pregunta lo que sea del viaje…'}
          disabled={modoLocal || pensando}
        />
        <button type="submit" className="cop-enviar" disabled={!texto.trim() || pensando || modoLocal}>
          Enviar
        </button>
      </form>
    </div>
  )
}

function Bienvenida({ yo, alElegir }) {
  return (
    <div className="cop-inicio">
      <p className="cop-eyebrow">Copiloto</p>
      <h1 className="cop-titulo">Hola{yo ? `, ${yo.short}` : ''}.</h1>
      <p className="cop-lede">
        Conozco la agenda, quién viaja y qué falta por decidir. Busco sitios
        reales en Google Maps y calculo cuánto se tarda: no me invento nada.
      </p>
      <div className="cop-atajos">
        {ATAJOS.map((a) => (
          <button key={a} type="button" className="cop-atajo" onClick={() => alElegir(a)}>
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}

const MODO = { metro: 'transport', transporte: 'transport', coche: 'transport', andando: 'activity' }

function Mensaje({ mensaje, tripId, alAgregar, alQuitar, alSoltar, conMapa = false }) {
  const [elegido, setElegido] = useState(null)
  const mio = mensaje.rol === 'yo'
  return (
    <div className={`cop-msg ${mio ? 'cop-de-mi' : 'cop-de-copiloto'}`}>
      {/* Un punto morado en vez de fiarlo todo a la alineacion: en un hilo
          largo, dos parrafos alineados distinto se confunden. */}
      {!mio && <span className="cop-firma" aria-hidden="true" />}

      <Marcado texto={mensaje.texto} className={`cop-texto ${mensaje.fallo ? 'cop-fallo' : ''}`} />

      {mensaje.rutas?.length > 0 && (
        <div className="cop-rutas">
          {mensaje.rutas.map((r, i) => (
            <div key={i} className={`cop-ruta cop-modo-${r.modo ?? 'transporte'}`}>
              <Icon name={MODO[r.modo] ?? 'transport'} size={15} />
              <span className="cop-ruta-modo">{r.modo ?? 'ruta'}</span>
              <strong className="cop-ruta-dur">{r.duracion || r.duration}</strong>
              <span className="cop-ruta-km">{r.distancia || r.distance}</span>
            </div>
          ))}
        </div>
      )}

      {mensaje.tarjetas?.length > 0 && (
        <>
          {/* Donde caen, antes de decidir. Solo en el ultimo mensaje con
              sitios: lo decide quien pinta el hilo, por la cuota. */}
          {conMapa && (
            <MiniMapa lugares={mensaje.tarjetas} elegido={elegido} alElegir={setElegido} />
          )}
          <ul className={`cop-lugares ${mensaje.tarjetas.length > 1 ? 'es-carrusel' : ''}`}>
            {mensaje.tarjetas.map((l) => (
              <Lugar key={l.placeId} lugar={l} tripId={tripId} alAgregar={alAgregar}
                elegido={elegido === l.placeId} alElegir={setElegido} />
            ))}
          </ul>
        </>
      )}

      {/* Lo que el copiloto PROPONE y todavia no ha escrito. Va antes que
          los recibos a proposito: lo que espera una decision pesa mas que lo
          que ya esta hecho. */}
      {mensaje.borradores?.map((b, j) => (
        <BorradorRuta
          key={`br-${j}`}
          ruta={b}
          tripId={tripId}
          alDescartar={() => alSoltar?.('borradores', j)}
        />
      ))}

      {mensaje.borradoresPlan?.map((b, j) => (
        <BorradorPlan
          key={`bp-${j}`}
          plan={b}
          tripId={tripId}
          alAgregado={(plan) => { alAgregar?.(plan); alSoltar?.('borradoresPlan', j) }}
          alDescartar={() => alSoltar?.('borradoresPlan', j)}
        />
      ))}

      {/* Una ruta entera: un recibo, no seis planes sueltos. */}
      {mensaje.itinerarios?.map((r) => (
        <ReciboRuta key={r.id} ruta={r} tripId={tripId} />
      ))}

      {/* Lo que el copiloto HIZO no puede parecer una viñeta mas: es lo unico
          del hilo que cambia el viaje de verdad. */}
      {mensaje.planes?.map((p) => (
        <Recibo key={p.id} plan={p} tripId={tripId} alQuitar={alQuitar} />
      ))}

      {mensaje.propuestas?.map((p) => (
        <p key={p.id} className="cop-hecho cop-hecho-voto">
          <Icon name="alert" size={15} />
          <span>
            En Decisiones: <strong>{p.title}</strong>
            <em>Para que la familia lo vote</em>
          </span>
        </p>
      ))}
    </div>
  )
}

/**
 * La foto manda. Es lo unico verdaderamente visual que tiene esta app, y
 * antes iba en una miniatura de 84 px al lado del texto: no decidia nada.
 * Un sitio para cenar se escoge por la pinta que tiene.
 */
function Lugar({ lugar, tripId, alAgregar, elegido = false, alElegir }) {
  const resenas = lugar.userRatingCount
    ? `${miles(lugar.userRatingCount)} ${plural(lugar.userRatingCount, 'reseña', 'reseñas')}`
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

/**
 * Lo que quedo en la agenda, con su papelera al lado.
 *
 * Deshacer va pegado a hacer: si no se puede quitar, nadie se atreve a dejar
 * que la app le escriba en el plan del viaje. La papelera es lo que hace
 * usable el boton de crear.
 */
function Recibo({ plan, tripId, alQuitar }) {
  const [estado, setEstado] = useState(null)

  const quitar = async () => {
    setEstado('quitando')
    try {
      await quitarPlan(tripId, plan.id)
      alQuitar?.(plan.id)
    } catch (e) {
      setEstado(motivoPlan(e))
    }
  }

  return (
    <p className="cop-hecho cop-hecho-plan">
      <Icon name="activity" size={15} />
      <span>
        En la agenda: <strong>{plan.title}</strong>
        {/* `2026-09-10 13:00` es como lo guarda Firestore, no como lo lee una
            persona. Un dato en crudo en pantalla siempre es un olvido. */}
        {plan.fecha && (
          <span className="cop-cuando">{formatDay(plan.fecha)}{plan.hora ? ` · ${plan.hora}` : ''}</span>
        )}
        <em>{estado && estado !== 'quitando' ? estado : 'Propuesto hasta que alguien lo confirme'}</em>
      </span>
      {tripId && (
        <button type="button" className="cop-quitar" onClick={quitar} disabled={estado === 'quitando'}>
          {estado === 'quitando' ? '…' : 'Quitar'}
        </button>
      )}
    </p>
  )
}
