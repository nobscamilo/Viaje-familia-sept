import { useCallback, useEffect, useState } from 'react'
import { firebaseListo, getFb } from '../services/firebase.js'
import { hiloRef } from '../services/paths.js'
import { sesionActual } from '../domain/hilo.js'
import { useTrip } from './useTrip.js'

/** Cuántas intervenciones se guardan y se releen. */
const TOPE = 60

/**
 * El hilo del copiloto, guardado y personal.
 *
 * Antes vivía en memoria: recargar la página borraba la conversación, y con
 * ella el contexto. Preguntabas «¿y en metro?» después de recargar y el
 * copiloto no sabía de qué hablabas.
 *
 * Es de cada uno, no del viaje: nadie más lo lee, ni quien organiza. Las
 * reglas de Firestore lo garantizan; esto solo es la parte cómoda.
 *
 * Desde el 1 de septiembre **solo vuelve la conversación viva**, no el
 * historial entero: `sesionActual()` corta por silencio largo o cambio de
 * día. Lo anterior sigue en Firestore —no se borra a espaldas de nadie— pero
 * ni se pinta ni viaja al modelo. Abrir el copiloto tenía que ser empezar,
 * no encontrarse lo de anteayer.
 */
export function useHilo() {
  const { tripId, yo } = useTrip()
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    if (!firebaseListo || !yo?.id) { setCargando(false); return () => {} }

    getFb().then(async (fb) => {
      if (!fb || !vivo) return
      try {
        const q = fb.fs.query(hiloRef(fb, tripId, yo.id), fb.fs.orderBy('createdAt', 'desc'), fb.fs.limit(TOPE))
        const snap = await fb.fs.getDocs(q)
        if (!vivo) return
        // Se piden los últimos y se les da la vuelta: Firestore no sabe
        // ordenar descendente y devolver el principio.
        const todos = snap.docs.map((d) => {
          const dato = d.data()
          // `createdAt` es un Timestamp de Firestore; el dominio quiere
          // milisegundos y nada más. Recién escrito puede venir null: el
          // servidor todavía no ha puesto la hora.
          return { id: d.id, ...dato, en: dato.createdAt?.toMillis?.() ?? null }
        }).reverse()
        setMensajes(sesionActual(todos, new Date()))
      } catch {
        // Un hilo que no carga no puede impedir hablar con el copiloto.
      }
      if (vivo) setCargando(false)
    })
    return () => { vivo = false }
  }, [tripId, yo?.id])

  const guardar = useCallback(async (mensaje) => {
    if (!firebaseListo || !yo?.id) return
    const fb = await getFb()
    if (!fb) return
    try {
      await fb.fs.addDoc(hiloRef(fb, tripId, yo.id), {
        rol: mensaje.rol,
        texto: String(mensaje.texto ?? '').slice(0, 4000),
        createdAt: fb.fs.serverTimestamp(),
      })
    } catch {
      // Si no se guarda, la conversación sigue en pantalla. Se pierde al
      // recargar, que es exactamente como estaba antes: nunca peor.
    }
  }, [tripId, yo?.id])

  /**
   * Empezar de cero: borra el hilo entero, no solo la sesión viva.
   *
   * Llevaba semanas escrita y sin un solo botón que la llamara — el mismo
   * fallo que el borrado de gastos en agosto. Ahora lo tiene, en la cabecera
   * del hilo y lejos del botón de enviar.
   */
  const olvidar = useCallback(async () => {
    setMensajes([])
    if (!firebaseListo || !yo?.id) return
    const fb = await getFb()
    if (!fb) return
    const snap = await fb.fs.getDocs(hiloRef(fb, tripId, yo.id))
    await Promise.all(snap.docs.map((d) => fb.fs.deleteDoc(d.ref)))
  }, [tripId, yo?.id])

  return { guardados: mensajes, cargando, guardar, olvidar }
}
