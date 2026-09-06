import { useCallback, useEffect, useRef, useState } from 'react'
import { firebaseListo, getFb } from '../services/firebase.js'
import { hiloRef } from '../services/paths.js'
import { pendientes, restaurarConversacion, estadoSerializable } from '../domain/hilo.js'
import { escribirEstado } from '../services/estado-copiloto.js'
import { useTrip } from './useTrip.js'

/** Estado privado del copiloto. Los mensajes legacy siguen disponibles como respaldo.
 * La instantánea conserva borradores y cambios; no almacena fotos efímeras de Places.
 * Las escrituras se serializan para que una respuesta lenta no reponga un borrador descartado.
 */
export function useHilo(ahora = new Date()) {
  const { tripId, yo } = useTrip()
  const [mensajes, setMensajes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorGuardado, setErrorGuardado] = useState(null)
  const cola = useRef(Promise.resolve())
  const destino = useRef(null)
  const ultimoSerializado = useRef(null)
  const ahoraRef = useRef(ahora)
  ahoraRef.current = ahora

  useEffect(() => {
    let vivo = true
    destino.current = null
    ultimoSerializado.current = null
    setMensajes([])
    setCargando(true)
    setErrorGuardado(null)
    if (!firebaseListo || !yo?.id) { setCargando(false); return () => {} }
    getFb().then(async (fb) => {
      if (!fb || !vivo) return
      const ref = fb.fs.doc(fb.db, `trips/${tripId}/hilos/${yo.id}/estado/actual`)
      try {
        const estado = await fb.fs.getDoc(ref)
        let todos
        if (estado.exists()) todos = estado.data().mensajes ?? []
        else {
          const q = fb.fs.query(hiloRef(fb, tripId, yo.id), fb.fs.orderBy('createdAt', 'desc'), fb.fs.limit(60))
          const snap = await fb.fs.getDocs(q)
          todos = snap.docs.map((d) => ({ ...d.data(), en: d.data().createdAt?.toMillis?.() ?? null })).reverse()
        }
        if (!vivo) return
        destino.current = { fb, ref, revision: estado.data()?.revision ?? 0 }
        const inicial = restaurarConversacion(todos, ahoraRef.current)
        ultimoSerializado.current = JSON.stringify(estadoSerializable(inicial))
        setMensajes(inicial)
      } catch {
        if (vivo) setErrorGuardado('No pude recuperar la conversación. Recarga antes de seguir para conservar tus borradores.')
      }
      if (vivo) setCargando(false)
    }).catch(() => {
      if (vivo) { setErrorGuardado('No pude conectar con tu conversación. Recarga para intentarlo de nuevo.'); setCargando(false) }
    })
    return () => { vivo = false }
  }, [tripId, yo?.id])

  useEffect(() => {
    if (cargando || !destino.current) return
    const destinoActual = destino.current
    const { fb, ref } = destinoActual
    const datos = estadoSerializable(mensajes)
    const json = JSON.stringify(datos)
    if (ultimoSerializado.current === json) return
    ultimoSerializado.current = json

    cola.current = cola.current.catch(() => {}).then(async () => {
      try {
        if (destino.current !== destinoActual) return
        destinoActual.revision = await escribirEstado(fb, ref, datos, destinoActual.revision)
        if (destino.current === destinoActual) setErrorGuardado(null)
      } catch (e) {
        if (destino.current === destinoActual) setErrorGuardado(e.message === 'conversacion-cambiada'
          ? 'La conversación cambió en otra pestaña. Copia lo pendiente antes de recargar; no he sobrescrito sus cambios.'
          : 'No se guardaron los últimos cambios. Mantén esta pestaña abierta e inténtalo de nuevo.')
      }
    })
  }, [mensajes, cargando])

  // El historial sigue siendo inmutable. Caducar el contexto no borra lo dicho.
  const guardar = useCallback(async (mensaje) => {
    if (!firebaseListo || !yo?.id) return
    try {
      const fb = await getFb()
      if (fb) await fb.fs.addDoc(hiloRef(fb, tripId, yo.id), {
        rol: mensaje.rol, texto: String(mensaje.texto ?? '').slice(0, 4000),
        createdAt: fb.fs.serverTimestamp(),
      })
    } catch { /* la instantánea mantiene el estado operativo y muestra sus fallos */ }
  }, [tripId, yo?.id])

  const olvidar = useCallback(() => {
    // Cortar la charla no borra el trabajo pendiente: se descarta en su tarjeta.
    setMensajes((ms) => pendientes(ms))
  }, [])

  return { mensajes, setMensajes, cargando, errorGuardado, guardar, olvidar, reintentar: () => setMensajes((ms) => [...ms]) }
}
