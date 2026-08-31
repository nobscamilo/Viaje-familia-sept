/**
 * Guardia de secretos.
 *
 * Este repositorio tiene remoto publico y publica GitHub Pages. Una clave de
 * cuenta de servicio da acceso de ADMINISTRADOR y se salta todas las reglas
 * de Firestore: si una acaba dentro del repo y se sube, cualquiera puede leer
 * y borrar el viaje entero.
 *
 * Esta prueba falla ANTES de que eso pase. No es paranoia: es el error mas
 * comun y el mas caro de deshacer, porque queda en el historial de git.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath, no .pathname: la ruta del proyecto tiene un espacio
// ("Viaje sept") y .pathname lo devuelve como %20.
const RAIZ = fileURLToPath(new URL('..', import.meta.url))
// `.medir` es una copia temporal del build para medir desbordes: lleva dentro
// la configuracion de Firebase compilada y hacia saltar esta prueba tres veces
// al dia. Es salida de compilacion, no codigo, y esta en .gitignore.
const SALTAR = new Set(['node_modules', 'dist', '.git', '.firebase', '.medir'])

function recorrer(dir, encontrados = []) {
  for (const nombre of readdirSync(dir)) {
    if (SALTAR.has(nombre)) continue
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) { recorrer(ruta, encontrados); continue }
    encontrados.push(ruta)
  }
  return encontrados
}

const archivos = recorrer(RAIZ)

// La aguja se arma en tiempo de ejecucion: si estuviera escrita entera, este
// mismo archivo la contendria y la prueba se detectaria a si misma. Paso.
const CABECERA_CLAVE = ['BEGIN', 'PRIVATE', 'KEY'].join(' ')

test('ninguna clave de cuenta de servicio dentro del repo', () => {
  const sospechosos = archivos.filter((f) => {
    if (extname(f) !== '.json') return false
    if (f.includes('package.json') || f.includes('package-lock.json')) return false
    if (f.includes('firestore.indexes.json') || f.endsWith('firebase.json')) return false
    const texto = readFileSync(f, 'utf8')
    return texto.includes('"type": "service_account"') || texto.includes(CABECERA_CLAVE)
  })
  assert.deepEqual(sospechosos, [],
    'Una clave de administrador esta dentro del repo. Sacala a ~/.config/ y revocala en Google Cloud.')
})

test('ninguna clave privada suelta en el codigo', () => {
  const fuentes = archivos.filter((f) => ['.js', '.jsx', '.mjs', '.md', '.html', '.css'].includes(extname(f)))
  const sospechosos = fuentes.filter((f) => {
    const t = readFileSync(f, 'utf8')
    return t.includes(CABECERA_CLAVE) || /AIza[0-9A-Za-z_-]{30,}/.test(t)
  })
  assert.deepEqual(sospechosos, [], 'Hay una clave escrita en el codigo.')
})

test('.gitignore cubre los patrones de secretos', () => {
  const gi = readFileSync(join(RAIZ, '.gitignore'), 'utf8')
  for (const patron of ['.env.local', 'adminsdk', 'service_account']) {
    assert.ok(gi.includes(patron), `.gitignore deberia cubrir ${patron}`)
  }
})

test('el numero de reserva de Paris no esta en el repositorio', async () => {
  // Booking lo dice literalmente: «Access code at the front door is your
  // booking number without dots». El codigo del portal ES el numero de
  // reserva. Este repo publica GitHub Pages: publicarlo es publicar la llave.
  const { TIMELINE } = await import('../src/data/trip-madrid-2026.js')
  const paris = TIMELINE.find((e) => e.id === 'aloj-paris')
  assert.ok(paris, 'el alojamiento de Paris sigue existiendo')
  assert.equal(paris.confirmation, undefined, 'sin numero de reserva en el codigo')

  const archivos = ['viaje-app/src/data/trip-madrid-2026.js', 'firebase-family-app/docs/datos-viaje.md']
  for (const rel of archivos) {
    const texto = readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')
    assert.ok(!texto.includes('6443669211'), `${rel} no puede llevar ese numero`)
  }
})

test('la siembra no puede tocar quien ha entrado al viaje', () => {
  // El 27 de agosto de 2026, `seed.mjs` escribia `roles: {}` y
  // `uidToTraveler: {}` "para dejar el hueco". Resultado: cada
  // `npm run publicar` desvinculaba a toda la familia, y Camilo aparecia
  // como desconocido en su propio viaje. Nadie lo noto durante horas porque
  // el que despliega ya esta dentro y no vuelve a pasar por la puerta.
  const fuente = readFileSync(new URL('../scripts/seed.mjs', import.meta.url), 'utf8')
  const doc = fuente.slice(fuente.indexOf('const tripDoc'), fuente.indexOf('console.log(`\\nViaje'))
  assert.ok(!/\broles\s*:/.test(doc), 'seed.mjs no puede escribir `roles`')
  assert.ok(!/\buidToTraveler\s*:/.test(doc), 'seed.mjs no puede escribir `uidToTraveler`')
})

test('los codigos personales no se guardan donde los pueda leer un miembro', async () => {
  // Vivian en `travelers/{id}`, que las reglas dejan leer a cualquier miembro
  // del viaje. Cualquiera podia leer el codigo de su padre y, como «el codigo
  // manda», entrar como el: el arreglo de la suplantacion abrio otro agujero.
  const reglas = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
  assert.match(reglas, /codigoDe[\s\S]{0,200}\/codes\/\$\(travelerId\)/, 'el codigo se lee de /codes')
  assert.ok(!/travelers\/\$\(travelerId\)\)\.data\.joinCode/.test(reglas), 'nunca de /travelers')
  assert.match(reglas, /match \/codes\/\{travelerId\}[\s\S]{0,120}allow read, write: if false/,
    '/codes no se lee ni se escribe desde el cliente')
})

/**
 * Toda dependencia externa que usen los scripts y las pruebas tiene que estar
 * declarada en `package.json`.
 *
 * Del 31 de agosto: `npm run seed:write` reventó con «Cannot find package
 * 'firebase-admin'». Seis scripts lo importaban y no estaba declarado en
 * ninguna parte — funcionaba solo mientras alguien lo tuviera instalado a
 * mano. Un `npm ci` en limpio, o un ordenador nuevo, y la siembra del viaje
 * deja de funcionar el día que hace falta.
 */
test('los scripts no usan paquetes sin declarar', async () => {
  const { readFileSync, readdirSync } = await import('node:fs')
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const declarados = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ])

  // Playwright es la única excepción, y está documentada en `medir.mjs`:
  // instalarlo se trae ~150 MB de navegadores en cada `npm install`. A cambio,
  // ese script tiene que avisar de cómo instalarlo en vez de reventar.
  const OPCIONALES = new Set(['playwright'])
  const medir = readFileSync(new URL('../scripts/medir.mjs', import.meta.url), 'utf8')
  assert.match(medir, /npx playwright install/, 'la dependencia opcional tiene que decir cómo instalarse')

  const faltan = new Set()
  for (const [carpeta, filtro] of [['../scripts/', (f) => f.endsWith('.mjs')], ['../test/', (f) => f.endsWith('.js')]]) {
    const dir = new URL(carpeta, import.meta.url)
    for (const archivo of readdirSync(dir).filter(filtro)) {
      const src = readFileSync(new URL(archivo, dir), 'utf8')
      for (const m of src.matchAll(/(?:from|import\()\s*'([^']+)'/g)) {
        const spec = m[1]
        if (spec.startsWith('.') || spec.startsWith('node:')) continue
        // `check-dangling.mjs` lleva `import(` dentro de una expresión regular
        // que analiza código: si no se filtra, se cuela como paquete «,».
        if (!/^(@[\w.-]+\/)?[\w.-]+(\/[\w.-]+)*$/.test(spec)) continue
        // `@ambito/paquete` cuenta como un paquete; `paquete/sub`, también.
        const nombre = spec.startsWith('@')
          ? spec.split('/').slice(0, 2).join('/')
          : spec.split('/')[0]
        if (!declarados.has(nombre) && !OPCIONALES.has(nombre)) faltan.add(`${archivo} → ${nombre}`)
      }
    }
  }
  assert.deepEqual([...faltan], [], 'paquetes usados y no declarados en package.json')
})
