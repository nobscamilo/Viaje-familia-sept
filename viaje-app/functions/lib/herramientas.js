/**
 * Las herramientas del copiloto.
 *
 * Cada una es una funcion normal con su declaracion para Gemini al lado. El
 * modelo decide cual llamar; nosotros ejecutamos y le devolvemos el resultado.
 *
 * Regla del proyecto: **ninguna herramienta escribe directamente en el viaje.**
 * `proponer` crea una propuesta, que es exactamente lo mismo que haria una
 * persona. Asi la IA no puede cambiar nada a espaldas de nadie, y todo lo que
 * hace queda con autor y se puede deshacer.
 */
import {
  aLatLng, computeRoute, ifemaCoords, momentoDeSalida, normalizePlace, searchPlaces, withPlacePhotos,
} from './maps.js'
import { cleanText } from './text.js'
import { ordenarPorNota, quitarLosFlojos } from './ranking.js'

// Las declaraciones que ve Gemini viven aparte; se reexportan para que quien
// las usa siga importando de un solo sitio.
export { DECLARACIONES } from './declaraciones.js'

const MODOS = { andando: 'WALK', coche: 'DRIVE', transporte: 'TRANSIT', bici: 'BICYCLE' }

/**
 * Un modo que no se reconoce NO cae a transporte publico.
 *
 * Era `MODOS[modo] || 'TRANSIT'`: si el modelo mandaba «carro», «DRIVE» o
 * nada, la funcion devolvia un tiempo de metro y el modelo lo contaba como si
 * fuera en coche. Una caida silenciosa que da un numero plausible es peor que
 * un error: nadie la ve.
 */
function modoDeViaje(modo) {
  if (!modo) return 'TRANSIT'
  const v = MODOS[String(modo).trim().toLowerCase()]
  return v ?? null
}

/**
 * Ejecuta la herramienta que pidio el modelo.
 * `contexto` trae { proponer } para que la escritura la haga quien corresponde.
 */
export async function ejecutar(nombre, args, contexto) {
  if (nombre === 'buscarLugares') return await buscarLugares(args, contexto)
  if (nombre === 'comoLlegar') return await comoLlegar(args, contexto)
  if (nombre === 'agregarAlPlan') return await contexto.agregarAlPlan(args)
  if (nombre === 'armarRuta') return await contexto.armarRuta(args)
  if (nombre === 'proponer') return await contexto.proponer(args)
  if (nombre === 'proponerOpciones') return await contexto.proponerOpciones(args)
  if (nombre === 'anotarGasto') return await contexto.anotarGasto(args)
  if (nombre === 'listarGastos') return await contexto.listarGastos(args)
  if (nombre === 'quitarGasto') return await contexto.quitarGasto(args)
  if (nombre === 'sugerirGastos') return await contexto.sugerirGastos(args)
  return { error: `No conozco la herramienta ${nombre}.` }
}

/** Las siete lineas de horario de Places, en una sola cadena corta. */
function horarioDeHoy(horario) {
  const d = horario?.weekdayDescriptions
  return Array.isArray(d) && d.length ? d.join(' | ').slice(0, 300) : null
}

async function buscarLugares({ consulta, cuantos, ciudad }, contexto) {
  const texto = cleanText(consulta)
  if (!texto) return { error: 'Sin consulta.' }

  // Sin sesgo de ciudad, «el hotel» devolvia un hotel de Guardo. La ciudad la
  // da el modelo desde la agenda; si no, la del dia que se este mirando.
  const donde = cleanText(ciudad) || contexto?.ciudadPorDefecto || null

  /**
   * Se piden mas de los que se ensenan, y luego se ordenan por nota.
   *
   * Google devuelve por relevancia: el primero es el que mas se parece al
   * texto y cae mas cerca, no el mejor. Pedir 12 y quedarse con los 5 mejor
   * valorados cuesta lo mismo —Places cobra por peticion, no por resultado—
   * y cambia por completo lo que sale para «donde cenamos».
   */
  const cuantosEnsenar = Math.min(Math.max(cuantos || 5, 1), 8)
  const crudos = await searchPlaces(texto, Math.max(cuantosEnsenar * 2, 12), donde)
  const mejores = ordenarPorNota(quitarLosFlojos(crudos.map(normalizePlace))).slice(0, cuantosEnsenar)
  const lugares = await Promise.all(mejores.map((p) => withPlacePhotos(p)))

  return {
    // Al modelo le damos lo justo para redactar. Las fotos y los enlaces van
    // en `tarjetas`, que la interfaz pinta sin pasar por el modelo: no tiene
    // sentido gastar tokens en URLs que el no va a leer.
    buscadoEn: donde ?? 'sin ciudad concreta',
    // Vienen ORDENADOS de mejor a peor por nota ponderada. Se le dice al
    // modelo para que no los reordene por su cuenta ni se disculpe por el
    // orden: el criterio ya esta aplicado.
    orden: 'de mejor a peor por nota ponderada por numero de resenas',
    resumen: lugares.map((l) => ({
      nombre: l.name,
      direccion: l.formattedAddress,
      valoracion: l.rating,
      resenas: l.userRatingCount,
      horario: horarioDeHoy(l.horario),
    })),
    tarjetas: lugares,
  }
}

async function comoLlegar({ desde, hasta, modo, cuando, hora }, contexto) {
  const travelMode = modoDeViaje(modo)
  if (!travelMode) {
    return { error: `No conozco el modo "${modo}". Son: andando, coche, transporte o bici.` }
  }

  // El dia decide DOS cosas: en que ciudad se busca y para que momento se
  // calcula la ruta. Las dos estaban sin decidir y las dos daban respuestas
  // falsas: un Sol en Palencia, y el metro de esta madrugada.
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(cuando ?? '') ? cuando : contexto?.diaPorDefecto ?? null
  const delDia = contexto?.porDia?.[dia] ?? {}
  const ciudad = delDia.ciudad ?? contexto?.ciudadPorDefecto ?? null
  const salida = momentoDeSalida(dia, cleanText(hora) || delDia.hora || '12:00')

  const origenBruto = (await searchPlaces(cleanText(desde), 1, ciudad))[0]
  if (!origenBruto) return { error: `No encuentro "${desde}" en ${ciudad ?? 'el viaje'}.` }
  const origen = normalizePlace(origenBruto)

  let destino = ifemaCoords
  let destinoNombre = 'Circuito de IFEMA'
  if (hasta) {
    const bruto = (await searchPlaces(cleanText(hasta), 1, ciudad))[0]
    if (!bruto) return { error: `No encuentro "${hasta}" en ${ciudad ?? 'el viaje'}.` }
    const d = normalizePlace(bruto)
    destino = aLatLng(d.location)
    destinoNombre = d.name
  }

  const ruta = await computeRoute(origen.location, travelMode, destino, salida)
  if (!ruta) return { error: 'Google no devolvió ruta para ese trayecto.' }

  return {
    // Se devuelve el sitio EXACTO que se uso, no lo que pidio el usuario: si
    // Places resolvio otra cosa, que el modelo lo diga en vez de tragarselo.
    desde: origen.name,
    desdeDireccion: origen.formattedAddress ?? null,
    hasta: destinoNombre,
    modo: ruta.modo,
    calculadoPara: salida ? `${dia} a las ${cleanText(hora) || delDia.hora || '12:00'}` : 'ahora mismo',
    duracion: ruta.duration,
    distancia: ruta.distance,
    tarjetaRuta: { ...ruta, desde: origen.name, hasta: destinoNombre },
  }
}
