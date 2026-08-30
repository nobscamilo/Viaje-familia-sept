/**
 * Fechas de la app.
 *
 * REGLA: todo se formatea en la zona horaria DEL VIAJE, no en la del
 * dispositivo. Si Camilo abre la app desde Bilbao y su hermana desde Bogotá,
 * los dos tienen que leer "09:15" para el mismo vuelo. Mostrar la hora local
 * del teléfono en una app de viajes es un bug, no una comodidad.
 *
 * Sin librerías: `Intl` ya sabe hacer esto.
 */

import { TRIP } from '../data/trip-madrid-2026.js'

const TZ = TRIP.timezone
const MS_DIA = 86_400_000

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Una fecha suelta ("2026-09-14") se ancla a mediodía UTC para que ningún
 *  desfase horario la mueva de día. Con hora, se respeta el offset del dato. */
function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string' || !value) return null
  const d = new Date(value.length <= 10 ? `${value}T12:00:00Z` : value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Partes de la fecha tal como se ven EN EL DESTINO. */
function partsInTrip(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short',
    hour12: false,
  })
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]))
  const iso = `${p.year}-${p.month}-${p.day}`
  return {
    iso,
    day: Number(p.day),
    monthIndex: Number(p.month) - 1,
    // getDay() sobre la fecha civil del destino, no sobre la del dispositivo.
    weekday: new Date(`${iso}T12:00:00Z`).getUTCDay(),
    hour: p.hour === '24' ? '00' : p.hour,
    minute: p.minute,
  }
}

/** El día civil en el destino, como 'AAAA-MM-DD'. */
export function diaDelViaje(valor = new Date()) {
  const d = toDate(valor)
  return d ? partsInTrip(d).iso : ''
}

/** Días que faltan hasta una fecha, contados en el calendario del viaje. */
export function daysUntil(isoDate, now = new Date()) {
  const target = toDate(isoDate)
  if (!target) return 0
  const hoy = new Date(`${partsInTrip(now).iso}T12:00:00Z`)
  const dest = new Date(`${partsInTrip(target).iso}T12:00:00Z`)
  return Math.max(0, Math.round((dest - hoy) / MS_DIA))
}

/** "09:15" en hora del destino. Vacío si el evento no tiene hora. */
export function formatTime(value) {
  if (!value) return ''
  if (typeof value === 'string' && value.length <= 10) return ''
  const d = toDate(value)
  if (!d) return ''
  const p = partsInTrip(d)
  return `${p.hour}:${p.minute}`
}

/** "jue 10 sep" */
export function formatDay(value) {
  const d = toDate(value)
  if (!d) return ''
  const p = partsInTrip(d)
  return `${DIAS_CORTOS[p.weekday]} ${p.day} ${MESES_CORTOS[p.monthIndex]}`
}

/** "jueves 10 de septiembre" */
export function formatDayLong(value) {
  const d = toDate(value)
  if (!d) return ''
  const p = partsInTrip(d)
  return `${DIAS_LARGOS[p.weekday]} ${p.day} de ${MESES_LARGOS[p.monthIndex]}`
}

/** "10–19 sep 2026" */
export function formatRange(startIso, endIso) {
  const a = toDate(startIso)
  const b = toDate(endIso)
  if (!a || !b) return ''
  const pa = partsInTrip(a)
  const pb = partsInTrip(b)
  const anio = pb.iso.slice(0, 4)
  return pa.monthIndex === pb.monthIndex
    ? `${pa.day}–${pb.day} ${MESES_CORTOS[pb.monthIndex]} ${anio}`
    : `${pa.day} ${MESES_CORTOS[pa.monthIndex]} – ${pb.day} ${MESES_CORTOS[pb.monthIndex]} ${anio}`
}

/** Agrupa por día del destino, en orden cronológico. */
export function groupByDay(events) {
  const grupos = new Map()
  const ordenados = [...events].sort((a, b) => String(a.start).localeCompare(String(b.start)))
  for (const ev of ordenados) {
    const d = toDate(ev.start)
    const key = d ? partsInTrip(d).iso : String(ev.start).slice(0, 10)
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key).push(ev)
  }
  return [...grupos.entries()].map(([day, items]) => ({ day, items }))
}

/** ¿Empieza y acaba el mismo día del destino? */
export function mismoDia(a, b) {
  const da = toDate(a)
  const db = toDate(b)
  if (!da || !db) return true
  return partsInTrip(da).iso === partsInTrip(db).iso
}

/** Noches entre dos fechas, contadas por día del destino. */
export function noches(a, b) {
  const da = toDate(a)
  const db = toDate(b)
  if (!da || !db) return 0
  const ia = new Date(`${partsInTrip(da).iso}T12:00:00Z`)
  const ib = new Date(`${partsInTrip(db).iso}T12:00:00Z`)
  return Math.max(0, Math.round((ib - ia) / MS_DIA))
}

