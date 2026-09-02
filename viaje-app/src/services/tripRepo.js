/**
 * Acceso a los datos del viaje.
 *
 * Cada suscripción devuelve una función para cortarla, igual que `onSnapshot`.
 * Si no hay Firebase configurado, entrega los datos locales una vez y ya está:
 * la interfaz no necesita saber en qué modo está corriendo.
 *
 * Escrituras: SIEMPRE atómicas. Nunca se lee un objeto, se modifica en el
 * cliente y se reescribe entero — así es como el proyecto anterior perdía
 * votos cuando dos personas coincidían.
 */
import { firebaseListo, getFb } from './firebase.js'
import {
  commentsRef, decisionRef, decisionsRef, eventRef, timelineRef, travelersRef, tripRef,
  voteRef, votesRef,
} from './paths.js'

import { TRAVELERS } from '../data/travelers.js'
import { DECISIONES_CERRADAS, GROUPS, OPEN_DECISIONS, TIMELINE, TRIP } from '../data/trip-madrid-2026.js'

const docsA = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

/** Entrega un valor local y devuelve un `unsubscribe` que no hace nada. */
function local(valor, alRecibir) {
  queueMicrotask(() => alRecibir(valor))
  return () => {}
}

/**
 * Envuelve una suscripción que necesita el SDK cargado. Devuelve el corte de
 * inmediato aunque el SDK aún no haya llegado: si el componente se desmonta
 * antes, la suscripción nunca se abre.
 */
function conFirebase(abrir) {
  let cortar = () => {}
  let cancelado = false
  getFb().then((fb) => {
    if (cancelado || !fb) return
    cortar = abrir(fb)
  })
  return () => { cancelado = true; cortar() }
}

// ---------------------------------------------------------------- lecturas

/**
 * El documento del viaje: roles y enganche uid → viajero.
 *
 * Ojo con los tres desenlaces, porque no significan lo mismo:
 *   - datos  → existe y soy miembro
 *   - null   → existe la consulta pero no el documento
 *   - error  → PERMISSION_DENIED, que aquí quiere decir dos cosas a la vez:
 *              o el viaje no existe todavía, o existe y yo no soy miembro.
 *              Las reglas no dejan leerlo en ninguno de los dos casos, así que
 *              desde fuera son indistinguibles. La interfaz tiene que ofrecer
 *              las dos salidas.
 */
export function suscribirViaje(tripId, alRecibir, alFallar) {
  if (!firebaseListo) return local({ ...TRIP, local: true }, alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(
      tripRef(fb, tripId),
      (d) => alRecibir(d.exists() ? { id: d.id, ...d.data() } : null),
      alFallar,
    ))
}

export function suscribirViajeros(tripId, alRecibir, alFallar) {
  if (!firebaseListo) return local(TRAVELERS, alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(travelersRef(fb, tripId), (s) => alRecibir(docsA(s)), alFallar))
}

export function suscribirAgenda(tripId, alRecibir, alFallar) {
  if (!firebaseListo) return local(TIMELINE, alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(
      fb.fs.query(timelineRef(fb, tripId), fb.fs.orderBy('start')),
      (s) => alRecibir(docsA(s)),
      alFallar,
    ))
}

export function suscribirDecisiones(tripId, alRecibir, alFallar) {
  if (!firebaseListo) return local(OPEN_DECISIONS, alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(decisionsRef(fb, tripId), (s) => alRecibir(docsA(s)), alFallar))
}

/**
 * Votos de UNA cosa votable, como { travelerId: valor }.
 *
 * `rama` dice si se vota una decisión o un plan de la agenda. Es el mismo
 * mecanismo: cambiar de rama no cambia ni la forma del documento ni quién
 * puede escribirlo.
 */
export function suscribirVotos(tripId, decisionId, alRecibir, alFallar, rama = 'decisions') {
  if (!firebaseListo) return local({}, alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(
      votesRef(fb, tripId, decisionId, rama),
      (s) => {
        const mapa = {}
        for (const d of s.docs) {
          const v = d.data()
          if (v?.travelerId) mapa[v.travelerId] = v.value
        }
        alRecibir(mapa)
      },
      alFallar,
    ))
}

export function suscribirComentarios(tripId, id, alRecibir, alFallar, rama = 'decisions') {
  if (!firebaseListo) return local([], alRecibir)
  return conFirebase((fb) =>
    fb.fs.onSnapshot(
      fb.fs.query(commentsRef(fb, tripId, id, rama), fb.fs.orderBy('createdAt')),
      (s) => alRecibir(docsA(s)),
      alFallar,
    ))
}

// -------------------------------------------------------------- escrituras

async function fbOFallo() {
  const fb = await getFb()
  if (!fb) throw new Error('Modo local: no hay servidor al que escribir.')
  return fb
}

/**
 * Votar. Escribe UN documento cuyo id es el uid de quien vota, así que dos
 * personas votando a la vez no se pisan: son documentos distintos.
 */
export async function votar(tripId, decisionId, { uid, travelerId, value, rama = 'decisions' }) {
  const fb = await fbOFallo()
  await fb.fs.setDoc(voteRef(fb, tripId, decisionId, uid, rama), {
    travelerId,
    value,
    updatedAt: fb.fs.serverTimestamp(),
  })
}

export async function retirarVoto(tripId, decisionId, uid, rama = 'decisions') {
  const fb = await fbOFallo()
  await fb.fs.deleteDoc(voteRef(fb, tripId, decisionId, uid, rama))
}

/**
 * Confirmar o descartar un plan de la agenda.
 *
 * Parche mínimo, nunca la reescritura del evento entero: quien confirma el
 * Camp Nou no tiene por qué reenviar la dirección y las coordenadas, y si lo
 * hiciera acabaría pisando lo que otro acabe de corregir.
 */
/**
 * El estado de un momento ya NO se escribe desde el cliente.
 *
 * Estaba aqui y funcionaba mientras solo hubiera que confirmar planes que
 * alguien habia propuesto. Pero devolver a propuesto un momento SEMBRADO —el
 * tour del Bernabeu que al final no se hace— es una escritura que las reglas
 * de Firestore no le dejan a un adulto, porque ese documento no tiene
 * `createdBy`. Y un boton que las reglas van a rechazar deja a la persona
 * mirando un error que no entiende.
 *
 * Vive en `services/planes.js` -> Cloud Function `moverEstadoDeUnPlan`, que
 * ademas deja la huella que impide que la siembra lo revierta.
 */

export async function comentar(tripId, id, { uid, travelerId, text, rama = 'decisions' }) {
  const limpio = String(text ?? '').trim().slice(0, 2000)
  if (!limpio) return
  const fb = await fbOFallo()
  await fb.fs.addDoc(commentsRef(fb, tripId, id, rama), {
    authorUid: uid,
    travelerId,
    text: limpio,
    createdAt: fb.fs.serverTimestamp(),
  })
}

/**
 * Corregir una nota o un comentario, y quitarlo.
 *
 * Las reglas ya lo permitían desde que existen los comentarios —tu autor
 * edita, y borra su autor o quien organiza— pero no había camino desde la
 * pantalla: media función, que en este proyecto es una función que no está.
 *
 * `authorUid` NO se toca nunca: la regla exige que quede como estaba, así que
 * mandarlo aquí sería pedirle a Firestore que rechace la escritura. Se guarda
 * quién y cuándo editó, que es lo que hace que una nota corregida no parezca
 * la original.
 */
export async function editarComentario(tripId, id, comentarioId, { text, uid, rama = 'decisions' }) {
  const limpio = String(text ?? '').trim().slice(0, 2000)
  if (!limpio) return
  const fb = await fbOFallo()
  await fb.fs.updateDoc(fb.fs.doc(commentsRef(fb, tripId, id, rama), comentarioId), {
    text: limpio,
    editadoPor: uid,
    editadoEn: fb.fs.serverTimestamp(),
  })
}

export async function borrarComentario(tripId, id, comentarioId, { rama = 'decisions' } = {}) {
  const fb = await fbOFallo()
  await fb.fs.deleteDoc(fb.fs.doc(commentsRef(fb, tripId, id, rama), comentarioId))
}

/** Cambio de estado. Parche mínimo: nunca se reescribe la decisión entera. */
export async function cambiarEstado(tripId, decisionId, { status, uid }) {
  const fb = await fbOFallo()
  await fb.fs.updateDoc(decisionRef(fb, tripId, decisionId), {
    status,
    statusBy: uid,
    statusAt: fb.fs.serverTimestamp(),
  })
}

export async function proponerDecision(tripId, decision, uid) {
  const fb = await fbOFallo()
  await fb.fs.addDoc(decisionsRef(fb, tripId), {
    ...decision,
    status: 'propuesto',
    createdBy: uid,
    createdAt: fb.fs.serverTimestamp(),
  })
}

// ------------------------------------------------------------- arranque

/**
 * Crea el viaje por primera vez, desde la propia app.
 *
 * No hace falta ninguna clave de administrador: las reglas permiten crear el
 * documento del viaje a quien se ponga a sí mismo como `owner`, y a partir de
 * ahí ya es owner para todo lo demás. Una credencial que no existe no se
 * puede filtrar.
 */
export async function crearViaje(tripId, { uid, travelerId }) {
  const fb = await fbOFallo()

  // Primero el documento raíz: es lo que convierte a quien lo crea en owner.
  await fb.fs.setDoc(tripRef(fb, tripId), {
    ...TRIP,
    id: tripId,
    groups: GROUPS,
    roles: { [uid]: 'owner' },
    uidToTraveler: { [uid]: travelerId },
    // Puerta de entrada para el resto: sin ser miembro no se puede leer este
    // documento, asi que el codigo hay que saberselo de antes.
    joinCode: 'MADRIDF1',
    createdBy: uid,
    createdAt: fb.fs.serverTimestamp(),
  })

  // Y ahora el contenido, en lotes de 400 (Firestore admite 500 por lote).
  const escrituras = [
    ...TRAVELERS.map((t) => [fb.fs.doc(travelersRef(fb, tripId), t.id), t]),
    ...TIMELINE.map((e) => [fb.fs.doc(timelineRef(fb, tripId), e.id), e]),
    // `origen: 'seed'` distingue lo que puso el arranque de lo que abrio una
    // persona. Sin esa marca, `scripts/seed.mjs` no puede saber que le toca
    // mantener y que no puede tocar.
    ...OPEN_DECISIONS.map((d) => [
      fb.fs.doc(decisionsRef(fb, tripId), d.id),
      { ...d, status: 'propuesto', createdBy: uid, origen: 'seed' },
    ]),
    ...DECISIONES_CERRADAS.map((d) => [
      fb.fs.doc(decisionsRef(fb, tripId), d.id),
      { ...d, createdBy: uid, origen: 'seed' },
    ]),
  ]

  for (let i = 0; i < escrituras.length; i += 400) {
    const lote = fb.fs.writeBatch(fb.db)
    for (const [ref, datos] of escrituras.slice(i, i + 400)) lote.set(ref, datos, { merge: true })
    await lote.commit()
  }

  return escrituras.length + 1
}

/**
 * Engancha un uid con su viajero.
 *
 * Ya NO lo usa quien entra: eso lo hace la Cloud Function `unirse`, que es la
 * unica que puede mirar de quien es un codigo. Esto queda para que un owner
 * arregle un enlace ajeno desde Ajustes.
 */
export async function enlazarPersona(tripId, { uid, travelerId, rol = 'adult', codigo }) {
  const fb = await fbOFallo()
  const parche = {
    [`roles.${uid}`]: rol,
    [`uidToTraveler.${uid}`]: travelerId,
  }
  if (codigo !== undefined) parche.joinCodeAttempt = codigo
  await fb.fs.updateDoc(tripRef(fb, tripId), parche)
}
