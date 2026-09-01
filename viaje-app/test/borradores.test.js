import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { limpiarParadas } from '../functions/lib/planificar.js'

const lee = (r) => readFileSync(new URL(r, import.meta.url), 'utf8')

/**
 * El paso previo: el copiloto propone y espera.
 *
 * Lo que se prueba aqui no es que la ruta salga bonita, es la frontera. Un
 * borrador viaja al navegador, alguien le quita una parada y vuelve. Si en
 * ese viaje de ida y vuelta se colara UNA hora calculada por el cliente,
 * tendriamos una ruta con horarios de la version anterior — plausibles y
 * falsos, que es la peor clase de error y el que nadie ve hasta estar alli.
 */

const parada = {
  titulo: 'Mercado de San Miguel',
  tipo: 'food',
  minutos: 60,
  direccion: 'Plaza de San Miguel, s/n, 28005 Madrid',
  coords: { lat: 40.4155, lng: -3.7091 },
  placeId: 'abc123',
  nota: 4.3,
  resenas: 92000,
}

test('las horas que manda el navegador se tiran a la basura', () => {
  const [limpia] = limpiarParadas([{ ...parada, llegada: '03:00', salida: '23:59', trasladoMin: 999 }])
  assert.equal(limpia.llegada, undefined, 'la llegada la pone el servidor, siempre')
  assert.equal(limpia.salida, undefined)
  assert.equal(limpia.trasladoMin, undefined)
  // Y lo que si se acepta, se acepta: el sitio ya se resolvio contra Places
  // al proponer, y volver a preguntarlo seria pagar dos veces por lo mismo.
  assert.equal(limpia.titulo, 'Mercado de San Miguel')
  assert.deepEqual(limpia.coords, { lat: 40.4155, lng: -3.7091 })
})

test('una parada sin coordenadas no entra: sin pin no hay traslado que calcular', () => {
  assert.deepEqual(limpiarParadas([{ titulo: 'Un sitio' }]), [])
  assert.deepEqual(limpiarParadas([{ ...parada, coords: { lat: 'x', lng: null } }]), [])
  assert.deepEqual(limpiarParadas([{ ...parada, titulo: '   ' }]), [])
})

test('el rato en cada sitio se acota; ocho horas en un museo no es una parada', () => {
  assert.equal(limpiarParadas([{ ...parada, minutos: 99999 }])[0].minutos, 480)
  assert.equal(limpiarParadas([{ ...parada, minutos: -5 }])[0].minutos, null)
  // null significa «usa el valor por tipo», no cero.
  assert.equal(limpiarParadas([{ ...parada, minutos: undefined }])[0].minutos, null)
})

test('un tipo que no conocemos cae a «activity», no se cuela', () => {
  assert.equal(limpiarParadas([{ ...parada, tipo: 'discoteca' }])[0].tipo, 'activity')
})

test('no se aceptan mas de seis paradas por mucho que se manden', () => {
  const muchas = Array.from({ length: 20 }, (_, i) => ({ ...parada, titulo: `Sitio ${i}` }))
  assert.equal(limpiarParadas(muchas).length, 6)
})

// ------------------------------------------------------- las tres piezas
//
// Igual que con `armarRuta`: si falta una, la funcion existe a medias. Un
// borrador que se calcula y no se puede guardar es peor que no tenerlo.

test('armarRuta ya NO escribe en la agenda', () => {
  const src = lee('../functions/rutas.js')
  const desde = src.indexOf('export async function armarRuta')
  const hasta = src.indexOf('function cabecera')
  const cuerpo = src.slice(desde, hasta)
  assert.ok(desde > 0 && hasta > desde)
  assert.ok(!/lote|batch\(\)|\.set\(/.test(cuerpo),
    'armarRuta calcula y devuelve un borrador; escribir es cosa de guardar()')
  assert.match(cuerpo, /borrador/)
})

test('recalcular y guardar existen, estan enchufadas y llevan la clave de Maps', () => {
  const idx = lee('../functions/index.js')
  assert.match(idx, /export const recalcularRuta = onCall\(\{ \.\.\.opcionesPlan, secrets: \[mapsApiKey\]/)
  assert.match(idx, /export const guardarRuta = onCall\(\{ \.\.\.opcionesPlan, secrets: \[mapsApiKey\]/)
  // Sin la clave, `calcularTramos` no puede preguntarle a Routes y la ruta
  // sale con todos los traslados a null sin decir por que.
  const srv = lee('../src/services/planes.js')
  assert.match(srv, /llamar\('recalcularRuta'/)
  assert.match(srv, /llamar\('guardarRuta'/)
})

test('el hilo del copiloto monta de verdad las dos tarjetas de borrador', () => {
  // Una sustitucion que no encaja falla EN SILENCIO: quedaria el servidor
  // entero construido y ningun camino desde la pantalla. Ya paso una vez con
  // el borrado de gastos, que vivio un dia con seis pruebas verdes y sin boton.
  const src = lee('../src/app/surfaces/Copiloto.jsx')
  assert.match(src, /<BorradorRuta/)
  assert.match(src, /<BorradorPlan/)
})

test('agregarAlPlan propone y no escribe', () => {
  const idx = lee('../functions/index.js')
  const desde = idx.indexOf('async agregarAlPlan(')
  const hasta = idx.indexOf('armarRuta: (args)')
  const cuerpo = idx.slice(desde, hasta)
  assert.ok(desde > 0 && hasta > desde)
  assert.ok(!/\.add\(|\.set\(/.test(cuerpo), 'la escritura la hace agregarPlan cuando alguien pulsa')
  assert.match(cuerpo, /borradorPlan/)
})

test('al modelo se le quita el borrador entero, no solo las fotos', () => {
  // Trae coordenadas, placeIds y los siete renglones de horario de Google.
  // Gastar tokens en quince digitos de latitud que no va a leer es caro y
  // ademas le tienta a repetirlos mal.
  const src = lee('../functions/lib/copiloto.js')
  assert.match(src, /delete salida\.borrador\b/)
  assert.match(src, /delete salida\.borradorPlan\b/)
})

test('proponer un borrador cuenta como haber llamado a la herramienta', () => {
  // Si no, el guardia contra la mentira dispara en CADA ruta bien hecha:
  // «te dejo propuesto el plan» ya casa con el patron de «lo agendé».
  const src = lee('../functions/lib/copiloto.js')
  const desde = src.indexOf('export function queMintio')
  const cuerpo = src.slice(desde, src.indexOf('export function corregirSiMiente'))
  assert.match(cuerpo, /borradores/)
  assert.match(cuerpo, /borradoresPlan/)
})

test('al modelo se le dice que ya no escribe, no solo se le cambia la herramienta', () => {
  // Cambiar la herramienta y dejar las instrucciones diciendo «entra como
  // propuesto en la agenda» produce un copiloto que promete algo que no ha
  // pasado. Es exactamente la mentira que el guardia intenta cazar.
  const src = lee('../functions/lib/copiloto.js')
  assert.match(src, /TAMPOCO ESCRIBES EN LA/)
  assert.ok(!/Entra como PROPUESTO en la agenda/.test(src))
})
