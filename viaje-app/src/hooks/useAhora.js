import { useEffect, useState } from 'react'

/**
 * El reloj de la app.
 *
 * Se actualiza solo cada 30 segundos: sin esto, «en 25 min» se queda
 * congelado y la pantalla miente en silencio, que es peor que no ponerlo.
 *
 * Y admite `?hoy=2026-09-11T14:00` para VER cualquier momento del viaje sin
 * esperar. Es la unica forma de revisar hoy, a 15 dias de la salida, como se
 * vera la pantalla el viernes del circuito.
 */
function fechaSimulada() {
  if (typeof window === 'undefined') return null
  const crudo = new URLSearchParams(window.location.search).get('hoy')
  if (!crudo) return null
  const d = new Date(crudo.length <= 10 ? `${crudo}T12:00:00+02:00` : crudo)
  return Number.isNaN(d.getTime()) ? null : d
}

export function useAhora(intervaloMs = 30_000) {
  const simulada = fechaSimulada()
  const [ahora, setAhora] = useState(() => simulada ?? new Date())

  useEffect(() => {
    if (simulada) return undefined // congelado a proposito
    const id = setInterval(() => setAhora(new Date()), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs, simulada])

  return { ahora, simulado: Boolean(simulada) }
}
