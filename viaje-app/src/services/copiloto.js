import { getFb } from './firebase.js'

/**
 * Llama al copiloto. Devuelve { texto, tarjetas, rutas, propuestas }.
 *
 * La region tiene que coincidir con la de la funcion (`europe-west1`): si no,
 * el SDK llama a us-central1 y da un 404 que parece un error de permisos.
 */
export async function preguntarCopiloto(tripId, mensajes) {
  const fb = await getFb()
  if (!fb) {
    return {
      texto: 'Modo local: no hay copiloto. Configura Firebase para hablar conmigo.',
      tarjetas: [], rutas: [], propuestas: [], planes: [],
      borradores: [], borradoresPlan: [],
    }
  }
  const funciones = fb.fs.__funciones ?? (await import('firebase/functions'))
  const instancia = funciones.getFunctions(fb.app, 'europe-west1')
  const llamar = funciones.httpsCallable(instancia, 'copiloto', { timeout: 120000 })
  const { data } = await llamar({ tripId, mensajes })
  return {
    texto: data?.texto ?? '',
    tarjetas: data?.tarjetas ?? [],
    rutas: data?.rutas ?? [],
    propuestas: data?.propuestas ?? [],
    planes: data?.planes ?? [],
    // Lo que el copiloto PROPONE y todavia no ha escrito. Van aparte de
    // `planes` a proposito: `planes` son recibos de algo que ya esta en la
    // agenda, y esto es lo contrario.
    borradores: data?.borradores ?? [],
    borradoresPlan: data?.borradoresPlan ?? [],
  }
}
