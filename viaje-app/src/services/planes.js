import { getFb } from './firebase.js'

/**
 * Meter y quitar planes sin pasar por el modelo.
 *
 * Son dos escrituras deterministas: agregar Rosi La Loca al jueves a la una no
 * necesita que Gemini interprete nada, y gastarle una llamada seria pagar por
 * adivinar algo que ya sabemos.
 */
async function llamar(nombre, datos) {
  const fb = await getFb()
  if (!fb) throw new Error('modo-local')
  const funciones = await import('firebase/functions')
  const instancia = funciones.getFunctions(fb.app, 'europe-west1')
  const { data } = await funciones.httpsCallable(instancia, nombre, { timeout: 30000 })(datos)
  return data
}

export const agregarPlan = (tripId, plan) => llamar('agregarPlan', { tripId, ...plan })
export const quitarPlan = (tripId, id) => llamar('quitarPlan', { tripId, id })
export const editarPlan = (tripId, id, cambios) => llamar('cambiarUnPlan', { tripId, id, ...cambios })
/** Una ruta son hasta seis momentos: se quitan de una vez o no se quitan. */
export const quitarRuta = (tripId, rutaId) => llamar('quitarRuta', { tripId, rutaId })

/** El mensaje que ve la persona, no el codigo de error de Firebase. */
export function motivoPlan(e) {
  const c = e?.code ?? ''
  if (c.includes('failed-precondition')) return 'Ya está confirmado: eso lo quita quien organiza.'
  if (c.includes('permission-denied')) return 'Eso no lo puedes quitar tú.'
  if (c.includes('invalid-argument')) return 'Revisa el día y la hora.'
  if (String(e?.message ?? '').includes('modo-local')) return 'En modo local no se puede escribir.'
  return 'No se pudo. Inténtalo otra vez.'
}
