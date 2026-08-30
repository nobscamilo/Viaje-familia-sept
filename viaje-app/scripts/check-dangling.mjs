/**
 * Detector de referencias colgando.
 *
 * Al rescatar modulos del monolito anterior nos trajimos funciones que usaban
 * constantes definidas 1.500 lineas mas arriba. Compilan sin quejarse y
 * revientan en ejecucion, o peor: devuelven `undefined` en silencio y la
 * funcion parece funcionar mal en vez de fallar. Ya han aparecido dos asi
 * (`ifemaCoords`, `placesTextSearchLimit`).
 *
 * Esto busca identificadores que se usan pero no se declaran, no se importan
 * y no son parametros ni globales conocidas.
 *
 *   node scripts/check-dangling.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const CARPETAS = ['functions/lib', 'src/services', 'src/domain', 'src/data', 'src/hooks']

const GLOBALES = new Set([
  'console', 'process', 'fetch', 'JSON', 'Math', 'Date', 'Promise', 'Number', 'String',
  'Array', 'Object', 'Boolean', 'Error', 'Map', 'Set', 'RegExp', 'URL', 'URLSearchParams',
  'AbortSignal', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'encodeURIComponent',
  'decodeURIComponent', 'isNaN', 'parseInt', 'parseFloat', 'structuredClone', 'Intl',
  'window', 'document', 'localStorage', 'navigator', 'import', 'globalThis',
  'React', 'useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext',
  'createContext', 'createElement', 'undefined', 'null', 'true', 'false', 'this', 'arguments',
])

/**
 * Quita plantillas contando la profundidad.
 *
 * Una expresion regular no vale: `a ${`b ${c}`} d` anida plantillas dentro de
 * `${}` y cualquier regex corta por el backtick equivocado, dejando trozos que
 * luego parecen identificadores sueltos. Con un recorrido caracter a caracter
 * el problema desaparece.
 */
function quitarPlantillas(codigo) {
  let salida = ''
  let i = 0
  let profundidad = 0

  while (i < codigo.length) {
    const c = codigo[i]

    if (c === '\\' && profundidad > 0) { i += 2; continue }

    if (c === '`') {
      profundidad += 1
      // Al cerrar del todo, dejamos una marca inocua.
      if (profundidad % 2 === 0 && profundidad === 0) salida += '``'
      i += 1
      // Contamos apertura/cierre con una pila simple.
      profundidad = profundidad % 2 === 0 ? 0 : 1
      if (profundidad === 0) salida += '``'
      continue
    }

    // Dentro de una plantilla, `${...}` si es codigo de verdad: se conserva.
    if (profundidad > 0 && c === '$' && codigo[i + 1] === '{') {
      let llaves = 1
      let j = i + 2
      let dentro = ''
      while (j < codigo.length && llaves > 0) {
        if (codigo[j] === '{') llaves += 1
        else if (codigo[j] === '}') llaves -= 1
        if (llaves > 0) dentro += codigo[j]
        j += 1
      }
      salida += ' ' + quitarPlantillas(dentro) + ' '
      i = j
      continue
    }

    if (profundidad === 0) salida += c
    i += 1
  }

  return salida
}

/** Quita comentarios, expresiones regulares y literales de cadena. */
function limpiar(codigo) {
  const sinComentarios = codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')

  return quitarPlantillas(sinComentarios)
    .replace(/\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\]|\\.)*\])+\/[gimsuy]*/g, ' RE ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
}

function analizar(ruta) {
  const codigo = limpiar(readFileSync(ruta, 'utf8'))

  const declarados = new Set()
  const anadir = (re, grupo = 1) => {
    for (const m of codigo.matchAll(re)) if (m[grupo]) declarados.add(m[grupo])
  }

  // Importaciones, incluidas las que ocupan varias lineas.
  for (const m of codigo.matchAll(/import\s*\{([\s\S]*?)\}\s*from/g)) {
    for (const trozo of m[1].split(',')) {
      const nombre = trozo.split(/\s+as\s+/).pop().trim()
      if (/^[A-Za-z_$][\w$]*$/.test(nombre)) declarados.add(nombre)
    }
  }
  anadir(/import\s+([A-Za-z_$][\w$]*)\s+from/g)
  anadir(/import\s+\*\s+as\s+([A-Za-z_$][\w$]*)/g)

  anadir(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)
  anadir(/function\s+([A-Za-z_$][\w$]*)/g)
  anadir(/class\s+([A-Za-z_$][\w$]*)/g)
  // desestructuracion: const { a, b } = ... y parametros ({ a, b })
  //
  // La coma del final no sobra: sin ella solo se reconocia un parametro
  // desestructurado si era el ULTIMO. `f({ a, b })` se veia y `f({ a, b }, c)`
  // no, asi que anadir un segundo parametro a una funcion hacia saltar la
  // prueba con tres falsos positivos. Paso el 30 de agosto de 2026 al darle
  // contexto a `comoLlegar`.
  for (const m of codigo.matchAll(/\{([^{}]*)\}\s*(?:=|\)|=>|,)/g)) {
    for (const trozo of m[1].split(',')) {
      const nombre = trozo.split(':').pop().split('=')[0].trim()
      if (/^[A-Za-z_$][\w$]*$/.test(nombre)) declarados.add(nombre)
    }
  }
  // parametros sueltos y de flecha
  for (const m of codigo.matchAll(/\(((?:[^()]|\([^()]*\))*)\)\s*(?:=>|\{)/g)) {
    for (const trozo of m[1].split(',')) {
      const nombre = trozo.split('=')[0].replace(/\.\.\./, '').trim()
      if (/^[A-Za-z_$][\w$]*$/.test(nombre)) declarados.add(nombre)
    }
  }
  // Desestructuracion de arrays: const [a, { b }] = ..., for (const [k, v] of ...)
  for (const m of codigo.matchAll(/\[([^\][]*)\]\s*(?:=[^=]|\)|of\s)/g)) {
    for (const trozo of m[1].split(',')) {
      const nombre = trozo.replace(/[{}]/g, '').split(':').pop().split('=')[0].replace(/\.\.\./, '').trim()
      if (/^[A-Za-z_$][\w$]*$/.test(nombre)) declarados.add(nombre)
    }
  }

  anadir(/([A-Za-z_$][\w$]*)\s*=>/g)
  anadir(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)
  anadir(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)

  // Solo lecturas: no propiedades (.x), no claves de objeto (x:), y sin las
  // lineas de import (ahi los nombres se declaran, no se usan).
  const cuerpo = codigo.replace(/import[\s\S]*?from\s*['"`][^'"`]*['"`]/g, ' ')
  const usados = new Set()
  for (const m of cuerpo.matchAll(/(^|[^.\w$])([a-zA-Z_$][\w$]*)\s*(?![\w$]*\s*:)/g)) {
    usados.add(m[2])
  }

  const PALABRAS = new Set(['const','let','var','function','return','if','else','for','while','of','in',
    'new','typeof','instanceof','await','async','try','catch','finally','throw','class','extends','import',
    'from','export','default','delete','void','do','switch','case','break','continue','yield','static','get','set'])

  return [...usados].filter((u) =>
    !declarados.has(u) && !GLOBALES.has(u) && !PALABRAS.has(u) &&
    !/^[A-Z]/.test(u) && u.length > 3)
}

let problemas = 0
for (const carpeta of CARPETAS) {
  let archivos = []
  try {
    archivos = readdirSync(join(RAIZ, carpeta))
      .map((f) => join(RAIZ, carpeta, f))
      .filter((f) => statSync(f).isFile() && ['.js', '.mjs'].includes(extname(f)))
  } catch { continue }

  for (const ruta of archivos) {
    const sueltos = analizar(ruta)
    if (sueltos.length) {
      problemas += sueltos.length
      console.error(`\n  ${ruta.replace(RAIZ, '')}`)
      for (const s of sueltos) console.error(`      ${s}`)
    }
  }
}

if (problemas) {
  console.error(`\n${problemas} referencia(s) sin declarar. Puede ser un resto del rescate.\n`)
  process.exit(1)
}
console.log('OK: ninguna referencia colgando.')
