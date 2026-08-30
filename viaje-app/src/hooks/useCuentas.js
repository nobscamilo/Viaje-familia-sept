import { useEffect, useMemo, useState } from 'react'
import { GROUPS } from '../data/trip-madrid-2026.js'
import { suscribirGastos, suscribirLiquidaciones } from '../services/cuentas.js'
import { liquidar, porCategoria, saldos, total } from '../domain/cuentas.js'
import { useTrip } from './useTrip.js'

/**
 * Las cuentas del viaje, ya calculadas.
 *
 * Todo el cálculo vive en `domain/cuentas.js`, que es puro y está probado con
 * importes feos. Aquí solo se escucha Firestore y se memoriza el resultado:
 * si el reparto se hiciera en el componente, cada pintada volvería a dividir
 * noventa gastos entre siete personas por nada.
 */
export function useCuentas() {
  const { tripId, travelers } = useTrip()
  const [gastos, setGastos] = useState([])
  const [liquidaciones, setLiquidaciones] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const off = [
      suscribirGastos(tripId, setGastos, setError),
      suscribirLiquidaciones(tripId, setLiquidaciones, setError),
    ]
    return () => off.forEach((f) => f())
  }, [tripId])

  return useMemo(() => {
    const cuenta = saldos(gastos, travelers, GROUPS, liquidaciones)
    return {
      gastos: [...gastos].sort(porFecha),
      liquidaciones,
      cuenta,
      pagos: liquidar(cuenta),
      totalCent: total(gastos),
      categorias: porCategoria(gastos),
      error,
    }
  }, [gastos, liquidaciones, travelers, error])
}

/** Lo más reciente arriba. Sin fecha, al final: no se sabe dónde ponerlo. */
function porFecha(a, b) {
  if (!a.fecha) return 1
  if (!b.fecha) return -1
  return b.fecha.localeCompare(a.fecha)
}
