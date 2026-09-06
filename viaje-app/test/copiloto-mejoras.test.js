import test from 'node:test'
import assert from 'node:assert/strict'
import { buscarLugares } from '../functions/lib/herramientas.js'
import { contextoVivo, restaurarConversacion, estadoSerializable } from '../src/domain/hilo.js'
import { escribirEstado } from '../src/services/estado-copiloto.js'

const lugares = Array.from({ length: 13 }, (_, i) => ({ id: `p${i}`, displayName: { text: `Sitio ${i}` }, rating: 4.5, userRatingCount: 200 - i }))
const servicios = { searchPlaces: async () => lugares, withPlacePhotos: async (p) => p }

test('más opciones avanza sin duplicados y termina con el último lote incompleto', async () => {
  let excluir = [], ids = []
  for (const cuantos of [5, 5, 3]) {
    const r = await buscarLugares({ consulta: 'cena', ciudad: 'Madrid', excluir }, {}, servicios)
    assert.equal(r.tarjetas.length, cuantos)
    ids.push(...r.tarjetas.map((p) => p.placeId))
    assert.equal(new Set(ids).size, ids.length)
    excluir = r.busqueda.excluir
    assert.equal(r.busqueda.agotada, cuantos === 3)
  }
  const fin = await buscarLugares({ consulta: 'cena', ciudad: 'Madrid', excluir }, {}, servicios)
  assert.deepEqual(fin.tarjetas, [])
  assert.equal(fin.busqueda.agotada, true)
})

test('la petición explícita de diez opciones no se limita a ocho', async () => {
  const r = await buscarLugares({ consulta: 'cena', ciudad: 'Madrid', cuantos: 10 }, {}, servicios)
  assert.equal(r.tarjetas.length, 10)
})

test('sin ciudad no hay llamada a Places y los fallos no se presentan como lista vacía', async () => {
  const fallar = { searchPlaces: async () => { throw new Error('red') } }
  assert.match((await buscarLugares({ consulta: 'cena' }, {}, fallar)).error, /ciudad/)
  await assert.rejects(() => buscarLugares({ consulta: 'cena', ciudad: 'Madrid' }, {}, fallar), /red/)
})

test('sitios duplicados de Google no se muestran dos veces', async () => {
  const r = await buscarLugares({ consulta: 'cena', ciudad: 'Madrid', cuantos: 20 }, {}, {
    ...servicios, searchPlaces: async () => [...lugares, lugares[0]],
  })
  assert.equal(r.tarjetas.length, lugares.length)
})

test('una pestaña abierta al día siguiente no envía el contexto antiguo y conserva el borrador', () => {
  const ayer = { rol: 'copiloto', texto: 'Madrid ayer', en: Date.parse('2026-09-13T23:50:00+02:00'), borradores: [{ titulo: 'Ruta' }] }
  const ahora = new Date('2026-09-14T00:20:00+02:00')
  const restaurado = restaurarConversacion([ayer], ahora)
  assert.equal(restaurado[0].borradores[0].titulo, 'Ruta')
  assert.equal(restaurado[0].soloBorrador, true)
  const nuevo = { rol: 'yo', texto: 'Barcelona hoy', en: ahora.getTime() }
  assert.deepEqual(contextoVivo([...restaurado, nuevo], ahora), [{ rol: 'yo', texto: 'Barcelona hoy' }])
})

test('la persistencia conserva cambios de borrador sin URLs de fotos ni datos indefinidos', () => {
  const mensajes = [{ rol: 'copiloto', texto: 'Propuesta', en: Date.now(), borradoresPlan: [{ titulo: 'Cena', hora: '21:00', lugar: undefined }], tarjetas: [{ placeId: 'x', photoUri: 'temporal', photoUris: ['temporal'] }] }]
  const guardado = estadoSerializable(mensajes)
  assert.equal(guardado[0].borradoresPlan[0].hora, '21:00')
  assert.deepEqual(guardado[0].tarjetas, [{ placeId: 'x' }])
  assert.equal(restaurarConversacion(guardado)[0].borradoresPlan[0].titulo, 'Cena')
})

test('una pestaña antigua no sobrescribe el estado guardado por otra', async () => {
  let escrito = false
  const fb = { fs: { runTransaction: async (_, fn) => fn({ get: async () => ({ data: () => ({ revision: 2 }) }), set: () => { escrito = true } }) } }
  await assert.rejects(() => escribirEstado(fb, 'estado', [], 1), /conversacion-cambiada/)
  assert.equal(escrito, false)
})
