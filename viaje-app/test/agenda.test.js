import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { TIMELINE, TRIP } from '../src/data/trip-madrid-2026.js'
import {
  FASES, cuantoFalta, diaDeViaje, diasEntre, estadoDeEvento, faseDelViaje, loQueSigue, planDeHoy,
} from '../src/domain/agenda.js'

// Momentos concretos del viaje, en hora de Madrid.
const el26agosto = new Date('2026-08-26T12:00:00+02:00')
const el10a0800 = new Date('2026-09-10T08:00:00+02:00')  // antes del vuelo
const el10a0930 = new Date('2026-09-10T09:30:00+02:00')  // volando
const el11a1400 = new Date('2026-09-11T14:00:00+02:00')  // viernes de circuito
const el30sept = new Date('2026-09-30T12:00:00+02:00')

test('fase: antes, durante y despues del viaje', () => {
  assert.equal(faseDelViaje(TRIP, el26agosto), FASES.ANTES)
  assert.equal(faseDelViaje(TRIP, el10a0800), FASES.DURANTE)
  assert.equal(faseDelViaje(TRIP, el11a1400), FASES.DURANTE)
  assert.equal(faseDelViaje(TRIP, el30sept), FASES.DESPUES)
})

test('un vuelo esta proximo, en curso y pasado segun la hora', () => {
  const vuelo = TIMELINE.find((e) => e.id === 'vuelo-bio-mad') // 09:15–10:25
  assert.equal(estadoDeEvento(vuelo, el10a0800), 'proximo')
  assert.equal(estadoDeEvento(vuelo, el10a0930), 'enCurso')
  assert.equal(estadoDeEvento(vuelo, new Date('2026-09-10T18:00:00+02:00')), 'pasado')
  assert.equal(estadoDeEvento(vuelo, el11a1400), 'pasado')
})

test('el apartamento sigue EN CURSO los dias intermedios', () => {
  // Es lo que distingue "donde duermo" de "que hago": del 10 al 14 el
  // apartamento esta vigente aunque no empiece ni acabe ese dia.
  const piso = TIMELINE.find((e) => e.id === 'aloj-madrid')
  assert.equal(estadoDeEvento(piso, el11a1400), 'enCurso')
  assert.equal(estadoDeEvento(piso, new Date('2026-09-12T23:00:00+02:00')), 'enCurso')
  assert.equal(estadoDeEvento(piso, el10a0800), 'proximo')
  assert.equal(estadoDeEvento(piso, new Date('2026-09-16T12:00:00+02:00')), 'pasado')
})

test('loQueSigue separa el alojamiento de los planes', () => {
  const r = loQueSigue(TIMELINE, el11a1400)
  assert.ok(r.base.some((e) => e.id === 'aloj-madrid'), 'el piso de Sol es la base')
  assert.ok(r.base.every((e) => e.kind === 'lodging'))
  assert.ok(r.enCurso.every((e) => e.kind !== 'lodging'), 'la base no se cuela en los planes')
})

test('el viernes 11 a las 14:00 esta en curso el circuito', () => {
  const r = loQueSigue(TIMELINE, el11a1400)  // MADRING 09:55–19:15
  assert.ok(r.enCurso.some((e) => e.id === 'madring-vie'))
})

test('el 10 a las 08:00 lo siguiente es el vuelo de Bilbao', () => {
  // El IB0430 sale a las 09:15; el AV182 aterriza a las 11:10 (verificado en la
  // reserva el 26 ago, despues de que cuatro rastreadores dijeran 09:05 y se
  // equivocaran). Si alguien vuelve a tocar esa hora, esta prueba lo canta.
  const r = loQueSigue(TIMELINE, el10a0800)
  assert.equal(r.siguiente.id, 'vuelo-bio-mad')
  assert.equal(r.pasados, 0, 'el primer dia no hay nada pasado')
})

test('el plan de hoy son solo los eventos de hoy, en orden', () => {
  const hoy = planDeHoy(TIMELINE, el10a0800)
  assert.ok(hoy.length >= 3, 'el 10 hay vuelo, vuelo y apartamento')
  assert.equal(hoy[0].id, 'vuelo-bio-mad', '09:15 va antes que 11:10')
  assert.deepEqual(hoy.map((e) => String(e.start)), [...hoy.map((e) => String(e.start))].sort())
  assert.ok(hoy.every((e) => String(e.start).startsWith('2026-09-10')))
})

test('cuanto falta se dice en palabras, no en minutos exactos', () => {
  const vuelo = TIMELINE.find((e) => e.id === 'vuelo-bio-mad')
  assert.equal(cuantoFalta(vuelo, new Date('2026-09-10T08:50:00+02:00')), 'en 25 min')
  assert.equal(cuantoFalta(vuelo, new Date('2026-09-10T07:15:00+02:00')), 'en 2 h')
  assert.equal(cuantoFalta(vuelo, new Date('2026-09-09T09:00:00+02:00')), 'mañana')
  assert.equal(cuantoFalta(vuelo, new Date('2026-09-08T09:00:00+02:00')), 'pasado mañana')
  assert.equal(cuantoFalta(vuelo, new Date('2026-09-10T10:00:00+02:00')), 'ya empezó')
})

test('dia del viaje: la cabecera cuenta hacia dentro, no hacia la salida', () => {
  // El 11 de septiembre la cabecera ponia «15 dias»: seguia contando hacia el
  // 10 aunque ya estuvieran en Madrid.
  assert.equal(diaDeViaje(TRIP, el26agosto), null)
  assert.deepEqual(diaDeViaje(TRIP, el10a0800), { n: 1, total: 14 })
  assert.deepEqual(diaDeViaje(TRIP, el11a1400), { n: 2, total: 14 })
  assert.deepEqual(diaDeViaje(TRIP, new Date('2026-09-23T20:00:00+02:00')), { n: 14, total: 14 })
  assert.equal(diaDeViaje(TRIP, el30sept), null)
})

test('diasEntre no se descuadra con el cambio de hora', () => {
  assert.equal(diasEntre('2026-09-10', '2026-09-10'), 0)
  assert.equal(diasEntre('2026-09-10', '2026-09-23'), 13)
  // El horario de verano en Europa acaba el 25 de octubre de 2026.
  assert.equal(diasEntre('2026-10-24', '2026-10-26'), 2)
})

test('el 10, cuando Camilo aterriza de Bilbao, los otros 7 aun no han llegado', () => {
  // Verificado contra la reserva: AV182 aterriza 11:10, IB0430 a las 10:25.
  const alAterrizar = new Date('2026-09-10T10:30:00+02:00')
  const r = loQueSigue(TIMELINE, alAterrizar)
  assert.equal(r.siguiente.id, 'vuelo-av182', 'lo siguiente es esperarlos en T4')
  assert.equal(cuantoFalta(r.siguiente, alAterrizar), 'en 40 min')
})

test('el 14, al salir del apartamento de Madrid, lo siguiente es el OUIGO', () => {
  // Check-out a las 11:00, el tren sale a las 13:42 y el embarque cierra a las
  // 13:37. Son las dos horas y media mas apretadas del viaje.
  const alSalir = new Date('2026-09-14T11:00:00+02:00')
  const r = loQueSigue(TIMELINE, alSalir)
  assert.equal(r.siguiente.id, 'traslado-mad-bcn')
  assert.equal(cuantoFalta(r.siguiente, alSalir), 'en 2 h 42 min')
})

test('los nueve van en el OUIGO y a los nueve les vale el piso de Barcelona', () => {
  const tren = TIMELINE.find((e) => e.id === 'traslado-mad-bcn')
  const piso = TIMELINE.find((e) => e.id === 'aloj-barcelona')
  assert.equal(tren.travelerIds, 'all', 'los nueve nombres estan en los billetes J6FGQQ')
  assert.equal(piso.travelerIds, 'all')
  assert.equal(piso.refundable, false, 'no reembolsable: que nadie lo mueva a la ligera')
})

test('los nueve van en todos los tramos de Barcelona, Paris y Bilbao', () => {
  // Las tres confirmaciones (OUIGO J6FGQQ, Vueling MLD57T y SNF23N) llevan los
  // nueve nombres. Antes esto figuraba como 'pendiente' y era una duda abierta.
  for (const id of ['traslado-mad-bcn', 'vuelo-bcn-ory', 'vuelo-ory-bio', 'aloj-barcelona']) {
    const ev = TIMELINE.find((e) => e.id === id)
    assert.equal(ev.travelerIds, 'all', `${id} lo hacen los nueve`)
  }
})

test('el vuelo del 16 ya NO pide pagar unas maletas que estan pagadas', () => {
  // Hasta el 28 de agosto este momento gritaba «NO ESTA PAGADA LA MALETA DE
  // CABINA», y hacia bien: eran hasta 675 € en puerta. Se pagaron (405 € por
  // PayPal) y el aviso paso de util a peligroso: un aviso que pide pagar algo
  // ya pagado se acaba ignorando, y con el se ignoran los que si importan.
  const bcnOry = TIMELINE.find((e) => e.id === 'vuelo-bcn-ory')
  assert.ok(!bcnOry.warning, 'ya no hay nada de que avisar en este vuelo')
  assert.equal(bcnOry.priceEur, 836.91, 'el precio incluye ya las nueve maletas')
  // Modificar la reserva invalida las tarjetas de embarque: eso si queda.
  assert.match(bcnOry.todos.join(' '), /check-in/i)
})

test('ningun momento pide pagar el impuesto municipal de Barcelona', () => {
  // Se pago el 28 de agosto dentro de los 160,30 € del check-in. Que la app
  // siga diciendo «se paga alli» es como no tener app.
  const bcn = TIMELINE.find((e) => e.id === 'aloj-barcelona')
  assert.ok(!/impuesto municipal de 146,30 € \(/.test(bcn.warning ?? ''),
    'el aviso ya no lo presenta como pendiente')
  assert.match(bcn.warning, /dep[óo]sito de 300/, 'el deposito si sigue pendiente')
})

test('el copiloto no puede enseñar fechas en crudo', () => {
  // «2026-09-10 13:00» es como lo guarda Firestore, no como lo lee una
  // persona. Salio en pantalla en la vista previa del copiloto y solo se vio
  // mirando la captura: ninguna prueba miraba el texto de la interfaz.
  const jsx = readFileSync(new URL('../src/app/surfaces/Copiloto.jsx', import.meta.url), 'utf8')
  assert.ok(!/\{(p|plan)\.fecha\}/.test(jsx), 'la fecha tiene que pasar por formatDay')
  assert.match(jsx, /formatDay\((p|plan)\.fecha\)/)
})

test('la tarjeta de un sitio lleva el boton de agregar, con su viaje', () => {
  // Una sustitucion que no encaja no da error: se queda igual y en silencio.
  // Paso aqui: `Lugar` seguia sin recibir `tripId` y el boton no salia, pero
  // el codigo compilaba, las pruebas pasaban y solo lo delato la captura.
  // El 1 de septiembre `Lugar` se mudo a su propio fichero (Copiloto.jsx
  // llego a 397 de las 400 lineas permitidas). Esta prueba lo cazo: se mira
  // el paso del viaje donde se monta, y el boton donde ahora se pinta.
  const jsx = readFileSync(new URL('../src/app/surfaces/Copiloto.jsx', import.meta.url), 'utf8')
  assert.match(jsx, /<Lugar[^>]*tripId=\{tripId\}/s, 'Lugar necesita el viaje para poder escribir')
  const tarjeta = readFileSync(new URL('../src/ui/LugarTarjeta.jsx', import.meta.url), 'utf8')
  assert.match(tarjeta, /<AgregarPlan/, 'y la tarjeta tiene que pintar el boton')
})

// ------------------------------------------ el dia a dia del rediseño

test('un dia enseña lo que empieza ese dia MAS el alojamiento en curso', async () => {
  const { eventosDelDia } = await import('../src/domain/agenda.js')
  const tl = [
    { id: 'hotel', kind: 'lodging', start: '2026-09-14T16:00:00+02:00', end: '2026-09-16T11:00:00.000Z', title: 'Sweett' },
    { id: 'cena', kind: 'food', start: '2026-09-15T20:00:00+02:00', title: 'Cena' },
    { id: 'vuelo', kind: 'flight', start: '2026-09-16T15:40:00+02:00', title: 'VY8002' },
  ]
  const dia15 = eventosDelDia(tl, '2026-09-15')
  // El hotel se entro el 14, pero el 15 sigues durmiendo alli: un dia sin su
  // alojamiento parece un dia sin dormir.
  assert.deepEqual(dia15.map((e) => e.id), ['hotel', 'cena'])
  // Y un vuelo de otro dia NO se arrastra: solo los alojamientos acompañan.
  assert.ok(!dia15.some((e) => e.id === 'vuelo'))
  // El dia de la salida, el hotel sale por su end.
  assert.ok(eventosDelDia(tl, '2026-09-16').some((e) => e.id === 'hotel'))
  // Y el 17 ya no.
  assert.ok(!eventosDelDia(tl, '2026-09-17').some((e) => e.id === 'hotel'))
})

test('el punto de aviso del carrusel sale del warning del evento', async () => {
  const { diasConAviso } = await import('../src/domain/agenda.js')
  const avisos = diasConAviso([
    { start: '2026-09-14', warning: 'OUIGO mide estrecho' },
    { start: '2026-09-15', title: 'sin aviso' },
  ])
  assert.ok(avisos.has('2026-09-14'))
  assert.ok(!avisos.has('2026-09-15'))
})

test('la agenda dia a dia monta el carrusel y las flechas de verdad', () => {
  const src = readFileSync(new URL('../src/app/surfaces/Ahora.jsx', import.meta.url), 'utf8')
  assert.match(src, /<DiasCarrusel/)
  assert.match(src, /eventosDelDia\(timeline, dia\)/)
  // Durante el viaje arranca anclada en hoy: era un pendiente desde agosto.
  assert.match(src, /enViaje \? hoy :/)
})
