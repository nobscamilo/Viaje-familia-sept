// Prueba de humo del codigo rescatado del proyecto anterior.
// No valida logica de negocio: valida que los modulos cargan, que las
// dependencias entre ellos resuelven y que las piezas puras siguen haciendo
// lo que hacian. Es lo minimo para poder confiar en el rescate.
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { cleanText, slug, cityKey, clamp, cleanNumber, stripUndefined } from '../functions/lib/text.js'
import { normalizePriceNumber } from '../functions/lib/prices.js'
import { parseTripDates } from '../functions/lib/dates.js'
import { formatTime, formatDayLong, groupByDay, mismoDia, noches } from '../src/domain/dates.js'
import { TRAVELERS, isVoter, isChild, groupComposition } from '../src/data/travelers.js'
import { TIMELINE, OPEN_DECISIONS, GROUPS } from '../src/data/trip-madrid-2026.js'

test('text: utilidades puras', () => {
  assert.equal(cleanText('  hola mundo  '), 'hola mundo') // solo recorta extremos, no colapsa espacios
  assert.equal(slug('Carrera de San Jerónimo'), 'carrera-de-san-jeronimo')
  assert.equal(cityKey('Bilbao'), 'bilbao')
  assert.equal(clamp(50, 1, 10), 10)
  assert.equal(cleanNumber('12'), 12)
  assert.deepEqual(stripUndefined({ a: 1, b: undefined }), { a: 1 })
})

test('prices: formato europeo, que es la razon de ser del modulo', () => {
  assert.equal(normalizePriceNumber('1.234,56'), 1234.56, 'formato europeo con miles y centimos')
  assert.equal(normalizePriceNumber('3.078'), 3078, 'punto de millares sin centimos')
  assert.equal(normalizePriceNumber('3.058,74'), 3058.74, 'el precio real del apartamento, al centimo')
  assert.equal(normalizePriceNumber('1,234.56'), 1234.56, 'formato anglosajon')
  assert.equal(normalizePriceNumber('gratis'), null)
})

test('dates: parseo de fechas de viaje', () => {
  const parsed = parseTripDates('10-14 sep 2026')
  assert.ok(parsed, 'parseTripDates deberia devolver algo para un rango en espanol')
})

test('viajeros: 9 en total, 7 votan, 2 ninos que nunca votan', () => {
  assert.equal(TRAVELERS.length, 9)
  assert.equal(TRAVELERS.filter(isVoter).length, 7)
  const kids = TRAVELERS.filter(isChild)
  assert.equal(kids.length, 2)
  assert.deepEqual(kids.map((k) => k.age).sort((a, b) => a - b), [4, 9])
  for (const kid of kids) assert.equal(isVoter(kid), false, `${kid.short} no puede votar`)
})

test('viajeros: la composicion cuadra con la reserva de Booking (7 adultos + 2 ninos)', () => {
  const g = groupComposition()
  assert.equal(g.adults, 7)
  assert.equal(g.children.length, 2)
})

test('viaje: la linea de tiempo cubre a los 9 el dia de llegada', () => {
  const bilbao = TIMELINE.find((e) => e.id === 'vuelo-bio-mad')
  const bogota = TIMELINE.find((e) => e.id === 'vuelo-av182')
  assert.equal(bilbao.locator, 'PH6PQ')
  assert.equal(bilbao.travelerIds.length, 2)
  assert.equal(bogota.travelerIds.length, 7)
  // Entre los dos vuelos tienen que estar los 9, sin repetidos.
  const llegan = new Set([...bilbao.travelerIds, ...bogota.travelerIds])
  assert.equal(llegan.size, 9, 'los dos vuelos juntos cubren a los nueve')
  assert.equal(bilbao.to.terminal, bogota.to.terminal, 'ambos llegan a T4')
})

test('viaje: el apartamento de Madrid no es cancelable', () => {
  const madrid = TIMELINE.find((e) => e.id === 'aloj-madrid')
  assert.equal(madrid.refundable, false)
  assert.equal(madrid.capacity.adults + madrid.capacity.children, 9)
})

test('F1: tres dias, tres personas, con horarios reales', () => {
  const dias = TIMELINE.filter((e) => e.kind === 'f1')
  assert.equal(dias.length, 3, 'viernes, sabado y domingo')
  for (const dia of dias) {
    assert.deepEqual([...dia.travelerIds].sort(), ['camilo', 'fernando', 'juliana-bueno'])
    assert.ok(dia.sessions.length > 0, `${dia.id} necesita horarios`)
  }
  const domingo = dias.find((d) => d.id === 'madring-dom')
  assert.ok(domingo.sessions.some((s) => s.name.includes('CARRERA')))
})

test('subgrupos: el de F1 y el de sin-F1 suman los 9 y no se solapan', () => {
  const f1 = GROUPS.f1.travelerIds
  const sinF1 = GROUPS.sinF1.travelerIds
  assert.equal(f1.length + sinF1.length, 9)
  assert.equal(f1.filter((id) => sinF1.includes(id)).length, 0, 'nadie puede estar en los dos')
})

test('conflictos: el Bernabeu choca con el viernes de F1 y esta marcado', () => {
  const bernabeu = TIMELINE.find((e) => e.id === 'bernabeu')
  assert.ok(bernabeu.conflictsWith?.includes('madring-vie'))
  assert.ok(bernabeu.warning, 'un choque de agenda tiene que estar visible en los datos')
  assert.ok(OPEN_DECISIONS.some((d) => d.id === 'conflicto-bernabeu' && d.urgency === 'alta'))
})

test('secretos: no hay PIN ni telefonos en los datos del repo', async () => {
  const { readFileSync } = await import('node:fs')
  const raw = readFileSync(new URL('../src/data/trip-madrid-2026.js', import.meta.url), 'utf8')
  for (const secreto of ['8033', '0448', '3179', '662 42 85 30', 'shortLink']) {
    assert.ok(!raw.includes(secreto), `el repo es publico: ${secreto} no puede estar aqui`)
  }
})

test('fechas: un evento sin hora o sin fin no puede tumbar la pantalla', () => {
  // Este es el bug que dejo "Ahora" en negro: formatTime(undefined) reventaba.
  assert.equal(formatTime(undefined), '')
  assert.equal(formatTime(null), '')
  assert.equal(formatTime('2026-09-14'), '', 'fecha suelta: no hay hora que mostrar')
  assert.equal(formatTime('2026-09-10T09:15:00+02:00'), '09:15')
  assert.equal(formatDayLong('2026-09-10'), 'jueves 10 de septiembre')
})

test('fechas: todos los eventos del viaje se formatean sin lanzar', () => {
  for (const ev of TIMELINE) {
    assert.doesNotThrow(() => {
      formatTime(ev.start); formatTime(ev.end); formatDayLong(String(ev.start).slice(0, 10))
    }, `${ev.id} rompe el formateo`)
  }
})

test('fechas: las horas se muestran en la zona del viaje, no en la del aparato', () => {
  // El contenedor de pruebas corre en UTC. Si esto devolviera 07:15, la app
  // le estaria mintiendo a cualquiera que la abra desde fuera de Espana.
  assert.equal(formatTime('2026-09-10T09:15:00+02:00'), '09:15')
  assert.equal(formatTime('2026-09-13T15:00:00+02:00'), '15:00', 'la salida de la carrera')
  assert.equal(formatDayLong('2026-09-11'), 'viernes 11 de septiembre')
  assert.equal(formatDayLong('2026-09-13'), 'domingo 13 de septiembre')
})

test('fechas: los eventos se agrupan en el dia correcto del destino', () => {
  const dias = groupByDay(TIMELINE).map((g) => g.day)
  assert.equal(dias[0], '2026-09-10', 'el viaje empieza el 10')
  assert.deepEqual(dias, [...dias].sort(), 'los dias salen en orden')
  assert.equal(new Set(dias).size, dias.length, 'sin dias repetidos')
})

test('fechas: un evento que cruza dias no se pinta como rango de horas', () => {
  // "15:00-11:00" se lee como cuatro horas hacia atras. El apartamento de
  // Madrid entra el 10 y sale el 14.
  assert.equal(mismoDia('2026-09-10T15:00:00+02:00', '2026-09-14T11:00:00+02:00'), false)
  assert.equal(noches('2026-09-10T15:00:00+02:00', '2026-09-14T11:00:00+02:00'), 4)
  assert.equal(mismoDia('2026-09-10T09:15:00+02:00', '2026-09-10T10:25:00+02:00'), true)
})
