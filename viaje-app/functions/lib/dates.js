// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Parseo de fechas de viaje y calculo de la ventana del viaje.
import { cleanText } from './text.js'

// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Parseo de fechas de viaje y calculo de la ventana del viaje.

export function parseTripDates(value) {
  const text = cleanText(value).toLowerCase()
  const year = text.match(/\b(20\d{2})\b/)?.[1] || '2026'
  const monthMap = {
    ene: '01',
    enero: '01',
    feb: '02',
    febrero: '02',
    mar: '03',
    marzo: '03',
    abr: '04',
    abril: '04',
    may: '05',
    mayo: '05',
    jun: '06',
    junio: '06',
    jul: '07',
    julio: '07',
    ago: '08',
    agosto: '08',
    sep: '09',
    septiembre: '09',
    oct: '10',
    octubre: '10',
    nov: '11',
    noviembre: '11',
    dic: '12',
    diciembre: '12',
  }
  const monthKey = Object.keys(monthMap).find((key) => text.includes(key))
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((day) => day >= 1 && day <= 31)

  if (!monthKey || days.length < 2) return { checkin: '', checkout: '' }

  return {
    checkin: `${year}-${monthMap[monthKey]}-${String(days[0]).padStart(2, '0')}`,
    checkout: `${year}-${monthMap[monthKey]}-${String(days[1]).padStart(2, '0')}`,
  }
}

export function buildTripWindow(tripDoc, clientCtx = {}) {
  const mainCity = clientCtx.mainCity || tripDoc?.destination || tripDoc?.name || 'Madrid'
  const start = clientCtx.mainStart || tripDoc?.startDate || ''
  const end = clientCtx.mainEnd || tripDoc?.endDate || ''
  const returnDate = clientCtx.returnDate || ''

  const lines = []

  if (start && end) {
    lines.push(`VIAJE PRINCIPAL (INAMOVIBLE): ${mainCity} del ${start} al ${end}.`)
    lines.push(`No se puede cambiar ni reducir esta etapa.`)
  }

  if (end && returnDate) {
    lines.push(`VENTANA DISPONIBLE PARA CIUDADES ADICIONALES: del ${end} al ${returnDate}.`)
    lines.push(`Todas las sugerencias de ciudades extra deben caber en este período.`)
  } else if (end) {
    lines.push(`VENTANA DISPONIBLE: a partir del ${end} (fecha de regreso aún no definida).`)
  }

  if (lines.length === 0) return ''
  return lines.join('\n')
}

// ─── assessTripPlan
// Given a list of trip cities, returns a structured analysis with priorities,
// viability scores, day distribution, and transfer suggestions.
