/**
 * Los gastos, desde el copiloto.
 *
 * Cuatro verbos: anotar, listar (con orden), quitar y sugerir. Y una frontera
 * que no se cruza: **el copiloto nunca borra lo que no puso una persona desde
 * la app**. Las reservas sembradas llevan `origen: 'seed'` y se corrigen en el
 * codigo, donde al lado de cada importe queda escrito de que correo salio.
 *
 * `sugerir` no escribe nada. Mira la agenda y las cuentas y dice que gastos
 * faltan por apuntar; decidir es de la familia. Es la diferencia entre un
 * copiloto util y uno que un dia te mete 300 € que nadie pago.
 *
 * Todo en CENTIMOS ENTEROS, igual que el cliente y que las reglas.
 */
import { HttpsError } from 'firebase-functions/v2/https'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './lib/admin.js'
import { cleanText } from './lib/text.js'
import { ADULTOS } from './lib/hogares.js'
import { dentroDelViaje, motivoFueraDelViaje } from './lib/ventana.js'

const CATEGORIAS = ['alojamiento', 'transporte', 'comida', 'entradas', 'otros']
const GRUPOS = ['todos', 'f1', 'sin-f1']
const TOPE_CENT = 1_000_000   // 10.000 € en un solo gasto: cortafuegos del dedo gordo

async function exigirMiembro(tripId, uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Entra al viaje primero.')
  const snap = await db.doc(`trips/${tripId}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Ese viaje no existe.')
  const trip = snap.data()
  const rol = trip.roles?.[uid]
  if (!rol) throw new HttpsError('permission-denied', 'No eres del viaje.')
  return { rol, travelerId: trip.uidToTraveler?.[uid] ?? null }
}

const euros = (cent) => `${(cent / 100).toFixed(2).replace('.', ',')} €`

/** Anotar. Devuelve lo que se guardo para que el modelo lo pueda repetir. */
export async function anotar(tripId, uid, travelerId, args) {
  const concepto = cleanText(args?.concepto ?? '').slice(0, 140)
  if (!concepto) return { error: 'Sin concepto: no se puede apuntar un gasto sin decir qué era.' }

  const eur = Number(args?.importeEur)
  if (!Number.isFinite(eur) || eur <= 0) return { error: 'El importe tiene que ser un número de euros mayor que cero.' }
  const cent = Math.round(eur * 100)
  if (cent > TOPE_CENT) return { error: `${euros(cent)} en un solo gasto es demasiado. Si es correcto, apúntalo desde la app.` }

  const dia = cleanText(args?.fecha ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return { error: 'La fecha va en AAAA-MM-DD.' }
  if (!dentroDelViaje(dia)) return { error: motivoFueraDelViaje(dia) }

  // Quien pago tiene que ser alguien de verdad; si no se dice, quien habla.
  const pagadoPor = cleanText(args?.pagadoPor ?? '') || travelerId
  if (!pagadoPor) return { error: 'No sé quién lo pagó.' }

  // `participantes` es un grupo, o una lista de viajeros concretos. Una lista
  // sin ningun adulto no reparte entre nadie y romperia la invariante de que
  // los saldos suman cero: se rechaza aqui, no se arregla luego.
  let participantes = 'all'
  if (GRUPOS.includes(args?.participantes)) participantes = args.participantes
  else if (args?.participantes) {
    // Gemini manda listas como texto separado por comas, no como array. Y a
    // veces una sola persona sin coma: sin este caso, «camilo» caia al `else`
    // y el gasto se repartia entre los nueve sin que nadie lo notara.
    const crudos = Array.isArray(args.participantes)
      ? args.participantes
      : String(args.participantes).split(',')
    const limpios = crudos.map((x) => cleanText(x)).filter((x) => ADULTOS.includes(x))
    if (!limpios.length) {
      return { error: 'Ninguno de esos viajeros reparte gasto. Los dos ninos no pagan nunca.' }
    }
    participantes = [...new Set(limpios)].sort()
  }

  const ref = await db.collection(`trips/${tripId}/gastos`).add({
    concepto,
    importeCent: cent,
    moneda: 'EUR',
    pagadoPor,
    participantes,
    categoria: CATEGORIAS.includes(args?.categoria) ? args.categoria : 'otros',
    fecha: dia,
    createdBy: uid,
    createdByCopiloto: true,
    sugeridoPor: travelerId,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { ok: true, gasto: { id: ref.id, concepto, importe: euros(cent), fecha: dia, pagadoPor } }
}

const ORDENES = {
  fecha: (a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''),
  importe: (a, b) => b.importeCent - a.importeCent,
  concepto: (a, b) => (a.concepto ?? '').localeCompare(b.concepto ?? '', 'es'),
  pagador: (a, b) => (a.pagadoPor ?? '').localeCompare(b.pagadoPor ?? ''),
  categoria: (a, b) => (a.categoria ?? '').localeCompare(b.categoria ?? ''),
}

/** Listar y ordenar. Solo lectura: no toca nada. */
export async function listar(tripId, args) {
  const snap = await db.collection(`trips/${tripId}/gastos`).get()
  let gastos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const cat = cleanText(args?.categoria ?? '')
  if (CATEGORIAS.includes(cat)) gastos = gastos.filter((g) => g.categoria === cat)
  const quien = cleanText(args?.pagadoPor ?? '')
  if (quien) gastos = gastos.filter((g) => g.pagadoPor === quien)

  const orden = ORDENES[args?.ordenarPor] ?? ORDENES.fecha
  gastos.sort(orden)
  if (args?.ascendente) gastos.reverse()

  const total = gastos.reduce((n, g) => n + (g.importeCent || 0), 0)
  return {
    total: euros(total),
    cuantos: gastos.length,
    // Solo 25: al modelo no le sirve una lista infinita y cuesta tokens.
    gastos: gastos.slice(0, 25).map((g) => ({
      id: g.id,
      concepto: g.concepto,
      importe: euros(g.importeCent || 0),
      fecha: g.fecha ?? null,
      pagadoPor: g.pagadoPor ?? null,
      categoria: g.categoria ?? null,
      deLaSiembra: g.origen === 'seed',
    })),
  }
}

/**
 * Quitar. Tres candados, los mismos que para los planes de la agenda:
 * que lo pusiera una persona, que no sea de la siembra, y que sea tuyo o
 * seas quien organiza.
 */
export async function quitar(tripId, uid, rol, args) {
  const id = cleanText(args?.id ?? '').slice(0, 120)
  if (!id) return { error: 'Falta cuál. Pide primero la lista para saber el id.' }

  const ref = db.doc(`trips/${tripId}/gastos/${id}`)
  const snap = await ref.get()
  if (!snap.exists) return { ok: true, yaNoEstaba: true }
  const g = snap.data()

  if (g.origen === 'seed') {
    return { error: 'Ese gasto es una reserva verificada contra su correo. No se borra desde aquí.' }
  }
  if (g.createdBy && g.createdBy !== uid && rol !== 'owner') {
    return { error: 'Lo anotó otra persona: solo puede quitarlo quien lo puso o quien organiza.' }
  }
  await ref.delete()
  return { ok: true, quitado: { concepto: g.concepto ?? null, importe: euros(g.importeCent || 0) } }
}

/**
 * Sugerir lo que falta. NO ESCRIBE NADA.
 *
 * Cruza la agenda con los gastos: un momento con precio que no tiene ningun
 * gasto detras es dinero que se ha pagado y no esta en las cuentas. Es lo que
 * de verdad descuadra un Tricount: no los cafes, sino la entrada de 60 € que
 * pago uno y nadie apunto.
 */
export async function sugerir(tripId) {
  const [agenda, gastos] = await Promise.all([
    db.collection(`trips/${tripId}/timeline`).get(),
    db.collection(`trips/${tripId}/gastos`).get(),
  ])
  const cubiertos = new Set(gastos.docs.map((d) => d.get('ref')).filter(Boolean))

  const faltan = agenda.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e) => Number.isFinite(e.priceEur) && e.priceEur > 0 && !cubiertos.has(e.id))
    .map((e) => ({ id: e.id, titulo: e.title, importe: euros(Math.round(e.priceEur * 100)), fecha: String(e.start).slice(0, 10) }))

  const sinPrecio = agenda.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e) => !Number.isFinite(e.priceEur) && ['activity', 'f1', 'lodging', 'transport'].includes(e.kind))
    .map((e) => ({ id: e.id, titulo: e.title, fecha: String(e.start).slice(0, 10) }))

  return {
    aviso: 'Esto es una revisión, no una acción: no se ha apuntado nada. Pregunta antes de anotar cualquiera.',
    conPrecioYSinGasto: faltan,
    sinPrecioConocido: sinPrecio.slice(0, 12),
  }
}

export async function contexto(tripId, uid) {
  return await exigirMiembro(tripId, uid)
}
