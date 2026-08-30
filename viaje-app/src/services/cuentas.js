/**
 * Los gastos y las liquidaciones, contra Firestore.
 *
 * Misma forma que el resto de `tripRepo`: cada suscripción devuelve el corte,
 * y en modo local entrega los datos de siembra una vez.
 *
 * Los importes viajan y se guardan SIEMPRE en céntimos enteros. Un `number`
 * de JavaScript aguanta enteros exactos hasta 2^53: aunque este viaje costara
 * mil millones de euros, no habría redondeo.
 */
import { firebaseListo, getFb } from './firebase.js'
import { gastoRef, gastosRef, liquidacionRef, liquidacionesRef } from './paths.js'
import { GASTOS_INICIALES } from '../data/gastos-iniciales.js'

const docsA = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

function local(valor, alRecibir) {
  queueMicrotask(() => alRecibir(valor))
  return () => {}
}

function conFirebase(abrir) {
  let cortar = () => {}
  let cancelado = false
  getFb().then((fb) => {
    if (cancelado || !fb) return
    cortar = abrir(fb)
  })
  return () => { cancelado = true; cortar() }
}

export function suscribirGastos(tripId, alRecibir, alFallar) {
  // `origen: 'seed'` es lo que `scripts/seed.mjs` escribe en Firestore, y es
  // lo que decide si un gasto se puede editar. Sin ponerlo aquí, el modo
  // local ENSEÑA OTRA COSA que la app de verdad: los mismos gastos parecerían
  // editables. Ya me pasó una vez verificar en local la mitad que acababa de
  // escribir; el modo local tiene que mentir lo menos posible.
  if (!firebaseListo) return local(GASTOS_INICIALES.map((g) => ({ ...g, origen: 'seed' })), alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(gastosRef(fb, tripId), (s) => alRecibir(docsA(s)), alFallar))
}

export function suscribirLiquidaciones(tripId, alRecibir, alFallar) {
  if (!firebaseListo) return local([], alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(liquidacionesRef(fb, tripId), (s) => alRecibir(docsA(s)), alFallar))
}

async function fbOFallo() {
  const fb = await getFb()
  if (!fb) throw new Error('modo-local')
  return fb
}

export async function anotarGasto(tripId, gasto, uid) {
  const fb = await fbOFallo()
  const ref = await fb.fs.addDoc(gastosRef(fb, tripId), {
    ...gasto,
    createdBy: uid,
    createdAt: fb.fs.serverTimestamp(),
  })
  return ref.id
}

/**
 * Editar un gasto.
 *
 * Parche de los campos que se tocan, nunca el documento entero: `createdBy` y
 * `createdAt` se quedan donde están. Quien lo anotó sigue siendo quien lo
 * anotó aunque otro le corrija el importe.
 */
export async function editarGasto(tripId, id, cambios) {
  const fb = await fbOFallo()
  await fb.fs.updateDoc(gastoRef(fb, tripId, id), {
    ...cambios,
    editadoAt: fb.fs.serverTimestamp(),
  })
}

/**
 * Borrar un gasto.
 *
 * Solo lo que puso una persona desde la app, y solo quien lo puso o quien
 * organiza. Lo sembrado (las reservas verificadas contra los correos) no se
 * borra desde el móvil: se corrige en `src/data/gastos-iniciales.js`, donde
 * queda escrito de dónde salió el número.
 */
export async function borrarGasto(tripId, id) {
  const fb = await fbOFallo()
  await fb.fs.deleteDoc(gastoRef(fb, tripId, id))
}

/**
 * Corregir una transferencia ya anotada.
 *
 * Solo el importe: quién le paga a quién lo decide el saldo, no una persona.
 * Si la dirección está mal es que el saldo era otro, y eso se arregla con los
 * gastos, no aquí.
 */
export async function editarLiquidacion(tripId, id, importeCent) {
  const fb = await fbOFallo()
  await fb.fs.updateDoc(liquidacionRef(fb, tripId, id), {
    importeCent,
    editadoAt: fb.fs.serverTimestamp(),
  })
}

/**
 * Deshacer una transferencia.
 *
 * Esto faltaba, y es el mismo error de la lista de gastos: las reglas la
 * dejaban borrar desde el primer día y no había ningún botón que lo hiciera.
 * Un «Ya está» pulsado sin querer dejaba el saldo mal para siempre.
 */
export async function borrarLiquidacion(tripId, id) {
  const fb = await fbOFallo()
  await fb.fs.deleteDoc(liquidacionRef(fb, tripId, id))
}

export async function anotarLiquidacion(tripId, { de, a, importeCent, fecha }, uid) {
  const fb = await fbOFallo()
  await fb.fs.addDoc(liquidacionesRef(fb, tripId), {
    de, a, importeCent, fecha,
    createdBy: uid,
    createdAt: fb.fs.serverTimestamp(),
  })
}
