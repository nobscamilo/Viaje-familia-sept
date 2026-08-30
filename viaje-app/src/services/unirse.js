import { getFb } from './firebase.js'

/**
 * Entrar al viaje con el codigo personal. Sin Google, sin correo.
 *
 * La Cloud Function comprueba de quien es el codigo y devuelve un token de
 * sesion a nombre de ese viajero. Tiene que ser el servidor: quien llega con
 * un codigo todavia no es miembro, y un no-miembro no puede leer la lista de
 * viajeros, asi que desde aqui es imposible saber de quien es.
 *
 * Devuelve { travelerId, nombre }.
 */
export async function unirseConCodigo(tripId, codigo) {
  const fb = await getFb()
  if (!fb) throw new Error('modo-local')

  const funciones = await import('firebase/functions')
  const instancia = funciones.getFunctions(fb.app, 'europe-west1')
  const llamar = funciones.httpsCallable(instancia, 'unirse', { timeout: 30000 })
  const { data } = await llamar({ tripId, codigo })

  // El token ES la sesion. Al canjearlo, `onAuthStateChanged` se dispara y la
  // app entra sola: no hay que tocar nada mas desde aqui.
  await fb.fa.signInWithCustomToken(fb.auth, data.token)
  return data
}

/** El mensaje que ve la persona, no el codigo de error de Firebase. */
export function motivo(e) {
  const c = e?.code ?? ''
  if (c.includes('resource-exhausted')) return 'Demasiados intentos seguidos. Espera un rato y vuelve a probar.'
  if (c.includes('already-exists')) return 'Ese nombre ya lo cogio otra persona. Si eres tu, avisa a Camilo.'
  if (c.includes('permission-denied')) return 'Ese codigo no vale para este viaje. Revisa que lo hayas copiado entero.'
  if (c.includes('unauthenticated')) return 'Se cerro la sesion. Vuelve a entrar con Google.'
  return 'No se pudo entrar. Intentalo otra vez en un momento.'
}
