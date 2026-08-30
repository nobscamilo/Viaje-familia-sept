import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react'
import { TRIP_ID, firebaseListo } from '../services/firebase.js'
import {
  crearViaje,
  suscribirAgenda, suscribirDecisiones, suscribirViaje, suscribirViajeros,
} from '../services/tripRepo.js'
import { unirseConCodigo } from '../services/unirse.js'
import { useAuth } from './useAuth.js'
import { TRAVELERS } from '../data/travelers.js'

/**
 * Un solo proveedor con los datos del viaje. Cuatro suscripciones, no una por
 * componente: el proyecto anterior abría listeners desde dentro de la interfaz
 * y por eso nadie sabía cuántos había vivos.
 */
const TripContext = createContext(null)

export function TripProvider({ children, tripId = TRIP_ID }) {
  const auth = useAuth()
  const [trip, setTrip] = useState(undefined) // undefined = cargando, null = no existe
  const [tripDenegado, setTripDenegado] = useState(false)
  /**
   * Cuantas veces hay que rehacer las suscripciones.
   *
   * Firestore NO reintenta un `onSnapshot` que muere por `permission-denied`:
   * cierra el listener y no vuelve. Antes de apuntarte no eres miembro, asi
   * que el del viaje muere nada mas abrir la app. Al apuntarte, la escritura
   * funciona... y no queda nadie escuchando: la pantalla se quedaba colgada
   * hasta que recargabas a mano. Subir este contador rehace las suscripciones,
   * ya como miembro.
   */
  const [intento, setIntento] = useState(0)
  const [travelers, setTravelers] = useState([])
  const [timeline, setTimeline] = useState([])
  const [decisions, setDecisions] = useState([])
  const [error, setError] = useState(null)

  // El documento del viaje dice si existe y quién es quién.
  //
  // Si las reglas lo deniegan NO es un fallo: significa "no existe, o existe y
  // aún no eres miembro". Los dos casos se ven igual desde fuera, y los dos se
  // arreglan escribiendo (crear o unirse), no leyendo.
  useEffect(() => {
    setTripDenegado(false)
    return suscribirViaje(
      tripId,
      (d) => { setTripDenegado(false); setTrip(d) },
      (e) => {
        if (e?.code === 'permission-denied') { setTripDenegado(true); setTrip(null) }
        else setError(e)
      },
    )
  }, [tripId, auth.user?.uid, intento])

  // El contenido solo cuando hay sesión: sin ella las reglas lo rechazan y
  // la consola se llena de errores de permisos que no significan nada.
  const puedeLeer = !firebaseListo || Boolean(auth.user)
  useEffect(() => {
    if (!puedeLeer) return undefined
    const fallo = (e) => setError(e)
    const off = [
      suscribirViajeros(tripId, setTravelers, fallo),
      suscribirAgenda(tripId, setTimeline, fallo),
      suscribirDecisiones(tripId, setDecisions, fallo),
    ]
    return () => off.forEach((f) => f())
  }, [tripId, puedeLeer, intento])

  /**
   * Qué viajero soy. La autoridad es el mapa del documento del viaje, no la
   * lista de viajeros: esa puede tardar en llegar, y si dependiéramos de ella
   * habría un instante en el que la app cree que no sabe quién eres y te manda
   * a la pantalla de identificarte. Ese era exactamente el bug.
   */
  const miId = auth.user?.travelerId ?? trip?.uidToTraveler?.[auth.user?.uid]

  const yo = useMemo(() => {
    if (!miId) return null
    return travelers.find((t) => t.id === miId)
      // Respaldo mientras la subcolección carga.
      ?? TRAVELERS.find((t) => t.id === miId)
      ?? null
  }, [miId, travelers])

  /**
   * Apuntarse al viaje: escribir y volver a escuchar, en ese orden.
   *
   * Vive aqui y no en la pantalla de entrada porque quien tiene que rehacer
   * las suscripciones es el proveedor. Si la escritura falla, no se toca nada:
   * el error sube a quien llamo.
   */
  const volverAEscuchar = useMemo(() => () => {
    setTripDenegado(false)
    setTrip(undefined)          // volvemos a "cargando", no a "no existe"
    setIntento((n) => n + 1)
  }, [])

  /** Entrar con el codigo personal. Lo resuelve la Cloud Function. */
  const apuntarme = useMemo(() => async (codigo) => {
    // Sin comprobar sesion: el codigo ES la sesion. Exigir una antes seria
    // volver a pedir Google, que es justo lo que se quito.
    const r = await unirseConCodigo(tripId, codigo)
    volverAEscuchar()
    return r
  }, [tripId, volverAEscuchar])

  /** Solo para el primero de todos: crear el viaje desde cero. */
  const crearElViaje = useMemo(() => async (travelerId) => {
    const uid = auth.user?.uid
    if (!uid) throw new Error('sin-sesion')
    await crearViaje(tripId, { uid, travelerId })
    volverAEscuchar()
  }, [tripId, auth.user?.uid, volverAEscuchar])

  const value = useMemo(() => ({
    tripId,
    trip,
    travelers,
    timeline,
    decisions,
    error,
    yo,
    ...auth,
    // Estados que la interfaz necesita distinguir sin adivinar.
    cargandoViaje: trip === undefined,
    // "No lo puedo leer" y "no existe" se tratan igual: hay que escribir.
    sinAcceso: firebaseListo && Boolean(auth.user) && (tripDenegado || trip === null),
    rol: auth.user ? trip?.roles?.[auth.user.uid] ?? null : null,
    // Estoy dentro si el documento del viaje me reconoce. No depende de que
    // haya cargado la lista de viajeros.
    enlazado: Boolean(miId),
    apuntarme,
    crearElViaje,
  }), [tripId, trip, travelers, timeline, decisions, error, auth, yo, miId, tripDenegado, apuntarme, crearElViaje])

  return createElement(TripContext.Provider, { value }, children)
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTrip fuera de <TripProvider>')
  return ctx
}
