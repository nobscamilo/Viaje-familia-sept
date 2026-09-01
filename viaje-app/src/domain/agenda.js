/**
 * Qué pasa AHORA. Lógica pura, sin React.
 *
 * La superficie se llama «Ahora» y hasta hoy enseñaba los catorce días en
 * orden: el 11 en Madrid había que pasar el día 10 haciendo scroll. Esto es
 * lo que la hace merecer el nombre.
 *
 * Todo recibe `ahora` como parámetro en vez de leer el reloj: así se puede
 * probar, y se puede previsualizar cualquier día del viaje sin esperar.
 */
import { diaDelViaje, mismoDia } from './dates.js'

export const FASES = { ANTES: 'antes', DURANTE: 'durante', DESPUES: 'despues' }

export function faseDelViaje(trip, ahora = new Date()) {
  const hoy = diaDelViaje(ahora)
  if (hoy < trip.startDate) return FASES.ANTES
  if (hoy > trip.endDate) return FASES.DESPUES
  return FASES.DURANTE
}

/** Dias enteros entre dos 'YYYY-MM-DD'. Al mediodia UTC para que el horario de verano no reste uno. */
export function diasEntre(desde, hasta) {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000)
}

/**
 * En que dia del viaje estamos: { n, total }. null si aun no empieza o ya acabo.
 * La cabecera decia «15 dias» el 11 de septiembre porque contaba hacia la
 * salida y nunca dejaba de hacerlo. Durante el viaje lo util es «dia 2 de 14».
 */
export function diaDeViaje(trip, ahora = new Date()) {
  const hoy = diaDelViaje(ahora)
  if (hoy < trip.startDate || hoy > trip.endDate) return null
  return { n: diasEntre(trip.startDate, hoy) + 1, total: diasEntre(trip.startDate, trip.endDate) + 1 }
}

/** 'pasado' | 'enCurso' | 'proximo' para un evento. */
export function estadoDeEvento(evento, ahora = new Date()) {
  const hoy = diaDelViaje(ahora)
  const inicio = String(evento.start ?? '')
  const diaInicio = inicio.slice(0, 10)
  const diaFin = evento.end ? String(evento.end).slice(0, 10) : diaInicio

  if (diaFin < hoy) return 'pasado'
  if (diaInicio > hoy) return 'proximo'

  // Cae en el día de hoy: hay que mirar la hora.
  // Un alojamiento que cubre varios días está en curso todo ese tiempo.
  if (diaInicio < hoy && diaFin > hoy) return 'enCurso'

  const t = ahora.getTime()
  const tInicio = inicio.length > 10 ? new Date(inicio).getTime() : null
  const tFin = evento.end && String(evento.end).length > 10 ? new Date(evento.end).getTime() : null

  // Sin hora, un evento de hoy cuenta como en curso: es lo de hoy.
  if (tInicio === null) return 'enCurso'
  if (tFin !== null) return t < tInicio ? 'proximo' : t <= tFin ? 'enCurso' : 'pasado'

  // Con hora de inicio pero sin fin, le damos dos horas de vigencia.
  const DOS_HORAS = 2 * 60 * 60 * 1000
  if (t < tInicio) return 'proximo'
  return t - tInicio <= DOS_HORAS ? 'enCurso' : 'pasado'
}

const porInicio = (a, b) => String(a.start).localeCompare(String(b.start))

/**
 * Lo que hay que enseñar arriba del todo: lo que está pasando y lo que sigue.
 * Los alojamientos en curso se separan porque no son «lo que sigue» — son
 * el sitio donde duermes, no un plan.
 */
export function loQueSigue(timeline, ahora = new Date()) {
  const conEstado = [...timeline]
    .sort(porInicio)
    .map((ev) => ({ ...ev, cuando: estadoDeEvento(ev, ahora) }))

  const enCurso = conEstado.filter((e) => e.cuando === 'enCurso')
  return {
    base: enCurso.filter((e) => e.kind === 'lodging'),
    enCurso: enCurso.filter((e) => e.kind !== 'lodging'),
    siguiente: conEstado.find((e) => e.cuando === 'proximo') ?? null,
    pasados: conEstado.filter((e) => e.cuando === 'pasado').length,
  }
}

/** Lo de hoy, sin el alojamiento de fondo. */
export function planDeHoy(timeline, ahora = new Date()) {
  const hoy = diaDelViaje(ahora)
  return [...timeline]
    .filter((e) => String(e.start).slice(0, 10) === hoy)
    .sort(porInicio)
}

/**
 * Cuánto falta, en palabras. «en 25 min», «en 3 h», «mañana», «el jueves».
 * Un número exacto de minutos no ayuda a nadie a las siete de la mañana.
 */
export function cuantoFalta(evento, ahora = new Date()) {
  const inicio = String(evento.start ?? '')
  if (!inicio) return ''

  if (inicio.length > 10) {
    const minutos = Math.round((new Date(inicio).getTime() - ahora.getTime()) / 60000)
    if (minutos < 0) return 'ya empezó'
    if (minutos < 60) return `en ${minutos} min`
    if (minutos < 300) {
      const h = Math.floor(minutos / 60)
      const m = minutos % 60
      return m ? `en ${h} h ${m} min` : `en ${h} h`
    }
  }

  if (mismoDia(inicio, ahora)) return 'hoy'
  const dias = diasEntre(diaDelViaje(ahora), inicio.slice(0, 10))
  if (dias === 1) return 'mañana'
  if (dias === 2) return 'pasado mañana'
  return `en ${dias} días`
}

/**
 * Los dias del viaje, uno a uno, para elegir con el pulgar y no tecleando.
 *
 * Vivia dentro de `AgregarPlan.jsx`. Al hacer falta tambien para editar un
 * plan, copiarlo habria dejado dos listas de dias que pueden dejar de
 * coincidir: exactamente el fallo del que se sale este proyecto.
 */
export function diasDelViaje(desde, hasta) {
  const total = diasEntre(desde, hasta)
  if (!Number.isFinite(total) || total < 0) return []
  const base = Date.parse(`${desde}T12:00:00Z`)
  return Array.from({ length: total + 1 }, (_, i) =>
    new Date(base + i * 86_400_000).toISOString().slice(0, 10))
}

/**
 * Los eventos que se enseñan mirando UN dia (rediseño del 1 de septiembre:
 * «Ahora» ya no es una lista de catorce dias, es un dia con carrusel).
 *
 * Un evento sale el dia en que EMPIEZA. La excepcion son los alojamientos:
 * el hotel de Barcelona se entra el 14, pero el 15 sigues durmiendo alli, y
 * un dia sin su alojamiento parece un dia sin dormir. Se ordena por inicio,
 * asi que el alojamiento arrastrado de ayer sale arriba, como el fondo del
 * dia que es.
 */
export function eventosDelDia(timeline = [], dia) {
  if (!dia) return []
  return [...timeline]
    .filter((e) => {
      const desde = String(e.start ?? '').slice(0, 10)
      if (!desde) return false
      if (desde === dia) return true
      const hasta = e.end ? String(e.end).slice(0, 10) : desde
      return e.kind === 'lodging' && desde < dia && dia <= hasta
    })
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
}

/**
 * Que dias llevan punto de aviso en el carrusel: los que tienen algun evento
 * con `warning`. Es el mismo criterio que la tarjeta — si el aviso merece
 * banda dentro, merece punto fuera.
 */
export function diasConAviso(timeline = []) {
  const dias = new Set()
  for (const e of timeline) {
    if (!e?.warning) continue
    const desde = String(e.start ?? '').slice(0, 10)
    if (desde) dias.add(desde)
  }
  return dias
}
