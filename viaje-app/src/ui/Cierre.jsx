import { useState } from 'react'
import { moverEstadoPlan, motivoPlan, quitarPlan, quitarRuta } from '../services/planes.js'

/**
 * Los botones que cambian un momento de la agenda: confirmar, devolverlo a
 * propuesto, editarlo y quitarlo.
 *
 * Vivia dentro de `VotoDelPlan`, y ese era el fallo: solo se pintaba cuando
 * habia votacion, o sea, solo mientras el plan estuviera PROPUESTO. En cuanto
 * alguien lo confirmaba desaparecian todos los botones y el momento quedaba
 * congelado. Ahora es un componente aparte que no sabe nada de votos.
 *
 * EL SEGUNDO TOQUE. Cualquier adulto puede quitar cualquier cosa, incluido el
 * Vueling de 431,91 €. Lo que separa eso de un accidente no es un permiso, es
 * una pregunta: las acciones marcadas `peligroso` piden confirmacion antes de
 * ejecutarse. Quien decide cuales lo son es `accionesDe`, que es puro y esta
 * probado — aqui no se vuelve a razonar sobre reservas.
 */
export default function Cierre({ evento, acciones, tripId, uid, editando, alEditar }) {
  const [trabajando, setTrabajando] = useState(null)
  const [pidiendo, setPidiendo] = useState(null)
  const [fallo, setFallo] = useState(null)
  // Los botones de gestion viven PLEGADOS detras de un banner (peticion de
  // Camilo, 1 sept): con «Volver a proponer · Editar · Quitar» siempre a la
  // vista, cada tarjeta parecia un panel de administracion. Cerrar el banner
  // suelta tambien la pregunta de seguridad: un «¿Seguro?» colgando de un
  // panel que ya no se ve es una trampa.
  const [gestionando, setGestionando] = useState(false)

  const botones = acciones.filter((a) => ['estado', 'editar', 'quitar', 'quitar-ruta'].includes(a.tipo))
  if (botones.length === 0) return null

  // Quien decide que es discreto es el dominio, no este componente.
  const visibles = botones.filter((a) => !a.discreta)
  const discretas = botones.filter((a) => a.discreta)

  const hacer = async (a) => {
    if (a.tipo === 'editar') return alEditar?.(true)
    setPidiendo(null)
    setTrabajando(a.id)
    setFallo(null)
    try {
      if (a.tipo === 'estado') await moverEstadoPlan(tripId, evento.id, a.a)
      if (a.tipo === 'quitar') await quitarPlan(tripId, evento.id)
      if (a.tipo === 'quitar-ruta') {
        const r = await quitarRuta(tripId, a.rutaId)
        // Lo que ya se confirmo no se borra, y hay que decirlo: si no,
        // desaparecen cuatro paradas de seis y parece que fallo a medias.
        if (r?.intocables > 0) setFallo(`Quité ${r.borradas}; ${r.intocables} las dejo.`)
      }
    } catch (e) {
      setFallo(motivoPlan(e))
    }
    setTrabajando(null)
  }

  const pulsar = (a) => (a.peligroso ? setPidiendo(a) : hacer(a))

  const plegar = () => {
    setGestionando(false)
    setPidiendo(null)
  }

  if (editando) return null

  if (pidiendo) {
    return (
      <div className="acc-seguro">
        <p className="acc-seguro-txt">
          {pidiendo.aviso ?? `«${pidiendo.etiqueta}»: esto no se puede deshacer.`}
        </p>
        <div className="acc-seguro-btns">
          <button type="button" className="acc-si" onClick={() => hacer(pidiendo)}>
            Sí, {pidiendo.etiqueta.toLowerCase()}
          </button>
          <button type="button" className="acc-no" onClick={() => setPidiendo(null)}>
            Mejor no
          </button>
        </div>
      </div>
    )
  }

  const boton = (a) => (
    <button
      key={a.id}
      type="button"
      className={CLASE[a.id] ?? 'acc-editar'}
      disabled={Boolean(trabajando)}
      onClick={() => pulsar(a)}
    >
      {trabajando === a.id ? 'Un momento…' : a.etiqueta}
    </button>
  )

  return (
    <>
      {(visibles.length > 0 || discretas.length > 0) && (
        <div className="acc-cierre">
          {visibles.map(boton)}
          {discretas.length > 0 && !gestionando && (
            <button
              type="button"
              className="acc-gestion"
              aria-expanded={false}
              onClick={() => setGestionando(true)}
            >
              <span>Editar o quitar</span>
              <span className="acc-gestion-ir" aria-hidden="true">›</span>
            </button>
          )}
        </div>
      )}

      {gestionando && discretas.length > 0 && (
        <div className="acc-cierre acc-desplegado">
          {discretas.map(boton)}
          <button type="button" className="acc-plegar" onClick={plegar}>
            Ocultar
          </button>
        </div>
      )}

      {fallo && <p className="acc-fallo">{fallo}</p>}
    </>
  )
}

/**
 * Cada boton con su peso visual. `confirmar` es el unico lleno: es la accion
 * que se espera. `quitar-ruta` ocupa su propia fila porque se lleva hasta
 * seis momentos por delante y no puede compartir sitio con el que quita solo
 * este.
 */
const CLASE = {
  confirmar: 'acc-cerrar',
  desconfirmar: 'acc-editar',
  editar: 'acc-editar',
  quitar: 'acc-quitar',
  'quitar-ruta': 'acc-quitar-ruta',
}
