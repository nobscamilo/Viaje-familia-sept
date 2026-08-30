/**
 * El poco markdown que de verdad escribe el copiloto, convertido en estructura.
 *
 * Puro y aparte del componente para poder probarlo con el texto exacto que
 * salio mal en pantalla, en vez de mirar una captura y suponer.
 *
 * No es un analizador de markdown: es el subconjunto que un modelo produce sin
 * que se lo pidan —parrafos, viñetas y negritas— y nada mas. Meter una
 * libreria de 40 kB comprimidos para eso, en una app que ya avisa de que su
 * paquete es grande, seria pagar mucho por poco.
 */

/** Texto -> [{ tipo: 'p', trozos }, { tipo: 'lista', puntos: [trozos] }] */
export function analizar(texto) {
  const bloques = []
  let parrafo = []
  let lista = null

  const cerrarParrafo = () => {
    if (parrafo.length) bloques.push({ tipo: 'p', trozos: negritas(parrafo.join(' ')) })
    parrafo = []
  }
  const cerrarLista = () => {
    if (lista?.length) bloques.push({ tipo: 'lista', puntos: lista.map(negritas) })
    lista = null
  }

  for (const cruda of String(texto ?? '').split('\n')) {
    const linea = cruda.trimEnd()
    // `*`, `-` o `1.` al principio: el modelo alterna entre los tres.
    const vineta = linea.match(/^\s*(?:[*-]|\d+\.)\s+(.*)$/)
    if (vineta) {
      cerrarParrafo()
      lista ??= []
      lista.push(vineta[1])
    } else if (!linea.trim()) {
      cerrarParrafo()
      cerrarLista()
    } else {
      cerrarLista()
      parrafo.push(linea.trim())
    }
  }
  cerrarParrafo()
  cerrarLista()
  return bloques
}

/** `**esto**` -> [{ fuerte: true, texto: 'esto' }] */
export function negritas(linea) {
  return linea
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((t) => (t.startsWith('**') && t.endsWith('**')
      ? { fuerte: true, texto: t.slice(2, -2) }
      : { fuerte: false, texto: t }))
}
