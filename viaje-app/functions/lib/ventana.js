/**
 * Las fechas del viaje, en UN solo sitio.
 *
 * Estaban escritas a mano tres veces —`planes.js`, `gastos.js` e `index.js`—
 * y las tres copias tenian que decir lo mismo sin que nada lo vigilara. Al
 * evaluar si se podia levantar la app para un segundo viaje, esto salio como
 * el fallo mas caro de los tres que habia: con otras fechas, el copiloto
 * rechaza TODOS los planes y TODOS los gastos con «cae fuera del viaje», y
 * parece que se ha vuelto tonto el modelo cuando lo que hay es una constante
 * en el archivo equivocado.
 *
 * Sigue siendo un dato horneado en el codigo: mover la ventana a Firestore es
 * el trabajo del viaje numero dos. Pero ahora se cambia en una linea.
 */
export const VIAJE_DESDE = '2026-09-10'
export const VIAJE_HASTA = '2026-09-23'

/** Un dia AAAA-MM-DD bien formado y dentro del viaje. */
export function dentroDelViaje(dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '')) return false
  return dia >= VIAJE_DESDE && dia <= VIAJE_HASTA
}

/** Por que no vale, para poder decirselo a quien pregunta. */
export function motivoFueraDelViaje(dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '')) return 'La fecha va en AAAA-MM-DD.'
  return `${dia} cae fuera del viaje (${VIAJE_DESDE} a ${VIAJE_HASTA}).`
}
