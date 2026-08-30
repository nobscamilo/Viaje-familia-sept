/**
 * Cloud Functions de viaje-app.
 *
 * Una sola funcion por ahora: el copiloto. Deliberadamente pequena — el
 * proyecto anterior tenia 13 endpoints en un archivo de 2.595 lineas y nadie
 * sabia cual seguia vivo.
 */
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { db } from './lib/admin.js'

import { geminiApiKey, mapsApiKey } from './lib/secrets.js'
import { conversar } from './lib/copiloto.js'
import { cleanText } from './lib/text.js'
import { anotar, listar, quitar, sugerir } from './gastos.js'
import { construirContexto } from './lib/contexto.js'

import { borrarPlan, cambiarPlan, crearPlan } from './planes.js'
import { desvincular as soltar, verGente } from './ajustes.js'
import { resolverSitio } from './lib/maps.js'
import { dentroDelViaje, motivoFueraDelViaje } from './lib/ventana.js'
import { armarRuta, borrarRuta } from './rutas.js'

const opciones = {
  region: 'europe-west1',
  secrets: [mapsApiKey, geminiApiKey],
  timeoutSeconds: 120,
  memory: '512MiB',
  // Tope de instancias: es una app familiar de nueve personas. Sin esto, un
  // bucle en el cliente puede escalar a cien contenedores y a una factura.
  maxInstances: 3,
}

/** Solo miembros del viaje. Devuelve ademas quien eres dentro de el. */
async function exigirMiembro(tripId, uid) {
  const snap = await db.doc(`trips/${tripId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese viaje no existe.')
  const trip = snap.data()
  const rol = trip.roles?.[uid]
  if (!rol) throw new HttpsError('permission-denied', 'No eres del viaje.')
  return { trip, rol, travelerId: trip.uidToTraveler?.[uid] ?? null }
}

export const copiloto = onCall(opciones, async (peticion) => {
  const uid = peticion.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Hay que entrar primero.')

  const tripId = cleanText(peticion.data?.tripId)
  if (!tripId) throw new HttpsError('invalid-argument', 'Falta el viaje.')

  const { rol, travelerId } = await exigirMiembro(tripId, uid)

  // Solo las ultimas 12 intervenciones: el contexto del viaje ya va aparte y
  // el historial largo encarece cada pregunta sin mejorar la respuesta.
  const mensajes = (Array.isArray(peticion.data?.mensajes) ? peticion.data.mensajes : [])
    .slice(-12)
    .map((m) => ({ rol: m.rol === 'copiloto' ? 'copiloto' : 'yo', texto: cleanText(m.texto).slice(0, 2000) }))
    .filter((m) => m.texto)

  if (mensajes.length === 0) throw new HttpsError('invalid-argument', 'No has dicho nada.')

  const apiKey = process.env.GEMINI_API_KEY || geminiApiKey.value()
  if (!apiKey) throw new HttpsError('failed-precondition', 'Falta la clave de Gemini.')

  const contexto = await construirContexto(tripId)

  const herramientas = {
    /**
     * Agrega un plan a la agenda, SIEMPRE como `propuesto`.
     *
     * Es la diferencia entre un copiloto util y uno peligroso: puede escribir
     * en la linea de tiempo, pero lo que escribe se ve como sin cerrar hasta
     * que una persona lo confirma. Nada aparece como hecho por arte de magia.
     */
    async agregarAlPlan({ titulo, fecha, hora, duracionMinutos, tipo, lugar, grupo, nota }) {
      const limpio = cleanText(titulo).slice(0, 140)
      if (!limpio) return { error: 'Sin titulo.' }

      const dia = cleanText(fecha).slice(0, 10)
      if (!dentroDelViaje(dia)) return { error: motivoFueraDelViaje(dia) }

      const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/.test(cleanText(hora)) ? cleanText(hora) : null
      // Horas en la zona del viaje, no en la de quien pregunta.
      const inicio = hhmm ? `${dia}T${hhmm}:00+02:00` : dia

      let fin = null
      if (hhmm && Number.isFinite(duracionMinutos) && duracionMinutos > 0) {
        const t = new Date(`${dia}T${hhmm}:00+02:00`)
        t.setMinutes(t.getMinutes() + Math.min(duracionMinutos, 24 * 60))
        fin = t.toISOString()
      }

      // Coordenadas del sitio, resueltas AQUI y no por el modelo.
      // El modelo ya vio la latitud y la longitud en `buscarLugares`, pero
      // pedirle que las repita es pedirle que copie quince digitos: se
      // equivoca, y un pin mal puesto es peor que ningun pin. Una llamada
      // mas a Places por plan agregado es un precio barato por no mentir.
      // La ciudad del dia, o la del dia que se este mirando. Sin ella,
      // «el hotel» resolvia a un hotel de Guardo y el pin caia a 279 km.
      const ciudad = contexto.porDia?.[dia]?.ciudad ?? contexto.ciudadPorDefecto
      const sitio = lugar ? await resolverSitio(cleanText(lugar), ciudad) : null

      const ref = await db.collection(`trips/${tripId}/timeline`).add({
        title: limpio,
        kind: ['activity', 'food', 'transport', 'lodging'].includes(tipo) ? tipo : 'activity',
        status: 'propuesto',
        start: inicio,
        ...(fin ? { end: fin } : {}),
        ...(lugar ? { address: sitio?.address ?? cleanText(lugar).slice(0, 200) } : {}),
        ...(sitio?.coords ? { coords: sitio.coords } : {}),
        ...(nota ? { notes: cleanText(nota).slice(0, 600) } : {}),
        groupId: ['todos', 'f1', 'sin-f1'].includes(grupo) ? grupo : 'todos',
        travelerIds: 'pendiente',
        createdBy: uid,
        createdByCopiloto: true,
        sugeridoPor: travelerId,
        createdAt: FieldValue.serverTimestamp(),
      })

      return {
        ok: true,
        aviso: 'Queda como PROPUESTO en la agenda hasta que alguien lo confirme.',
        enElMapa: Boolean(sitio?.coords),
        plan: { id: ref.id, title: limpio, fecha: dia, hora: hhmm },
      }
    },

    /**
     * Una ruta de turismo entera, de una vez.
     *
     * La logica vive en `rutas.js` porque son cien lineas de reloj, Places y
     * Routes, y este archivo ya se paso de 400 una vez. Aqui solo se le pasa
     * quien pregunta y que sabemos del viaje.
     */
    armarRuta: (args) => armarRuta(args, { tripId, uid, travelerId, contexto }),

    /** La IA propone; nunca decide. Queda con autor "copiloto". */
    async proponer({ titulo, porque, urgencia, grupo }) {
      const limpio = cleanText(titulo).slice(0, 140)
      if (!limpio) return { error: 'Sin titulo.' }
      const ref = await db.collection(`trips/${tripId}/decisions`).add({
        title: limpio,
        why: cleanText(porque).slice(0, 600) || null,
        urgency: ['alta', 'media', 'baja'].includes(urgencia) ? urgencia : 'media',
        groupId: ['todos', 'f1', 'sin-f1'].includes(grupo) ? grupo : 'todos',
        status: 'propuesto',
        createdBy: uid,
        createdByCopiloto: true,
        sugeridaPor: travelerId,
        createdAt: FieldValue.serverTimestamp(),
      })
      return { ok: true, propuesta: { id: ref.id, title: limpio } }
    },

    /**
     * Lo mismo, pero con varias alternativas encima de la mesa.
     *
     * Es la herramienta que le faltaba al copiloto para servir de algo:
     * buscaba tres restaurantes estupendos y ahi se acababa: la familia tenia
     * que salirse de la app para escoger. Ahora las tres quedan en Decisiones
     * y cada adulto señala una.
     *
     * Las direcciones se resuelven AQUI con Places, como en agregarAlPlan y
     * por lo mismo: el modelo puede inventarse una calle, y una direccion
     * falsa en una opcion votada es peor que no poner ninguna.
     */
    async proponerOpciones({ titulo, porque, opciones, urgencia, grupo }) {
      const limpio = cleanText(titulo).slice(0, 140)
      if (!limpio) return { error: 'Sin titulo.' }

      const brutas = Array.isArray(opciones) ? opciones.slice(0, 5) : []
      if (brutas.length < 2) {
        return { error: 'Una eleccion necesita al menos dos opciones. Con una sola, usa proponer.' }
      }

      const listas = []
      for (const [i, o] of brutas.entries()) {
        const t = cleanText(o?.titulo ?? '').slice(0, 100)
        if (!t) continue
        const sitio = o?.lugar ? await resolverSitio(cleanText(o.lugar), contexto.ciudadPorDefecto) : null
        listas.push({
          // Ids estables y cortos: son el VALOR del voto, y un voto que
          // apunta a un id que cambia es un voto perdido.
          id: `op${i + 1}`,
          title: t,
          detail: cleanText(o?.detalle ?? '').slice(0, 200) || null,
          address: sitio?.address ?? (o?.lugar ? cleanText(o.lugar).slice(0, 200) : null),
          ...(sitio?.coords ? { coords: sitio.coords } : {}),
          priceEur: Number.isFinite(o?.precioEur) ? Math.round(o.precioEur * 100) / 100 : null,
        })
      }
      if (listas.length < 2) return { error: 'Las opciones venian sin nombre.' }

      const ref = await db.collection(`trips/${tripId}/decisions`).add({
        title: limpio,
        why: cleanText(porque).slice(0, 600) || null,
        options: listas,
        urgency: ['alta', 'media', 'baja'].includes(urgencia) ? urgencia : 'media',
        groupId: ['todos', 'f1', 'sin-f1'].includes(grupo) ? grupo : 'todos',
        status: 'propuesto',
        createdBy: uid,
        createdByCopiloto: true,
        sugeridaPor: travelerId,
        createdAt: FieldValue.serverTimestamp(),
      })

      return {
        ok: true,
        aviso: 'Queda en Decisiones. Cada adulto escoge una; con empate no se cierra.',
        eleccion: { id: ref.id, title: limpio, opciones: listas.map((o) => o.title) },
      }
    },

    // --- Las cuentas. La logica vive en `gastos.js`; aqui solo se pasa el
    // contexto de quien habla, que es lo que decide que puede tocar.
    anotarGasto: (a) => anotar(tripId, uid, travelerId, a),
    listarGastos: (a) => listar(tripId, a),
    quitarGasto: (a) => quitar(tripId, uid, rol, a),
    sugerirGastos: () => sugerir(tripId),
  }

  try {
    return await conversar({ apiKey, mensajes, contexto, herramientas })
  } catch (e) {
    console.error('copiloto', e)
    throw new HttpsError('internal', 'El copiloto se atascó. Inténtalo otra vez.')
  }
})


/**
 * Entrar al viaje con un codigo y nada mas. Sin Google, sin correo.
 *
 * Esta funcion ES el sistema de identidad de la app. Recibe un codigo
 * personal, comprueba de quien es y devuelve un token de sesion a nombre de
 * ese viajero. El navegador lo canjea y ya esta dentro.
 *
 * Va sin autenticar a proposito: quien llama todavia no tiene sesion — el
 * objetivo es precisamente que no tenga que sacarse una con Google.
 *
 * El uid es estable y sale del viajero (`viajero_julian-padre`), no de la
 * cuenta: quien mete su codigo en otro telefono es la misma persona y hereda
 * sus votos. Un uid anonimo por dispositivo habria dejado votos huerfanos.
 *
 * **El codigo manda.** Si el viajero ya estaba enganchado a otro uid — por
 * ejemplo al de Google de antes — se le mueve. Tener el codigo es la prueba
 * de identidad; si no fuera asi, cambiar de movil te dejaria fuera para
 * siempre.
 */
const LIMITE_INTENTOS = 10
const VENTANA_MS = 60 * 60 * 1000
const uidDe = (travelerId) => `viajero_${travelerId}`

export const unirse = onCall(
  { region: 'europe-west1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 3 },
  async (peticion) => {
    const tripId = cleanText(peticion.data?.tripId ?? '').slice(0, 60) || 'sept-2026'
    // Mayusculas y solo alfanumerico: la gente pega el codigo con espacios,
    // guiones o en minuscula, y eso no puede ser motivo de rechazo.
    const codigo = cleanText(peticion.data?.codigo ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (codigo.length < 6) throw new HttpsError('invalid-argument', 'Ese codigo es muy corto.')

    // Sin sesion no hay uid con el que contar intentos: se cuenta por IP.
    const ip = (peticion.rawRequest?.headers?.['x-forwarded-for'] ?? '')
      .toString().split(',')[0].trim().replace(/[^a-zA-Z0-9.:]/g, '_') || 'desconocida'
    const intentosRef = db.doc(`trips/${tripId}/joinAttempts/${ip}`)
    const intentos = await intentosRef.get()
    const desde = intentos.get('desde')?.toMillis?.() ?? 0
    const fallos = Date.now() - desde < VENTANA_MS ? (intentos.get('fallos') ?? 0) : 0
    if (fallos >= LIMITE_INTENTOS) {
      throw new HttpsError('resource-exhausted', 'Demasiados intentos. Prueba dentro de un rato.')
    }

    // Los codigos viven en `codes/{id}`, que nadie puede leer desde el
    // cliente. Se mira tambien en `travelers` porque ahi estuvieron primero:
    // sin esta doble busqueda, entre el despliegue y la migracion habria unos
    // segundos en los que nadie puede entrar.
    const [enCodes, enViajeros] = await Promise.all([
      db.collection(`trips/${tripId}/codes`).where('joinCode', '==', codigo).limit(1).get(),
      db.collection(`trips/${tripId}/travelers`).where('joinCode', '==', codigo).limit(1).get(),
    ])
    const encontrados = enCodes.empty ? enViajeros : enCodes

    if (encontrados.empty) {
      await intentosRef.set({
        fallos: fallos + 1,
        desde: fallos === 0 ? FieldValue.serverTimestamp() : (intentos.get('desde') ?? FieldValue.serverTimestamp()),
      }, { merge: true })
      throw new HttpsError('permission-denied', 'Ese codigo no vale para este viaje.')
    }

    const viajero = encontrados.docs[0]
    const travelerId = viajero.id
    const uid = uidDe(travelerId)

    const tripRef = db.doc(`trips/${tripId}`)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(tripRef)
      if (!snap.exists) throw new HttpsError('not-found', 'Ese viaje no existe.')
      const trip = snap.data()

      const rol = trip.rolesPorViajero?.[travelerId] ?? 'adult'
      const parche = { [`roles.${uid}`]: rol, [`uidToTraveler.${uid}`]: travelerId }

      // Se limpian los uid viejos de ese mismo viajero (los de Google, o los
      // de un movil que ya no usa). Si no, el mapa acumula fantasmas y la
      // lista de "quien ha entrado" deja de significar nada.
      for (const [otro, quien] of Object.entries(trip.uidToTraveler ?? {})) {
        if (quien === travelerId && otro !== uid) {
          parche[`uidToTraveler.${otro}`] = FieldValue.delete()
          parche[`roles.${otro}`] = FieldValue.delete()
        }
      }
      tx.update(tripRef, parche)
    })

    await intentosRef.delete().catch(() => {})
    const token = await getAuth().createCustomToken(uid, { travelerId, tripId })
    // El nombre esta en `travelers`, no en `codes`: el documento encontrado
    // puede ser cualquiera de los dos.
    const ficha = await db.doc(`trips/${tripId}/travelers/${travelerId}`).get()
    return { token, travelerId, nombre: ficha.get('short') ?? travelerId }
  },
)

/**
 * Meter y quitar planes sin pasar por el modelo.
 *
 * La logica esta en `planes.js`; aqui solo el transporte. Agregar Rosi La Loca
 * al jueves a la una no necesita que Gemini interprete nada: gastarle una
 * llamada seria pagar por adivinar algo que ya sabemos.
 */
const opcionesPlan = { region: 'europe-west1', timeoutSeconds: 30, memory: '256MiB', maxInstances: 3 }

export const agregarPlan = onCall(opcionesPlan, crearPlan)
export const quitarPlan = onCall(opcionesPlan, borrarPlan)
// Editar necesita Places: cambiar «Rosi La Loca» por «Casa Julio» sin volver
// a resolver la direccion dejaria el pin viejo con el nombre nuevo.
export const cambiarUnPlan = onCall({ ...opcionesPlan, secrets: [mapsApiKey] }, cambiarPlan)
// Una ruta son hasta seis momentos en la agenda. Sin esto, deshacerla son
// seis toques, y una funcion que cuesta seis toques deshacer no se prueba.
export const quitarRuta = onCall(opcionesPlan, borrarRuta)

/**
 * Ajustes. Solo responde a un owner, y por eso vive en el servidor: los
 * codigos personales no se pueden leer desde el cliente ni siendo miembro.
 */
export const gente = onCall(opcionesPlan, verGente)
export const desvincular = onCall(opcionesPlan, soltar)
