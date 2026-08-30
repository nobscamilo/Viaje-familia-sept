/**
 * Prueba de humo del copiloto, contra los servicios de verdad.
 *
 * No pasa por Cloud Functions ni por Firestore: ejecuta el bucle de Gemini con
 * sus herramientas para comprobar lo unico que no se puede verificar leyendo
 * codigo — si el modelo llama a las herramientas en vez de inventarse los
 * restaurantes, y si Places y Routes contestan.
 *
 *   sh scripts/probar-copiloto.sh
 */
import { conversar } from './lib/copiloto.js'

const contexto = {
  grupo: '9 viajeros: 7 adultos (Camilo 37, Juliana Bueno 32, Julian 65, Cielo 63, ' +
    'Juliana 44, Fernando 42, Julian David 18), y 2 ninos: Juan Felipe de 9 anos y ' +
    'Juan Guillermo de 4 anos.',
  agenda: '- 2026-09-10 09:15 · Iberia IB0430 · Bilbao -> Madrid (confirmado)\n' +
    '- 2026-09-10 15:00 · Triplex Lujo 5 Dorm · Sol (confirmado)\n' +
    '- 2026-09-11 09:55 · MADRING · Viernes de libres (confirmado) [3 personas]\n' +
    '- 2026-09-19 · ibis Styles Santander (confirmado)\n' +
    '- 2026-09-23 · Avianca AV027 · vuelta a Bogota (confirmado) [7 personas]',
  decisiones: '- [alta] Que hacer el 10 de septiembre entre que aterrizan y las 15:00',
}

const herramientas = {
  async proponer({ titulo }) {
    console.log('   [herramienta] proponer ->', titulo)
    return { ok: true, propuesta: { id: 'prueba', title: titulo } }
  },
  async agregarAlPlan({ titulo, fecha, hora, tipo, lugar }) {
    // Misma validacion de ventana que en produccion: si el modelo agenda algo
    // fuera del viaje, la prueba tiene que verlo.
    if (fecha < '2026-09-10' || fecha > '2026-09-23') {
      console.log('   [herramienta] agregarAlPlan RECHAZADO (fuera del viaje) ->', fecha)
      return { error: `${fecha} cae fuera del viaje.` }
    }
    console.log(`   [herramienta] agregarAlPlan -> ${fecha}${hora ? ' ' + hora : ''} · ${titulo}` +
      `${tipo ? ` (${tipo})` : ''}${lugar ? ` · ${lugar}` : ''}`)
    return { ok: true, aviso: 'Queda como PROPUESTO.', plan: { id: 'prueba', title: titulo, fecha, hora } }
  },
}

const pregunta = process.argv[2]
  || 'Dónde podemos almorzar cerca de Sol el jueves, con los dos niños. Dos opciones.'

console.log('\nPregunta:', pregunta, '\n')

const r = await conversar({
  apiKey: process.env.GEMINI_API_KEY,
  mensajes: [{ rol: 'yo', texto: pregunta }],
  contexto,
  herramientas,
})

console.log('--- respuesta ---')
console.log(r.texto)
console.log('\n--- datos reales devueltos ---')
console.log('lugares:', r.tarjetas.length)
for (const l of r.tarjetas.slice(0, 4)) {
  console.log(`   · ${l.name} — ${l.rating ?? 's/n'}★ (${l.userRatingCount ?? 0}) — ${l.formattedAddress}`)
}
console.log('rutas:', r.rutas.length)
for (const ru of r.rutas) console.log(`   · ${ru.desde} -> ${ru.hasta}: ${ru.duration} / ${ru.distance}`)
console.log('propuestas:', r.propuestas.length)
console.log('planes agregados:', (r.planes ?? []).length)
for (const pl of r.planes ?? []) console.log(`   · ${pl.fecha} ${pl.hora ?? ''} — ${pl.title}`)

if (r.tarjetas.length === 0 && /restaurante|comer|almorzar|cenar/i.test(pregunta)) {
  console.log('\nAVISO: preguntaste por sitios y no llamó a buscarLugares.')
  console.log('Si el texto menciona restaurantes concretos, se los está inventando.')
  process.exitCode = 1
}
