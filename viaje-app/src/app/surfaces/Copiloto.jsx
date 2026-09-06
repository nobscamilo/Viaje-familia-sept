import { useEffect, useRef, useState } from 'react'
import { useTrip } from '../../hooks/useTrip.js'
import { useHilo } from '../../hooks/useHilo.js'
import { useAhora } from '../../hooks/useAhora.js'
import { formatDay } from '../../domain/dates.js'
import SitiosCopiloto from '../../ui/SitiosCopiloto.jsx'
import BienvenidaCopiloto from '../../ui/BienvenidaCopiloto.jsx'
import { contextoVivo, restaurarConversacion } from '../../domain/hilo.js'
import ReciboRuta from '../../ui/ReciboRuta.jsx'
import BorradorRuta from '../../ui/BorradorRuta.jsx'
import BorradorPlan from '../../ui/BorradorPlan.jsx'
import { motivoPlan, quitarPlan } from '../../services/planes.js'
import { preguntarCopiloto } from '../../services/copiloto.js'
import Icon from '../../ui/Icon.jsx'
import Marcado from '../../ui/Marcado.jsx'
import './copiloto.css'

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
  const { ahora } = useAhora()
  const { mensajes, setMensajes, cargando, errorGuardado, guardar, olvidar, reintentar } = useHilo(ahora)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const finRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensajes.length, pensando])

  // Carga diferida: la conversacion de ejemplo son unos kilobytes de fotos y
  // texto que no pinta nada en produccion. Con `import()` solo se descarga si
  // alguien pide `?demo`, y no viaja en el paquete de arranque.
  useEffect(() => {
    if (!modoLocal || !demoPedida()) return
    import('../../data/demo-copiloto.js').then((m) => setMensajes(m.DEMO))
  }, [modoLocal, setMensajes])

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
    if (!limpio || pensando || cargando || modoLocal) return

    const t = ahora.getTime()
    const mio = { rol: 'yo', texto: limpio, en: t }
    const nuevos = [...restaurarConversacion(mensajes, ahora), mio]
    setMensajes(nuevos)
    setTexto('')
    setPensando(true)
    guardar(mio)

    try {
      const r = await preguntarCopiloto(tripId, contextoVivo(nuevos, ahora))
      const suyo = {
        rol: 'copiloto', en: ahora.getTime(),
        texto: r.texto,
        busquedas: r.busquedas,
        tarjetas: r.tarjetas,
        rutas: r.rutas,
        propuestas: r.propuestas,
        planes: r.planes,
        itinerarios: r.itinerarios,
        borradores: r.borradores,
        borradoresPlan: r.borradoresPlan,
      }
      setMensajes((ms) => [...ms, suyo])
      guardar(suyo)
    } catch (e) {
      setMensajes((ms) => [...ms, {
        rol: 'copiloto',
        texto: `No pude responder: ${e?.message ?? 'error desconocido'}`,
        fallo: true, en: ahora.getTime(),
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

  /**
   * Empezar de cero. La conversacion se acaba sola tras unas horas, pero a
   * veces se quiere cortar AHORA: cambias de tema y no te apetece que la
   * pregunta anterior siga pesando en la respuesta.
   *
   * Va arriba y pegajoso —alcanzable con el hilo largo— y lo mas lejos
   * posible del boton de enviar. No pide confirmacion a proposito: lo que se
   * pierde es contexto, no datos. Los planes estan en la agenda, los gastos
   * en las cuentas y las decisiones en Decisiones. Los borradores pendientes
   * se conservan fuera de la conversación hasta guardarlos o descartarlos.
   */
  const empezarDeCero = async () => {
    setBorrando(true)
    setTexto('')
    await olvidar()
    setBorrando(false)
  }

  return (
    <div className="cop">
      {/* Fila propia, FUERA del hilo. Empezo pegajosa dentro del scroll y la
          captura lo desmonto: el mensaje de abajo pasaba por debajo y se leia
          encima de «Empezar de cero», y quedaba una franja de 16 px —el
          padding del hilo— por la que se colaba el texto. Con el cristal de
          las tarjetas el truco funciona porque flotan sobre el fondo; sobre
          texto en movimiento, no. */}
      {mensajes.length > 0 && (
        <div className="cop-sesion">
          <span className="cop-sesion-txt">Conversación de ahora</span>
          <button
            type="button"
            className="cop-limpiar"
            disabled={borrando || pensando}
            onClick={empezarDeCero}
          >
            {borrando ? 'Borrando…' : 'Empezar de cero'}
          </button>
        </div>
      )}

      <div className="cop-hilo">
        {cargando && <p role="status">Recuperando tu conversación…</p>}
        {!cargando && mensajes.length === 0 && <BienvenidaCopiloto yo={yo} alElegir={preguntar} desactivado={modoLocal} />}
        {errorGuardado && <div role="alert" className="cop-fallo">{errorGuardado}<button type="button" className="cop-limpiar" onClick={reintentar}>Reintentar guardado</button></div>}

        {mensajes.map((m, i) => (
          <Mensaje
            key={m.id ?? (m.en ? `${m.rol}-${m.en}` : i)}
            mensaje={m}
            conMapa={i === ultimoConSitios}
            tripId={tripId}
            alAgregar={(plan) => anadirRecibo(i, plan)}
            alQuitar={(id) => borrarRecibo(i, id)}
            alSoltar={(lista, j) => soltarBorrador(i, lista, j)}
            alCambiar={(cambios) => setMensajes((ms) => ms.map((m, k) => k === i ? { ...m, ...cambios } : m))}
          />
        ))}

        {pensando && (
          <div className="cop-thinking-wrap" role="status" aria-label="Copiloto pensando">
            <div className="cop-thinking-glow" aria-hidden="true" />
            <div className="cop-thinking-card">
              <div className="cop-thinking-head">
                <div className="cop-thinking-ico-box">
                  <Icon name="activity" size={18} />
                  <span className="cop-thinking-live-pulse" aria-hidden="true" />
                </div>
                <div className="cop-thinking-txt-col">
                  <div className="cop-thinking-top-row">
                    <span className="cop-thinking-titulo">Análisis de Confort Familiar</span>
                    <span className="cop-thinking-tag">En vivo</span>
                  </div>
                  <span className="cop-pensando">
                    Pensando recomendaciones y evaluando accesibilidad<i /><i /><i />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      <form
        className="cop-barra"
        onSubmit={(e) => { e.preventDefault(); preguntar() }}
      >
        <div className="cop-barra-campo-wrap">
          <span className="cop-barra-search-ico" aria-hidden="true">
            <Icon name="search" size={17} />
          </span>
          <input
            className="cop-campo"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={modoLocal ? 'Modo local: sin copiloto' : 'Pregunta al copiloto sobre traslados, reservas o ritmo…'}
            aria-label="Pregunta al copiloto"
            disabled={modoLocal || pensando || cargando}
          />
        </div>
        <button type="submit" className="cop-enviar" disabled={!texto.trim() || pensando || modoLocal || cargando}>
          <span>Consultar</span>
          <span className="cop-enviar-flecha" aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  )
}

const MODO = { metro: 'transport', transporte: 'transport', coche: 'transport', andando: 'activity' }

function Mensaje({ mensaje, tripId, alAgregar, alQuitar, alSoltar, alCambiar, conMapa = false }) {
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

      {mensaje.tarjetas?.length > 0 && <SitiosCopiloto
        tarjetas={mensaje.tarjetas} busquedas={mensaje.busquedas ?? []}
        tripId={tripId} conMapa={conMapa} alAgregar={alAgregar} alCambiar={alCambiar}
      />}

      {/* Lo que el copiloto PROPONE y todavia no ha escrito. Va antes que
          los recibos a proposito: lo que espera una decision pesa mas que lo
          que ya esta hecho. */}
      {mensaje.borradores?.map((b, j) => (
        <BorradorRuta
          key={b.id ?? `${b.titulo}-${b.fecha}`}
          ruta={b}
          tripId={tripId}
          alDescartar={() => alSoltar?.('borradores', j)}
          alCambiar={(ruta) => alCambiar({ borradores: mensaje.borradores.map((b, k) => k === j ? ruta : b) })}
          alGuardada={(ruta) => alCambiar({ borradores: mensaje.borradores.filter((_, k) => k !== j), itinerarios: [...(mensaje.itinerarios ?? []), ruta] })}
        />
      ))}

      {mensaje.borradoresPlan?.map((b, j) => (
        <BorradorPlan
          key={b.id ?? `${b.titulo}-${b.placeId}`}
          plan={b}
          tripId={tripId}
          alAgregado={(plan) => { alAgregar?.(plan); alSoltar?.('borradoresPlan', j) }}
          alDescartar={() => alSoltar?.('borradoresPlan', j)}
          alCambiar={(plan) => alCambiar({ borradoresPlan: mensaje.borradoresPlan.map((b, k) => k === j ? plan : b) })}
        />
      ))}

      {/* Una ruta entera: un recibo, no seis planes sueltos. */}
      {mensaje.itinerarios?.map((r) => (
        <ReciboRuta key={r.id} ruta={r} tripId={tripId} alQuitar={(id) => alCambiar({ itinerarios: mensaje.itinerarios.filter((r) => r.id !== id) })} />
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
