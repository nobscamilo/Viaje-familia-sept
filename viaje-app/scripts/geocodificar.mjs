/**
 * Convierte los sitios del viaje en coordenadas, UNA SOLA VEZ.
 *
 * El resultado se guarda en `src/data/coordenadas.js` y se sube al repo. La
 * app nunca llama a Geocoding en caliente: seria pagar cada vez por un dato
 * que no cambia. Diecisiete eventos, una llamada por sitio, y listo.
 *
 *   GOOGLE_MAPS_API_KEY=... node scripts/geocodificar.mjs
 *
 * Las consultas van escritas a mano a proposito. «Circuito de IFEMA Madrid»
 * a secas geocodifica regular; el nombre completo del recinto, bien.
 */
import { writeFileSync } from 'node:fs'

const CLAVE = process.env.GOOGLE_MAPS_API_KEY
if (!CLAVE) { console.error('Falta GOOGLE_MAPS_API_KEY'); process.exit(1) }

// id del evento -> [consulta para Google, etiqueta que ve la familia]
const SITIOS = {
  'vuelo-bio-mad':          ['Aeropuerto de Bilbao, Loiu, España', 'Aeropuerto de Bilbao'],
  'vuelo-av182':            ['Aeropuerto Adolfo Suárez Madrid-Barajas Terminal 4', 'Barajas T4'],
  'aloj-madrid':            ['Carrera de San Jerónimo 14, 28012 Madrid, España', 'Tríplex en Sol'],
  'bernabeu':               ['Estadio Santiago Bernabéu, Madrid, España', 'Bernabéu'],
  'madring-vie':            ['IFEMA Madrid, Av. del Partenón 5, 28042 Madrid', 'Circuito de IFEMA'],
  'madring-sab':            ['IFEMA Madrid, Av. del Partenón 5, 28042 Madrid', 'Circuito de IFEMA'],
  'madring-dom':            ['IFEMA Madrid, Av. del Partenón 5, 28042 Madrid', 'Circuito de IFEMA'],
  'traslado-mad-bcn':       ['Madrid Puerta de Atocha-Almudena Grandes, Plaza del Emperador Carlos V, 28045 Madrid', 'Atocha'],
  'aloj-barcelona':         ['Carrer de Sepúlveda 125, 08015 Barcelona, España', 'Sweett, Eixample'],
  'vuelo-bcn-ory':          ['Aeropuerto Josep Tarradellas Barcelona-El Prat', 'El Prat'],
  'aloj-paris':             ['252 Rue du Maréchal Leclerc, 94410 Saint-Maurice, Francia', 'ibis Saint-Maurice'],
  'vuelo-ory-bio':          ['Aéroport de Paris-Orly, Francia', 'Orly'],
  'aloj-santander':         ['ibis Styles Santander, Avenida de Parayas 2A, 39011 Santander, España', 'ibis Styles Santander'],
  'aloj-guardo':            ['Guardo, Palencia, España', 'Guardo'],
  'traslado-guardo-madrid': ['Guardo, Palencia, España', 'Salida desde Guardo'],
  'aloj-madrid-22':         ['Madrid, España', 'Madrid (sin reservar)'],
  'vuelo-av027':            ['Aeropuerto Adolfo Suárez Madrid-Barajas Terminal 4', 'Barajas T4'],
}

const cache = new Map()
const salida = {}

for (const [id, [consulta, etiqueta]] of Object.entries(SITIOS)) {
  if (!cache.has(consulta)) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(consulta)}&language=es&key=${CLAVE}`
    const r = await (await fetch(url)).json()
    if (r.status !== 'OK') { console.error(`  FALLA ${id}: ${r.status} ${r.error_message ?? ''}`); continue }
    const p = r.results[0]
    cache.set(consulta, { lat: p.geometry.location.lat, lng: p.geometry.location.lng, formateada: p.formatted_address })
    await new Promise((r2) => setTimeout(r2, 120))
  }
  const c = cache.get(consulta)
  salida[id] = { lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6), etiqueta }
  console.log(`  ${id.padEnd(24)} ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}  ${c.formateada}`)
}

const cuerpo = Object.entries(salida)
  .map(([id, c]) => `  '${id}': { lat: ${c.lat}, lng: ${c.lng}, etiqueta: '${c.etiqueta.replace(/'/g, "\\'")}' },`)
  .join('\n')

writeFileSync('src/data/coordenadas.js', `/**
 * Coordenadas de cada momento del viaje.
 *
 * Generado por \`scripts/geocodificar.mjs\` el ${new Date().toISOString().slice(0, 10)}.
 * No se edita a mano: se vuelve a lanzar el script. Se guarda en el repo a
 * proposito, para que la app no pague geocoding en caliente por un dato que
 * no cambia.
 *
 * Un evento sin entrada aqui simplemente no sale en el mapa. No es un error.
 */
export const COORDENADAS = {
${cuerpo}
}
`)
console.log(`\n  ${Object.keys(salida).length} sitios escritos en src/data/coordenadas.js\n`)
