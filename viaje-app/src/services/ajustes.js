import { getFb } from './firebase.js'

/**
 * Ajustes. Todo pasa por el servidor porque los codigos personales no se
 * pueden leer desde el cliente: cualquiera podria leer el de su padre y, como
 * «el codigo manda», entrar como el.
 */
async function llamar(nombre, datos) {
  const fb = await getFb()
  if (!fb) throw new Error('modo-local')
  const funciones = await import('firebase/functions')
  const instancia = funciones.getFunctions(fb.app, 'europe-west1')
  const { data } = await funciones.httpsCallable(instancia, nombre, { timeout: 30000 })(datos)
  return data
}

export const verGente = (tripId) => llamar('gente', { tripId })
export const desvincular = (tripId, travelerId) => llamar('desvincular', { tripId, travelerId })
