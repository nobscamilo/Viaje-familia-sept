/**
 * Prueba las reglas de Firestore de verdad, contra el servicio de Google.
 *
 * No es el emulador: es `firebaserules.projects.test`, que evalua el mismo
 * motor que produccion sobre casos inventados. Importa porque una regla que
 * compila puede seguir dejando entrar a quien no debe, y eso no lo caza
 * ningun `firebase deploy`.
 *
 *   node scripts/probar-reglas.mjs        (necesita gcloud auth)
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const P = 'viaje-familia-sept-2026'
const fuente = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8')
const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim()

const RUTA_VIAJE = '/databases/(default)/documents/trips/sept-2026'
// Los codigos viven en `codes/{id}`: `travelers` lo lee cualquier miembro,
// y un miembro leyendo el codigo de otro podia entrar como el.
const RUTA_VIAJERO = (id) => `/databases/(default)/documents/trips/sept-2026/codes/${id}`

// El viaje ANTES de la escritura: solo Camilo dentro.
const viajeAntes = {
  joinCode: 'MADRIDF1',
  roles: { 'uid-camilo': 'owner' },
  uidToTraveler: { 'uid-camilo': 'camilo' },
}

const CODIGOS = {
  'julian-padre': 'H9JMW75P',
  cielo: '78S4BFCM',
  camilo: 'L67AH32M',
}

// El `get()` de dentro de la regla hay que simularlo: el servicio de pruebas
// no lee Firestore de verdad. Sin estos mocks TODO sale DENY, incluido lo que
// deberia funcionar — que es justo lo que paso la primera vez.
const mocks = Object.entries(CODIGOS).map(([id, joinCode]) => ({
  function: 'get',
  args: [{ exact_value: RUTA_VIAJERO(id) }],
  result: { value: { data: { joinCode } } },
}))

const parche = (uid, travelerId, clave) => ({
  joinCode: 'MADRIDF1',
  roles: { 'uid-camilo': 'owner', [uid]: 'adult' },
  uidToTraveler: { 'uid-camilo': 'camilo', [uid]: travelerId },
  joinCodeAttempt: clave,
})

const caso = (nombre, expectation, uid, travelerId, clave) => ({
  nombre,
  expectation,
  functionMocks: mocks,
  request: {
    auth: { uid, token: { firebase: { sign_in_provider: 'google.com' } } },
    method: 'update',
    path: RUTA_VIAJE,
    time: '2026-08-27T18:00:00Z',
    resource: { data: parche(uid, travelerId, clave) },
  },
  resource: { data: viajeAntes },
})

const CASOS = [
  caso('Julian entra con SU codigo', 'ALLOW', 'uid-julian', 'julian-padre', 'H9JMW75P'),
  caso('Julian intenta entrar con el codigo de Cielo', 'DENY', 'uid-julian', 'julian-padre', '78S4BFCM'),
  caso('un colado usa el codigo de Julian para hacerse pasar por Cielo', 'DENY', 'uid-x', 'cielo', 'H9JMW75P'),
  caso('el viejo codigo comun ya no vale', 'DENY', 'uid-x', 'julian-padre', 'MADRIDF1'),
  caso('nadie roba el nombre de Camilo, que ya tiene dueno', 'DENY', 'uid-x', 'camilo', 'L67AH32M'),
  caso('sin codigo no se entra', 'DENY', 'uid-julian', 'julian-padre', ''),

  // --- La agenda. Aqui viven las reservas pagadas, y hasta hoy cualquier
  // adulto podia reescribirlas desde la consola del navegador.
  ...enLaAgenda(),
]

/**
 * Un miembro del viaje, ya dentro, tocando la linea de tiempo.
 *
 * El viaje que ven estas reglas tiene a Camilo de owner y a Julian de adulto,
 * asi que basta con un mock del documento raiz.
 */
function enLaAgenda() {
  const viaje = {
    joinCode: 'MADRIDF1',
    roles: { 'uid-camilo': 'owner', 'uid-julian': 'adult' },
    uidToTraveler: { 'uid-camilo': 'camilo', 'uid-julian': 'julian-padre' },
  }
  const mockViaje = [{
    function: 'get',
    args: [{ exact_value: RUTA_VIAJE }],
    result: { value: { data: viaje } },
  }]

  const enAgenda = (nombre, expectation, { uid, method, path, antes, ahora }) => ({
    nombre,
    expectation,
    functionMocks: mockViaje,
    request: {
      auth: { uid, token: { firebase: { sign_in_provider: 'custom' } } },
      method,
      path: `${RUTA_VIAJE}/${path}`,
      time: '2026-08-28T18:00:00Z',
      ...(ahora ? { resource: { data: ahora } } : {}),
    },
    ...(antes ? { resource: { data: antes } } : {}),
  })

  // El Vueling: lo escribio la siembra, no tiene `createdBy`.
  const vuelo = { title: 'Vueling VY8002', status: 'confirmado', origen: 'seed', locator: 'MLD57T' }
  // El Camp Nou: lo dejo el copiloto a peticion de Camilo.
  const plan = { title: 'Visita Camp Nou', status: 'propuesto', createdBy: 'uid-camilo' }

  return [
    enAgenda('un adulto NO puede reescribir el localizador del Vueling', 'DENY', {
      uid: 'uid-julian', method: 'update', path: 'timeline/vuelo-bcn-ory',
      antes: vuelo, ahora: { ...vuelo, locator: 'ROBADO' },
    }),
    enAgenda('un adulto si puede confirmar un plan que puso alguien', 'ALLOW', {
      uid: 'uid-julian', method: 'update', path: 'timeline/camp-nou',
      antes: plan, ahora: { ...plan, status: 'confirmado' },
    }),
    enAgenda('un adulto vota un plan a su propio nombre', 'ALLOW', {
      uid: 'uid-julian', method: 'create', path: 'timeline/camp-nou/votes/uid-julian',
      ahora: { travelerId: 'julian-padre', value: 'si' },
    }),
    enAgenda('nadie vota en nombre de otro', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'timeline/camp-nou/votes/uid-camilo',
      ahora: { travelerId: 'camilo', value: 'si' },
    }),
    enAgenda('ni firmando el voto con el nombre de otro', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'timeline/camp-nou/votes/uid-julian',
      ahora: { travelerId: 'camilo', value: 'si' },
    }),
    enAgenda('el id de una opcion vale como voto en una decision', 'ALLOW', {
      uid: 'uid-julian', method: 'create', path: 'decisions/comida/votes/uid-julian',
      ahora: { travelerId: 'julian-padre', value: 'op2' },
    }),
    enAgenda('un voto no puede ser una novela', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'decisions/comida/votes/uid-julian',
      ahora: { travelerId: 'julian-padre', value: 'x'.repeat(200) },
    }),

    // --- Las notas de un momento (1 sept 2026) ---
    //
    // Son comentarios colgando de `timeline` en vez de `decisions`. Sin una
    // regla propia Firestore deniega por defecto: la nota fallaria al
    // guardarse y la persona veria un error que no entiende.
    enAgenda('cualquier miembro deja una nota en un vuelo', 'ALLOW', {
      uid: 'uid-julian', method: 'create', path: 'timeline/vuelo-bcn-ory/comments/n1',
      ahora: { authorUid: 'uid-julian', travelerId: 'julian-padre', text: 'Recordar reservar' },
    }),
    enAgenda('nadie firma una nota con el nombre de otro', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'timeline/camp-nou/comments/n1',
      ahora: { authorUid: 'uid-camilo', travelerId: 'camilo', text: 'Recordar reservar' },
    }),
    enAgenda('una nota vacia no es una nota', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'timeline/camp-nou/comments/n1',
      ahora: { authorUid: 'uid-julian', travelerId: 'julian-padre', text: '' },
    }),
    enAgenda('cada uno borra sus propias notas', 'ALLOW', {
      uid: 'uid-julian', method: 'delete', path: 'timeline/camp-nou/comments/n1',
      antes: { authorUid: 'uid-julian', text: 'Recordar reservar' },
    }),
    enAgenda('no se borra la nota de otro', 'DENY', {
      uid: 'uid-julian', method: 'delete', path: 'timeline/camp-nou/comments/n1',
      antes: { authorUid: 'uid-cielo', text: 'Llevar el contrato' },
    }),
    enAgenda('quien organiza si puede quitar la nota de otro', 'ALLOW', {
      uid: 'uid-camilo', method: 'delete', path: 'timeline/camp-nou/comments/n1',
      antes: { authorUid: 'uid-cielo', text: 'Llevar el contrato' },
    }),
    enAgenda('una nota no se puede reasignar a otro autor', 'DENY', {
      uid: 'uid-julian', method: 'update', path: 'timeline/camp-nou/comments/n1',
      antes: { authorUid: 'uid-julian', text: 'Recordar reservar' },
      ahora: { authorUid: 'uid-camilo', text: 'Recordar reservar' },
    }),

    // --- La instantánea privada del copiloto ---
    enAgenda('cada viajero guarda su conversación y borradores', 'ALLOW', {
      uid: 'uid-julian', method: 'create', path: 'hilos/julian-padre/estado/actual',
      ahora: { mensajes: [], revision: 1, updatedAt: 'ahora' },
    }),
    enAgenda('cada viajero actualiza su conversación', 'ALLOW', {
      uid: 'uid-julian', method: 'update', path: 'hilos/julian-padre/estado/actual',
      antes: { mensajes: [], revision: 1 }, ahora: { mensajes: [{ texto: 'hola' }], revision: 2 },
    }),
    enAgenda('cada viajero recupera sus borradores', 'ALLOW', {
      uid: 'uid-julian', method: 'get', path: 'hilos/julian-padre/estado/actual',
    }),
    enAgenda('ni el owner lee una conversación ajena', 'DENY', {
      uid: 'uid-camilo', method: 'get', path: 'hilos/julian-padre/estado/actual',
    }),
    enAgenda('ni el owner sobrescribe borradores ajenos', 'DENY', {
      uid: 'uid-camilo', method: 'update', path: 'hilos/julian-padre/estado/actual',
      antes: { mensajes: [], revision: 1 }, ahora: { mensajes: [], revision: 2 },
    }),
    enAgenda('un extraño no lee la conversación', 'DENY', {
      uid: 'uid-extraño', method: 'get', path: 'hilos/julian-padre/estado/actual',
    }),
    enAgenda('no se admiten instantáneas sin límite', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'hilos/julian-padre/estado/actual',
      ahora: { mensajes: Array(61).fill({ texto: 'x' }), revision: 1 },
    }),

    // --- Las cuentas ---
    enAgenda('un adulto anota un gasto', 'ALLOW', {
      uid: 'uid-julian', method: 'create', path: 'gastos/g1',
      ahora: { createdBy: 'uid-julian', importeCent: 4250, concepto: 'Comida en Rosi La Loca' },
    }),
    enAgenda('un importe en euros con decimales NO entra', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'gastos/g1',
      ahora: { createdBy: 'uid-julian', importeCent: 42.5, concepto: 'Comida' },
    }),
    enAgenda('un gasto de 20.000 euros es un dedo gordo, no un gasto', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'gastos/g1',
      ahora: { createdBy: 'uid-julian', importeCent: 2000000, concepto: 'Comida' },
    }),
    enAgenda('nadie anota un gasto a nombre de otro', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'gastos/g1',
      ahora: { createdBy: 'uid-camilo', importeCent: 4250, concepto: 'Comida' },
    }),
    enAgenda('no se borra una reserva sembrada', 'DENY', {
      uid: 'uid-camilo', method: 'delete', path: 'gastos/g-aloj-madrid',
      antes: { origen: 'seed', importeCent: 305874, concepto: 'Triplex' },
    }),
    enAgenda('cada uno borra lo que anoto', 'ALLOW', {
      uid: 'uid-julian', method: 'delete', path: 'gastos/g1',
      antes: { createdBy: 'uid-julian', importeCent: 4250, concepto: 'Comida' },
    }),
    enAgenda('no se borra lo que anoto otro', 'DENY', {
      uid: 'uid-julian', method: 'delete', path: 'gastos/g1',
      antes: { createdBy: 'uid-camilo', importeCent: 4250, concepto: 'Comida' },
    }),
    enAgenda('una transferencia de un hogar a si mismo no tiene sentido', 'DENY', {
      uid: 'uid-julian', method: 'create', path: 'liquidaciones/l1',
      ahora: { createdBy: 'uid-julian', de: 'padres', a: 'padres', importeCent: 20000 },
    }),
    enAgenda('saldar una deuda entre subfamilias', 'ALLOW', {
      uid: 'uid-julian', method: 'create', path: 'liquidaciones/l1',
      ahora: { createdBy: 'uid-julian', de: 'hermana', a: 'padres', importeCent: 264442 },
    }),

    // --- Editar un gasto ---
    enAgenda('cada uno corrige lo que anoto', 'ALLOW', {
      uid: 'uid-julian', method: 'update', path: 'gastos/g1',
      antes: { createdBy: 'uid-julian', importeCent: 4250, concepto: 'Comida' },
      ahora: { createdBy: 'uid-julian', importeCent: 4500, concepto: 'Comida en Rosi' },
    }),
    enAgenda('quien organiza corrige lo de otro', 'ALLOW', {
      uid: 'uid-camilo', method: 'update', path: 'gastos/g1',
      antes: { createdBy: 'uid-julian', importeCent: 4250, concepto: 'Comida' },
      ahora: { createdBy: 'uid-julian', importeCent: 4500, concepto: 'Comida' },
    }),
    enAgenda('nadie corrige lo que anoto otro', 'DENY', {
      uid: 'uid-julian', method: 'update', path: 'gastos/g1',
      antes: { createdBy: 'uid-camilo', importeCent: 4250, concepto: 'Comida' },
      ahora: { createdBy: 'uid-camilo', importeCent: 400, concepto: 'Comida' },
    }),
    enAgenda('editar NO puede cambiar quien lo anoto', 'DENY', {
      uid: 'uid-julian', method: 'update', path: 'gastos/g1',
      antes: { createdBy: 'uid-julian', importeCent: 4250, concepto: 'Comida' },
      ahora: { createdBy: 'uid-camilo', importeCent: 4250, concepto: 'Comida' },
    }),
    // La siembra es un espejo: editar aqui se perderia en el siguiente
    // `npm run publicar` sin que nadie se enterara. Ni el owner.
    enAgenda('una reserva sembrada no se edita, ni siendo owner', 'DENY', {
      uid: 'uid-camilo', method: 'update', path: 'gastos/g-aloj-madrid',
      antes: { origen: 'seed', importeCent: 305874, concepto: 'Triplex' },
      ahora: { origen: 'seed', importeCent: 999, concepto: 'Triplex' },
    }),
    // --- Deshacer y corregir una transferencia ---
    enAgenda('corregir el importe de una transferencia propia', 'ALLOW', {
      uid: 'uid-julian', method: 'update', path: 'liquidaciones/l1',
      antes: { createdBy: 'uid-julian', de: 'hermana', a: 'padres', importeCent: 20000 },
      ahora: { createdBy: 'uid-julian', de: 'hermana', a: 'padres', importeCent: 18000 },
    }),
    enAgenda('NO se puede cambiar a quien va dirigida', 'DENY', {
      uid: 'uid-julian', method: 'update', path: 'liquidaciones/l1',
      antes: { createdBy: 'uid-julian', de: 'hermana', a: 'padres', importeCent: 20000 },
      ahora: { createdBy: 'uid-julian', de: 'hermana', a: 'camilo', importeCent: 20000 },
    }),
    enAgenda('deshacer una transferencia propia', 'ALLOW', {
      uid: 'uid-julian', method: 'delete', path: 'liquidaciones/l1',
      antes: { createdBy: 'uid-julian', de: 'hermana', a: 'padres', importeCent: 20000 },
    }),
    enAgenda('nadie deshace la transferencia de otro', 'DENY', {
      uid: 'uid-julian', method: 'delete', path: 'liquidaciones/l1',
      antes: { createdBy: 'uid-camilo', de: 'hermana', a: 'padres', importeCent: 20000 },
    }),
    enAgenda('quien organiza si puede deshacerla', 'ALLOW', {
      uid: 'uid-camilo', method: 'delete', path: 'liquidaciones/l1',
      antes: { createdBy: 'uid-julian', de: 'hermana', a: 'padres', importeCent: 20000 },
    }),

    enAgenda('un importe con decimales tampoco entra al editar', 'DENY', {
      uid: 'uid-julian', method: 'update', path: 'gastos/g1',
      antes: { createdBy: 'uid-julian', importeCent: 4250, concepto: 'Comida' },
      ahora: { createdBy: 'uid-julian', importeCent: 42.5, concepto: 'Comida' },
    }),
  ]
}

const cuerpo = {
  source: { files: [{ name: 'firestore.rules', content: fuente }] },
  testSuite: {
    testCases: CASOS.map(({ nombre, ...c }) => c),
  },
}

const r = await fetch(`https://firebaserules.googleapis.com/v1/projects/${P}:test`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    // Sin esto la API responde 403: las credenciales de usuario de gcloud no
    // llevan proyecto de cuota asociado.
    'x-goog-user-project': P,
  },
  body: JSON.stringify(cuerpo),
})
const j = await r.json()

if (j.error) { console.error('ERROR:', JSON.stringify(j.error).slice(0, 500)); process.exit(1) }
if (j.issues?.length) {
  for (const i of j.issues) console.error(`  ${i.severity}: ${i.description}`)
  if (j.issues.some((i) => i.severity === 'ERROR')) process.exit(1)
}

let fallos = 0
;(j.testResults ?? []).forEach((res, i) => {
  const ok = res.state === 'SUCCESS'
  if (!ok) fallos++
  console.log(`  ${ok ? 'ok  ' : 'FALLA'} ${CASOS[i].nombre}  [esperado ${CASOS[i].expectation}]`)
})
console.log(fallos ? `\n  ${fallos} casos fallan.\n` : `\n  ${CASOS.length} casos, todos como deben.\n`)
process.exit(fallos ? 1 : 0)
