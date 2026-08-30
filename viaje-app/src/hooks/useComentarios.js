import { useCallback, useEffect, useState } from 'react'
import { comentar as escribirComentario, suscribirComentarios } from '../services/tripRepo.js'
import { useTrip } from './useTrip.js'

/** Hilo de una decisión. Solo se suscribe cuando la tarjeta está abierta. */
export function useComentarios(decisionId, activo = true) {
  const { tripId, user, yo } = useTrip()
  const [comentarios, setComentarios] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!decisionId || !activo) return undefined
    return suscribirComentarios(tripId, decisionId, setComentarios, setError)
  }, [tripId, decisionId, activo])

  const enviar = useCallback(async (texto) => {
    if (!user || !yo) return
    try {
      await escribirComentario(tripId, decisionId, { uid: user.uid, travelerId: yo.id, text: texto })
    } catch (e) {
      setError(e)
    }
  }, [tripId, decisionId, user, yo])

  return { comentarios, enviar, error }
}
