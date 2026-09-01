import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { TRAVELERS } from '../src/data/travelers.js'
import { TIMELINE } from '../src/data/trip-madrid-2026.js'
import { OPEN_DECISIONS } from '../src/data/decisiones-sept-2026.js'
import { accionesDe, decisionesDe, enlaceDeMapa, esReserva } from '../src/domain/acciones.js'
import { esDeOpciones, recuentoOpciones, sePuedeCerrarOpciones } from '../src/domain/decisions.js'

const ev = (id) => TIMELINE.find((e) => e.id === id)
const ids = (as) => as.map((a) => a.id)

/**
 * El plan del Camp Nou tal y como esta HOY en Firestore: lo dejo el copiloto
 * el 15, propuesto, con autor. Es el caso que abrio todo esto.
 */
const campNou = {
  id: 'sed0sub6TLffmVm3lTSN',
  title: 'Visita Camp Nou',
  kind: 'activity',
  status: 'propuesto',
  start: '2026-09-15',
  address: 'Les Corts, 08028 Barcelona',
  groupId: 'todos',
  createdBy: 'uid-camilo',
  createdByCopiloto: true,
}

// --------------------------------- lo que se puede tocar, y con que friccion
//
// Hasta el 1 de septiembre de 2026 aqui habia candados: lo confirmado y lo
// sembrado no se tocaba. La consecuencia real fue que confirmar un plan lo
// congelaba para siempre y no habia forma de corregirle una hora. Camilo pidio
// quitarlos. Lo que queda en su lugar es una PREGUNTA, no un permiso.

test('un vuelo pagado no se vota, pero se puede quitar', () => {
  const a = accionesDe(ev('vuelo-bcn-ory'), { decisiones: [], esOwner: true, uid: 'quien-sea' })
  assert.ok(!ids(a).includes('votar'), 'votar algo ya pagado no cambia nada')
  assert.ok(ids(a).includes('quitar'), 'y si de verdad se cancela, se tiene que poder quitar')
  assert.ok(ids(a).includes('editar'))
})

test('quitar una reserva pide un segundo toque; quitar una propuesta no', () => {
  // Esta es la linea que separa esto de una trampa. El dedo gordo sobre el
  // Vueling de 431,91 € no puede costar una reserva; sobre una cena que
  // propuso el copiloto hace un minuto, una pregunta sobra.
  const vuelo = accionesDe(ev('vuelo-bcn-ory'), { esOwner: true, uid: 'u' })
  assert.equal(vuelo.find((a) => a.id === 'quitar').peligroso, true)
  assert.ok(vuelo.find((a) => a.id === 'quitar').aviso, 'y se dice por que')

  const cena = accionesDe(campNou, { esOwner: true, uid: 'uid-camilo' })
  assert.equal(cena.find((a) => a.id === 'quitar').peligroso, false)
})

test('una reserva es lo que NO puso nadie desde la app', () => {
  assert.equal(esReserva(ev('vuelo-bcn-ory')), true)
  assert.equal(esReserva(campNou), false)
  // Los documentos anteriores a la marca `origen` solo se distinguen por no
  // tener autor: si esto se rompe, media agenda deja de pedir confirmacion.
  assert.equal(esReserva({ id: 'viejo', title: 'algo de agosto' }), true)
  assert.equal(esReserva({ id: 'x', createdBy: 'u', origen: 'seed' }), true)
})

test('un viewer no toca nada, ni lo que propuso el copiloto', () => {
  const a = accionesDe(campNou, { esOwner: false, esAdulto: false, uid: 'uid-camilo' })
  assert.ok(!ids(a).includes('editar'))
  assert.ok(!ids(a).includes('quitar'))
  // Votar tampoco: quien puede votar lo decide `puedeVotar(yo)` en la
  // interfaz, pero la marca de que hay votacion sigue estando.
  assert.deepEqual(ids(a), ['votar'])
})

test('un plan confirmado se puede devolver a propuesto sin perder los votos', () => {
  const confirmado = { ...campNou, status: 'confirmado' }
  const a = accionesDe(confirmado, { esOwner: true, uid: 'uid-camilo' })
  assert.ok(ids(a).includes('desconfirmar'), 'si no, corregir algo confirmado es borrarlo y recrearlo')
  assert.ok(!ids(a).includes('votar'), 'lo confirmado no esta en votacion')
  assert.ok(ids(a).includes('editar'))
  assert.equal(a.find((x) => x.id === 'desconfirmar').a, 'propuesto')
})

test('mover el estado es del owner; editar y quitar, de cualquier adulto', () => {
  // No es un candado de vuelta: es que «esto va a pasar» lo dice quien
  // organiza, y corregir una hora lo hace quien la ve mal.
  const adulto = accionesDe(campNou, { esOwner: false, esAdulto: true, uid: 'uid-otro' })
  assert.ok(!ids(adulto).includes('confirmar'))
  assert.ok(ids(adulto).includes('editar'))
  assert.ok(ids(adulto).includes('quitar'))
})

// ------------------------------------------------------ el caso del usuario

test('el plan del Camp Nou se puede votar, confirmar, editar y quitar', () => {
  const a = accionesDe(campNou, { decisiones: [], esOwner: true, uid: 'uid-camilo', hoy: '2026-09-15' })
  assert.deepEqual(ids(a), ['votar', 'confirmar', 'editar', 'quitar', 'mapa'])
})

test('una parada de ruta ofrece quitar la ruta entera', () => {
  const parada = { ...campNou, rutaId: 'r1', rutaNombre: 'Mañana por el Gótico' }
  const a = accionesDe(parada, { decisiones: [], esOwner: true, uid: 'uid-camilo', hoy: '2026-09-15' })
  assert.ok(ids(a).includes('quitar-ruta'), 'sin esto, deshacer seis paradas son seis toques')
  // Y un plan suelto no lo ofrece: no hay ruta que quitar.
  assert.ok(!ids(accionesDe(campNou, { esOwner: true, uid: 'uid-camilo' })).includes('quitar-ruta'))
})

test('el orden de la tarjeta: primero votar, luego cerrar, el mapa al final', () => {
  // El orden no es decorativo: es lo que se lee de arriba abajo con el
  // telefono en la mano. Lo que decide va antes que lo que ejecuta.
  const a = accionesDe(campNou, { decisiones: [], esOwner: false, uid: 'uid-otro', hoy: '2026-09-15' })
  assert.deepEqual(ids(a), ['votar', 'editar', 'quitar', 'mapa'])
})

test('«Cómo llegar» solo sale en lo de HOY, no en las catorce tarjetas', () => {
  const otroDia = accionesDe(campNou, { decisiones: [], esOwner: true, uid: 'uid-camilo', hoy: '2026-09-11' })
  assert.ok(!ids(otroDia).includes('mapa'), 'el 11 nadie va al Camp Nou')
  const fuera = accionesDe(campNou, { decisiones: [], esOwner: true, uid: 'uid-camilo' })
  assert.ok(!ids(fuera).includes('mapa'), 'antes del viaje tampoco')
})

test('un alojamiento ofrece mapa todos los dias que dura, no solo el de entrada', () => {
  const hotel = ev('aloj-barcelona')       // 14 a 16 de septiembre
  const dentro = accionesDe(hotel, { decisiones: [], hoy: '2026-09-15' })
  assert.ok(ids(dentro).includes('mapa'))
  const despues = accionesDe(hotel, { decisiones: [], hoy: '2026-09-17' })
  assert.ok(!ids(despues).includes('mapa'))
})

// --------------------------------------------- el enlace que ya existia

test('el tour del Bernabeu enseña la decision abierta que lo bloquea', () => {
  const abiertas = decisionesDe('bernabeu', OPEN_DECISIONS)
  assert.equal(abiertas.length, 1)
  assert.equal(abiertas[0].id, 'conflicto-bernabeu')

  const a = accionesDe(ev('bernabeu'), { decisiones: OPEN_DECISIONS, esOwner: true })
  assert.equal(a[0].tipo, 'decision', 'lo primero de la tarjeta es que hay algo que decidir')
  assert.equal(a[0].decisionId, 'conflicto-bernabeu')
})

test('una decision ya cerrada no aparece en la agenda', () => {
  const cerrada = [{ id: 'z', title: 'ya esta', status: 'decidido', blocks: ['bernabeu'] }]
  assert.deepEqual(decisionesDe('bernabeu', cerrada), [])
})

test('todas las decisiones abiertas apuntan a momentos que existen', () => {
  // Si alguien renombra un evento y no el `blocks`, el chip desaparece en
  // silencio y nadie se entera. Esto lo grita.
  for (const d of OPEN_DECISIONS) {
    for (const id of d.blocks ?? []) {
      assert.ok(ev(id), `la decision ${d.id} bloquea "${id}", que no esta en la agenda`)
    }
  }
})

// ------------------------------------------------------------- el mapa

test('el mapa de un vuelo lleva al aeropuerto de SALIDA, no a la ciudad de destino', () => {
  const url = enlaceDeMapa(ev('vuelo-av027'))
  assert.ok(url.includes('Aeropuerto'))
  assert.ok(!/destination=Bogot/.test(url))
})

test('un vuelo del que solo sabemos la llegada no ofrece mapa', () => {
  assert.equal(enlaceDeMapa({ id: 'v', kind: 'flight', to: { name: 'Madrid' } }), null)
})

// -------------------------------------------------- decisiones de opciones

const comida = {
  id: 'comida-domingo',
  options: [
    { id: 'op1', title: 'Rosi La Loca' },
    { id: 'op2', title: 'Casa Mono' },
    { id: 'op3', title: 'Bar Tomate' },
  ],
}

test('una decision con una sola opcion no es una eleccion', () => {
  assert.equal(esDeOpciones({ options: [{ id: 'op1', title: 'x' }] }), false)
  assert.equal(esDeOpciones(comida), true)
})

test('los ninos no cuentan tampoco al escoger sitio', () => {
  const r = recuentoOpciones(comida, TRAVELERS, {})
  assert.equal(r.total, 7)
  assert.equal(r.emitidos, 0)
  assert.equal(r.ganadora, null)
})

test('un voto a una opcion que ya no existe se ignora en silencio', () => {
  const r = recuentoOpciones(comida, TRAVELERS, { camilo: 'op9', cielo: 'op1' })
  assert.equal(r.emitidos, 1)
  assert.equal(r.opciones.find((o) => o.id === 'op1').votos, 1)
})

test('el empate NO cierra: es una conversacion, no un resultado', () => {
  const votos = {
    camilo: 'op1', 'juliana-bueno': 'op1', 'julian-padre': 'op1',
    cielo: 'op2', 'juliana-hermana': 'op2', fernando: 'op2',
    'julian-david': 'op3',
  }
  const r = recuentoOpciones(comida, TRAVELERS, votos)
  assert.equal(r.completa, true)
  assert.equal(r.ganadora, null)
  assert.equal(r.empate.length, 2)
  assert.equal(sePuedeCerrarOpciones(comida, TRAVELERS, votos).puede, false)
})

test('con mayoria clara y todos votando, se cierra y se sabe quien voto que', () => {
  const votos = {
    camilo: 'op1', 'juliana-bueno': 'op1', 'julian-padre': 'op1', cielo: 'op1',
    'juliana-hermana': 'op2', fernando: 'op2', 'julian-david': 'op3',
  }
  const cierre = sePuedeCerrarOpciones(comida, TRAVELERS, votos)
  assert.equal(cierre.puede, true)
  assert.equal(cierre.ganadora.title, 'Rosi La Loca')
  assert.deepEqual(
    cierre.ganadora.votantes.map((t) => t.id).sort(),
    ['camilo', 'cielo', 'julian-padre', 'juliana-bueno'],
  )
})

// ------------------------------------------------------------ guardas
//
// Una sustitucion de texto que no encaja falla EN SILENCIO: los tests siguen
// verdes sobre un boton que ya no se pinta. Paso el 27 de agosto con `Lugar`
// y `tripId`. Estas dos lineas cuestan nada y lo habrian cazado.

test('la agenda monta de verdad la barra de acciones', () => {
  const src = readFileSync(new URL('../src/app/surfaces/Ahora.jsx', import.meta.url), 'utf8')
  assert.match(src, /<Acciones evento=\{event\}/)
})

test('el copiloto tiene la herramienta de proponer opciones', () => {
  // Lo que ve el modelo vive en `declaraciones.js` desde el 30 de agosto.
  const src = readFileSync(new URL('../functions/lib/declaraciones.js', import.meta.url), 'utf8')
  assert.match(src, /name: 'proponerOpciones'/)
  const idx = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8')
  assert.match(idx, /async proponerOpciones\(/)
})
