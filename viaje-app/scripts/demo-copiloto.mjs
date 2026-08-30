/**
 * Escribe una conversacion de mentira con datos DE VERDAD.
 *
 * Sirve para trabajar el aspecto del copiloto sin tener que hablar con el en
 * cada iteracion: el estado vacio no dice nada del diseno, lo que hay que ver
 * son las fotos, las rutas y los avisos de «lo puse en la agenda».
 *
 * Los datos salen de Places y Routes, no de mi cabeza: una foto real tiene
 * proporciones y colores que un rectangulo gris no tiene, y el diseno se cae
 * justo ahi.
 *
 *   GOOGLE_MAPS_API_KEY=... node scripts/demo-copiloto.mjs
 */
import { writeFileSync } from 'node:fs'
import {
  computeRoute, ifemaCoords, normalizePlace, searchPlaces, withPlacePhotos,
} from '../functions/lib/maps.js'

const crudos = await searchPlaces('restaurante para ninos cerca de Puerta del Sol Madrid', 2)
const gordos = await Promise.all(crudos.map((p) => withPlacePhotos(normalizePlace(p))))
// Solo lo que pinta la interfaz: `normalizePlace` trae listas de fotos y de
// tipos que no se usan y engordan el archivo cuatro veces.
const lugares = gordos.map((l) => ({
  placeId: l.placeId, name: l.name, formattedAddress: l.formattedAddress,
  rating: l.rating, userRatingCount: l.userRatingCount,
  googleMapsUri: l.googleMapsUri, photoUri: l.photoUri, location: l.location,
}))
// La interfaz espera una ruta por modo, con `desde`, `hasta`, `duracion` y
// `distancia`: es lo que devuelve la herramienta `comoLlegar`, no el resumen
// de texto que devuelve `routeSummary`.
const rutas = []
for (const [modo, etiqueta] of [['TRANSIT', 'metro'], ['DRIVE', 'coche'], ['WALK', 'andando']]) {
  const r = await computeRoute(lugares[0].location, modo, ifemaCoords)
  if (r) rutas.push({ desde: lugares[0].name, hasta: 'Circuito de IFEMA', modo: etiqueta, duracion: r.duration, distancia: r.distance })
}

const conversacion = [
  { rol: 'yo', texto: 'Dónde cenamos cerca de Sol con los niños el jueves' },
  {
    rol: 'copiloto',
    texto: '¡De una! Les dejo dos opciones cerquita del apartamento, las dos con buena fama y sitio para los peques.',
    tarjetas: lugares,
  },
  { rol: 'yo', texto: '¿Y cuánto se tarda de ahí a IFEMA?' },
  {
    rol: 'copiloto',
    texto: 'Depende de cómo vayan. En metro es más previsible a esa hora; en coche el aparcamiento del circuito se llena.',
    rutas,
  },
  { rol: 'yo', texto: 'Agrega Rosi La Loca al jueves a la 1 y déjame una decisión para el tour del Bernabéu' },
  {
    rol: 'copiloto',
    texto: 'Hecho. La comida queda en la agenda y el choque del Bernabéu lo dejo para que lo voten.',
    planes: [{ id: 'demo-1', title: 'Comida en Rosi La Loca', fecha: '2026-09-10', hora: '13:00' }],
    propuestas: [{ id: 'demo-2', title: 'Mover el tour del Bernabéu del viernes' }],
  },
]

writeFileSync('src/data/demo-copiloto.js', `/**
 * Conversacion de ejemplo para trabajar el aspecto del copiloto.
 *
 * Generada por \`scripts/demo-copiloto.mjs\` con datos reales de Places y
 * Routes. Solo se usa en modo local con \`?demo\`: no viaja a produccion mas
 * que como unos kilobytes de texto, y evita tener que hablar con el copiloto
 * en cada iteracion de diseno.
 *
 * Las fotos de Places caducan. Si salen rotas, se vuelve a lanzar el script.
 */
export const DEMO = ${JSON.stringify(conversacion, null, 2)}
`)

console.log(`  ${lugares.length} lugares, ${rutas.length} rutas -> src/data/demo-copiloto.js`)
