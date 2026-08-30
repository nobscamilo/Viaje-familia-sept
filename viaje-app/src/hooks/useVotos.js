import { useCallback, useEffect, useState } from 'react'
import { suscribirVotos, votar as escribirVoto } from '../services/tripRepo.js'
import { useTrip } from './useTrip.js'

/**
 * Votos de algo votable, como { travelerId: valor }.
 *
 * El valor es 'si' | 'no' | 'igual' en una decisión normal, y el id de la
 * opción elegida cuando la decisión trae varias. `rama` distingue si lo que
 * se vota es una decisión o un plan propuesto de la agenda.
 */
export function useVotos(decisionId, rama = 'decisions') {
  const { tripId, user, yo } = useTrip()
  const [votos, setVotos] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!decisionId) return undefined
    return suscribirVotos(tripId, decisionId, setVotos, setError, rama)
  }, [tripId, decisionId, rama])

  const votar = useCallback(
    async (value) => {
      if (!user || !yo) return
      // Pinta el voto de inmediato: en el metro de Madrid la red va y viene,
      // y el listener corrige si el servidor dice otra cosa.
      setVotos((prev) => ({ ...prev, [yo.id]: value }))
      try {
        await escribirVoto(tripId, decisionId, { uid: user.uid, travelerId: yo.id, value, rama })
      } catch (e) {
        setError(e)
      }
    },
    [tripId, decisionId, user, yo, rama],
  )

  return { votos, votar, error, miVoto: yo ? votos[yo.id] : undefined }
}
