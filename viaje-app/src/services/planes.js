import { getFb } from './firebase.js'

/**
 * Meter y quitar planes sin pasar por el modelo.
 *
 * Son dos escrituras deterministas: agregar Rosi La Loca al jueves a la una no
 * necesita que Gemini interprete nada, y gastarle una llamada seria pagar por
 * adivinar algo que ya sabemos.
 */
async function llamar(nombre, datos, timeout = 30000) {
  const fb = await getFb()
  if (!fb) throw new Error('modo-local')
  const funciones = await import('firebase/functions')
  const instancia = funciones.getFunctions(fb.app, 'europe-west1')
  const { data } = await funciones.httpsCallable(instancia, nombre, { timeout })(datos)
  return data
}

export const agregarPlan = (tripId, plan) => llamar('agregarPlan', { tripId, ...plan })
/**
 * Confirmar un momento o devolverlo a propuesto.
 *
 * Pasa por el servidor y no por Firestore directo porque los momentos
 * sembrados no tienen `createdBy` y las reglas no dejan que un adulto los
 * toque. Ademas la funcion deja la huella que evita que `npm run publicar`
 * revierta el cambio al dia siguiente.
 */
export const moverEstadoPlan = (tripId, id, a) => llamar('moverEstadoDeUnPlan', { tripId, id, a })
export const quitarPlan = (tripId, id) => llamar('quitarPlan', { tripId, id })
export const editarPlan = (tripId, id, cambios) => llamar('cambiarUnPlan', { tripId, id, ...cambios })
/** Una ruta son hasta seis momentos: se quitan de una vez o no se quitan. */
export const quitarRuta = (tripId, rutaId) => llamar('quitarRuta', { tripId, rutaId })

/**
 * El borrador de ruta, antes de que entre en la agenda.
 *
 * `recalcularRuta` rehace las horas cuando alguien quita una parada o mueve
 * el arranque; `guardarRutaBorrador` es la unica de las dos que escribe. Las
 * dos vuelven a preguntarle a Google los traslados en el servidor: si las
 * horas viajaran desde aqui, quitar la parada del medio dejaria la ruta en la
 * agenda con los horarios de la version anterior.
 *
 * Tardan lo suyo —una llamada a Routes por tramo— y por eso el timeout es
 * mayor que el de una escritura normal.
 */
export const recalcularRuta = (tripId, ruta) => llamar('recalcularRuta', { tripId, ruta }, 90000)
export const guardarRutaBorrador = (tripId, ruta) => llamar('guardarRuta', { tripId, ruta }, 90000)

/** El mensaje que ve la persona, no el codigo de error de Firebase. */
export function motivoPlan(e) {
  const c = e?.code ?? ''
  if (c.includes('failed-precondition')) return 'No se pudo: vuelve a abrirlo y mira cómo está.'
  // Ya no hay candados por estado ni por origen: si llega esto, es el rol.
  if (c.includes('permission-denied')) return 'Con tu rol solo se puede mirar.'
  if (c.includes('invalid-argument')) return 'Revisa el día y la hora.'
  if (String(e?.message ?? '').includes('modo-local')) return 'En modo local no se puede escribir.'
  return 'No se pudo. Inténtalo otra vez.'
}
