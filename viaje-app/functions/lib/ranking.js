/**
 * Que sitio va primero, y si a esa hora esta abierto.
 *
 * Hasta el 30 de agosto de 2026 la lista salia en el orden de relevancia de
 * Google, que premia el parecido del nombre y la cercania. La nota llegaba a
 * la tarjeta y al modelo, pero no ordenaba nada: pedir «los mejores bares de
 * tapas» y pedir «bares de tapas» daba lo mismo.
 *
 * ORDENAR POR NOTA A SECAS ES PEOR QUE NO ORDENAR. Un 4,9 con 7 resenas gana
 * a un 4,5 con 3.000, y el 4,9 casi siempre es el cunado del dueno. Filtrar
 * por «solo >= 4,5» tampoco vale: deja barrios enteros sin resultados y
 * esconde el bar de toda la vida que tiene un 4,2 con 900 opiniones.
 *
 * Asi que se pondera, que es lo que hace cualquier ranking serio: la nota de
 * un sitio se mezcla con la media de los demas resultados de esa misma
 * busqueda, y cuantas menos resenas tiene, mas tira hacia la media. Con
 * muchas resenas su nota manda; con cuatro, casi no cuenta.
 *
 *   posterior = (v / (v + m)) * nota  +  (m / (v + m)) * media
 *
 * La media NO es un numero inventado: es la de las notas que Google acaba de
 * devolver para esa consulta. Un 4,3 significa una cosa entre restaurantes de
 * Barcelona y otra entre museos de Paris, y ese prior se ajusta solo.
 *
 * Y ENCOGER HACIA LA MEDIA NO BASTA, cosa que descubrio una prueba y no una
 * lectura. Con un 4,9 de 7 resenas y un 4,5 de 3.000, la media del lote sale
 * 4,5: el 4,9 encoge hasta 4,53 y sigue ganando por dos centesimas. Encoger
 * acerca a la media, pero nunca cruza por debajo de ella.
 *
 * Asi que se ordena por el EXTREMO INFERIOR del intervalo, que es lo que hace
 * cualquiera que ordene por valoraciones en serio: no «cuanto vale, mas o
 * menos», sino «cuanto vale como poco».
 *
 *   nota = posterior - z * raiz( varianza / (v + m) )
 *
 * Con pocas resenas el castigo es grande y el sitio cae; con miles es
 * despreciable. `varianza = 1` es una aproximacion razonable a lo que se
 * dispersan las notas de 1 a 5 en Google, y `z = 1` es un error estandar:
 * los dos son supuestos declarados, no medidas.
 */

/**
 * Cuantas resenas hacen falta para que la nota propia pese la mitad.
 *
 * Con m = 100: 100 resenas -> mitad nota propia, mitad media. 1.000 resenas
 * -> 91% nota propia. 5 resenas -> 5%. Es el punto donde una cena decide.
 */
export const RESENAS_PARA_CONFIAR = 100

/** Debajo de esto no se ensena salvo que no haya otra cosa. */
export const NOTA_MINIMA = 3.8

/** La media de las notas del propio lote. Null si nadie tiene nota. */
export function mediaDelLote(lugares = []) {
  const notas = lugares.map((l) => Number(l?.rating)).filter((n) => Number.isFinite(n) && n > 0)
  if (notas.length === 0) return null
  return notas.reduce((a, b) => a + b, 0) / notas.length
}

/** Cuanto de dispersas se suponen las notas de 1 a 5. Supuesto, no medida. */
const VARIANZA = 1

/** Cuantos errores estandar se descuentan por no saber. Supuesto, no medida. */
const Z = 1

/** La nota encogida hacia la media del lote. Es un paso, no el resultado. */
export function mediaPosterior(nota, resenas, media) {
  const R = Number(nota)
  if (!Number.isFinite(R) || R <= 0) return null
  const v = Number.isFinite(Number(resenas)) && Number(resenas) > 0 ? Number(resenas) : 0
  const C = Number.isFinite(Number(media)) ? Number(media) : R
  const m = RESENAS_PARA_CONFIAR
  return { valor: (v / (v + m)) * R + (m / (v + m)) * C, n: v + m }
}

/**
 * La nota que de verdad ordena: lo que el sitio vale COMO POCO.
 *
 * Null si no tiene nota. Un sitio sin valorar no es malo, es desconocido, y
 * eso se dice, no se puntua con un 0.
 */
export function notaPonderada(nota, resenas, media) {
  const post = mediaPosterior(nota, resenas, media)
  if (!post) return null
  return post.valor - Z * Math.sqrt(VARIANZA / post.n)
}

/**
 * Ordena de mejor a peor y deja la nota ponderada en cada sitio.
 *
 * Los que no tienen nota van al final, nunca fuera: en un barrio pequeno
 * pueden ser todos, y una lista vacia no le sirve a nadie.
 */
export function ordenarPorNota(lugares = []) {
  const media = mediaDelLote(lugares)
  return lugares
    .map((l) => ({ ...l, notaPonderada: notaPonderada(l?.rating, l?.userRatingCount, media) }))
    .sort((a, b) => {
      if (a.notaPonderada === null && b.notaPonderada === null) return 0
      if (a.notaPonderada === null) return 1
      if (b.notaPonderada === null) return -1
      return b.notaPonderada - a.notaPonderada
    })
}

/**
 * Quita los flojos, pero solo si queda algo.
 *
 * Un filtro que devuelve la lista vacia es un filtro que ha roto la busqueda.
 * Aqui el minimo es una preferencia, no una condicion.
 */
export function quitarLosFlojos(lugares = [], minimo = NOTA_MINIMA) {
  const buenos = lugares.filter((l) => !Number.isFinite(l?.rating) || l.rating >= minimo)
  return buenos.length > 0 ? buenos : lugares
}

/** Dia de la semana de una fecha AAAA-MM-DD, 0 = domingo, como Places. */
export function diaDeLaSemana(dia) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia ?? '')) return null
  const t = new Date(`${dia}T12:00:00Z`)
  return Number.isNaN(t.getTime()) ? null : t.getUTCDay()
}

const SEMANA = 7 * 24 * 60

function minutoDeSemana(dia, hora, minuto) {
  return dia * 1440 + hora * 60 + minuto
}

/**
 * Si un sitio esta abierto un dia y una hora concretos.
 *
 * Devuelve true, false, o **null cuando no se sabe**, y esa tercera respuesta
 * importa: mucho sitio no publica horario en Google, y tratar «no lo se» como
 * «cerrado» dejaria fuera media ciudad. Quien llame decide que hacer con el
 * null; lo que no puede es confundirlo con un no.
 *
 * `horario` es el `regularOpeningHours` de Places. Los tramos que cruzan la
 * medianoche vienen con el cierre en el dia siguiente, asi que se trabaja en
 * minutos de la semana y se da una vuelta cuando hace falta.
 */
export function abiertoEl(horario, dia, hora = '12:00') {
  const periodos = horario?.periods
  if (!Array.isArray(periodos) || periodos.length === 0) return null

  const d = diaDeLaSemana(dia)
  if (d === null) return null
  const [hh, mm] = /^([01]\d|2[0-3]):[0-5]\d$/.test(hora ?? '')
    ? hora.split(':').map(Number)
    : [12, 0]
  const objetivo = minutoDeSemana(d, hh, mm)

  for (const p of periodos) {
    if (!p?.open || typeof p.open.day !== 'number') continue
    const abre = minutoDeSemana(p.open.day, p.open.hour ?? 0, p.open.minute ?? 0)
    // Sin cierre, Places quiere decir «abierto las 24 horas» ese dia.
    if (!p.close || typeof p.close.day !== 'number') return true
    let cierra = minutoDeSemana(p.close.day, p.close.hour ?? 0, p.close.minute ?? 0)
    if (cierra <= abre) cierra += SEMANA
    if ((objetivo >= abre && objetivo < cierra) ||
        (objetivo + SEMANA >= abre && objetivo + SEMANA < cierra)) return true
  }
  return false
}

/** El horario de ese dia en texto, para ensenarlo. '' si no se sabe. */
export function horarioDelDia(horario, dia) {
  const d = diaDeLaSemana(dia)
  const descripciones = horario?.weekdayDescriptions
  if (d === null || !Array.isArray(descripciones) || descripciones.length < 7) return ''
  // Places empieza la lista en lunes; `diaDeLaSemana` en domingo.
  return descripciones[(d + 6) % 7] ?? ''
}
