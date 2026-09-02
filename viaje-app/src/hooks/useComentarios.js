import { useCallback, useEffect, useState } from 'react'
import {
  borrarComentario, comentar as escribirComentario, editarComentario, suscribirComentarios,
} from '../services/tripRepo.js'
import { useTrip } from './useTrip.js'

/**
 * El hilo de una decisión o las notas de un momento de la agenda.
 *
 * `rama` dice de dónde cuelgan: 'decisions' o 'timeline'. Es el mismo
 * parámetro que ya llevaban los votos desde que los planes propuestos se
 * votan, y por la misma razón — dos sitios, una sola forma.
 *
 * Solo se suscribe cuando hace falta: en «Ahora» hay hasta diecisiete
 * tarjetas y abrir diecisiete escuchas de Firestore por entrar a la agenda
 * sería pagar por lo que casi nadie mira.
 */
export function useComentarios(id, activo = true, rama = 'decisions') {
  const { tripId, user, yo } = useTrip()
  const [comentarios, setComentarios] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id || !activo) return undefined
    return suscribirComentarios(tripId, id, setComentarios, setError, rama)
  }, [tripId, id, activo, rama])

  const enviar = useCallback(async (texto) => {
    if (!user || !yo) return
    try {
      await escribirComentario(tripId, id, { uid: user.uid, travelerId: yo.id, text: texto, rama })
    } catch (e) {
      setError(e)
    }
  }, [tripId, id, user, yo, rama])

  const editar = useCallback(async (comentarioId, texto) => {
    if (!user) return
    try {
      await editarComentario(tripId, id, comentarioId, { text: texto, uid: user.uid, rama })
    } catch (e) {
      setError(e)
    }
  }, [tripId, id, user, rama])

  const borrar = useCallback(async (comentarioId) => {
    try {
      await borrarComentario(tripId, id, comentarioId, { rama })
    } catch (e) {
      setError(e)
    }
  }, [tripId, id, rama])

  return { comentarios, enviar, editar, borrar, error }
}
