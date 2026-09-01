import { test } from 'node:test'
import assert from 'node:assert/strict'

import { TRAVELERS } from '../src/data/travelers.js'
import { GROUPS } from '../src/data/trip-madrid-2026.js'
import { HOGARES, etiquetaHogar, hogarDe } from '../src/data/hogares.js'
import { GASTOS_INICIALES } from '../src/data/gastos-iniciales.js'
import {
  aCentimos, adultosDe, euros, liquidar, pesos, plural, porCategoria, repartir, saldos,
  tienePagadores, total,
} from '../src/domain/cuentas.js'

const conGrupos = (g) => adultosDe(g, TRAVELERS, GROUPS)

// ------------------------------------------------------------ los hogares

test('los hogares cubren a los SIETE adultos y a ningun niño', () => {
  const dentro = HOGARES.flatMap((h) => h.miembros)
  assert.equal(dentro.length, 7)
  assert.equal(new Set(dentro).size, 7, 'nadie en dos hogares a la vez')
  assert.equal(hogarDe('juan-felipe'), null)
  assert.equal(hogarDe('juan-guillermo'), null)
  for (const t of TRAVELERS.filter((x) => x.age >= 18)) {
    assert.ok(hogarDe(t.id), `${t.id} se ha quedado sin hogar`)
  }
})

// ------------------------------------------------------------- el reparto

test('un gasto de todos se divide entre 7, no entre 9', () => {
  assert.equal(conGrupos('all').length, 7)
})

test('un plan del grupo de F1 lo pagan los tres del circuito', () => {
  assert.deepEqual(conGrupos('f1'), ['camilo', 'fernando', 'juliana-bueno'])
})

test('un plan sin F1 lo pagan sus CUATRO adultos, aunque vayan seis', () => {
  // El grupo son seis personas: cuatro adultos y los dos niños.
  assert.equal(GROUPS.sinF1.travelerIds.length, 6)
  assert.equal(conGrupos('sin-f1').length, 4)
})

test('el vuelo de Bilbao solo lo pagan Camilo y Juliana', () => {
  assert.deepEqual(conGrupos(['camilo', 'juliana-bueno']), ['camilo', 'juliana-bueno'])
})

// ------------------------------------------------- ni un centimo perdido

test('el reparto suma SIEMPRE lo que se pago, con importes feos', () => {
  for (const cent of [1, 2, 7, 99, 100, 10_000, 12_345, 305_874, 999_999]) {
    for (const n of [1, 2, 3, 4, 7]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`)
      const trozos = repartir(cent, ids)
      const suma = Object.values(trozos).reduce((a, b) => a + b, 0)
      assert.equal(suma, cent, `${cent} entre ${n} no vuelve a dar ${cent}`)
    }
  }
})

test('100 € entre 7 son 14,29 para tres y 14,28 para cuatro', () => {
  const t = repartir(10_000, ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  assert.equal(t.a, 1429)
  assert.equal(t.g, 1428)
  assert.equal(Object.values(t).reduce((x, y) => x + y), 10_000)
})

test('el reparto es estable: el mismo gasto reparte igual dos veces', () => {
  const ids = ['fernando', 'camilo', 'cielo']
  assert.deepEqual(repartir(1000, ids), repartir(1000, [...ids].reverse()))
})

// ------------------------------------------------------ el caso de Camilo

test('si Camilo paga una comida de todos, cada casa debe lo que tiene de adultos', () => {
  // Escrito como REGLA y no como «3/7»: Julián David cambió de casa el 30 de
  // agosto —su abuelo cubre sus gastos— y tres pruebas se cayeron porque
  // llevaban el reparto de entonces escrito a mano. Un número mágico en una
  // prueba caduca; la regla, no.
  const gasto = [{
    importeCent: 7000, pagadoPor: 'camilo', participantes: 'all', categoria: 'comida',
  }]
  const s = saldos(gasto, TRAVELERS, GROUPS)
  const cuantos = (id) => HOGARES.find((h) => h.id === id).miembros.length

  assert.equal(s.camilo.pagado, 7000)
  for (const h of HOGARES) {
    assert.equal(s[h.id].debe, 1000 * cuantos(h.id), `${h.id}: mil por adulto`)
  }
  assert.equal(s.camilo.saldo, 7000 - 1000 * cuantos('camilo'))

  const pagos = liquidar(s)
  assert.ok(pagos.every((p) => p.a === 'camilo'))
  assert.equal(pagos.reduce((n, p) => n + p.importeCent, 0), s.camilo.saldo)
})

test('los niños consumen pero no deben: su parte la ponen los siete adultos', () => {
  // Una comida de los nueve a 9 € por cabeza son 81 €, y se parten entre 7.
  const s = saldos([{ importeCent: 8100, pagadoPor: 'camilo', participantes: 'all' }], TRAVELERS, GROUPS)
  const totalDebido = Object.values(s).reduce((n, c) => n + c.debe, 0)
  assert.equal(totalDebido, 8100, 'no se pierde la parte de los niños')
  // Proporcional al número de adultos, con el margen de un céntimo: 8.100
  // entre 7 no es exacto y el que sobra se lo lleva alguien. Repetir aquí el
  // reparto del resto sería copiar el algoritmo dentro de su propia prueba —
  // ya está probado aparte, con importes feos.
  for (const h of HOGARES) {
    const justo = 8100 * h.miembros.length / 7
    assert.ok(Math.abs(s[h.id].debe - justo) <= 1, `${h.id}: ${s[h.id].debe} vs ${justo}`)
  }
})

test('los saldos de los tres hogares siempre suman cero', () => {
  const s = saldos(GASTOS_INICIALES, TRAVELERS, GROUPS)
  const suma = Object.values(s).reduce((n, c) => n + c.saldo, 0)
  assert.equal(suma, 0)
})

// --------------------------------------------------------- liquidaciones

test('una transferencia entre hogares reduce la deuda', () => {
  const gasto = [{ importeCent: 7000, pagadoPor: 'camilo', participantes: 'all' }]
  const antes = saldos(gasto, TRAVELERS, GROUPS)
  const debenLosPadres = -antes.padres.saldo
  assert.ok(debenLosPadres > 0)

  const despues = saldos(gasto, TRAVELERS, GROUPS,
    [{ de: 'padres', a: 'camilo', importeCent: debenLosPadres }])
  assert.equal(despues.padres.saldo, 0, 'pagando lo que deben, quedan a cero')
  assert.equal(despues.camilo.saldo, antes.camilo.saldo - debenLosPadres)
  assert.equal(liquidar(despues).length, 1, 'ya solo queda una transferencia')
})

test('cuando todo esta saldado no se propone ninguna transferencia', () => {
  assert.deepEqual(liquidar({ camilo: { saldo: 0 }, padres: { saldo: 0 }, hermana: { saldo: 0 } }), [])
})

// --------------------------------------------------- lo que ya esta pagado

test('la F1 NO entra en las cuentas', () => {
  for (const g of GASTOS_INICIALES) {
    assert.ok(!/f1|ifema|madring|f[oó]rmula/i.test(g.concepto), `${g.id} no deberia estar`)
  }
})

test('cada gasto sembrado tiene importe, pagador y participantes', () => {
  const ids = new Set(TRAVELERS.map((t) => t.id))
  for (const g of GASTOS_INICIALES) {
    assert.ok(Number.isInteger(g.importeCent) && g.importeCent > 0, `${g.id}: importe`)
    assert.ok(ids.has(g.pagadoPor), `${g.id}: pagador desconocido`)
    assert.ok(hogarDe(g.pagadoPor), `${g.id}: quien paga tiene que tener hogar`)
    assert.ok(g.participantes, `${g.id}: sin participantes`)
    assert.ok(conGrupos(g.participantes).length > 0, `${g.id}: nadie lo paga`)
  }
})

test('lo sembrado suma exactamente lo que dice la agenda', async () => {
  // Si alguien cambia `priceEur` en la agenda y olvida el gasto (o al reves),
  // el total del viaje y las cuentas empiezan a contar cosas distintas y nadie
  // se entera. Paso el 28 de agosto con las maletas de Barcelona.
  const { TIMELINE } = await import('../src/data/trip-madrid-2026.js')
  for (const ref of ['vuelo-bcn-ory', 'vuelo-ory-bio', 'traslado-mad-bcn', 'aloj-madrid', 'aloj-paris', 'aloj-barcelona']) {
    const ev = TIMELINE.find((e) => e.id === ref)
    const enCuentas = GASTOS_INICIALES.filter((g) => g.ref === ref)
      .reduce((n, g) => n + g.importeCent, 0)
    assert.equal(enCuentas, Math.round(ev.priceEur * 100), `${ref}: la agenda dice ${ev.priceEur} y las cuentas ${enCuentas / 100}`)
  }
})

test('los importes sembrados cuadran con la agenda', () => {
  const suma = (ref) => GASTOS_INICIALES
    .filter((g) => g.ref === ref)
    .reduce((n, g) => n + g.importeCent, 0)
  // El vuelo de Orly a Bilbao se pago en DOS veces, y las dos suman el total
  // que dice el correo de Vueling: 456,44 del padre + 225,00 de Camilo.
  assert.equal(suma('vuelo-ory-bio'), 68144)
  // El de Barcelona tambien se pago en dos veces: 431,91 del padre en mayo y
  // 405,00 de Camilo el 28 de agosto por las nueve maletas.
  assert.equal(suma('vuelo-bcn-ory'), 83691)
  assert.equal(suma('traslado-mad-bcn'), 24500)
})

// ------------------------------------------------------------- formateo

test('los euros se escriben como en España', () => {
  assert.equal(euros(305874), '3.058,74 €')
  assert.equal(euros(0), '0,00 €')
  assert.equal(euros(5), '0,05 €')
})

test('leer un importe escrito a mano', () => {
  assert.equal(aCentimos('12,50'), 1250)
  assert.equal(aCentimos('12.50'), 1250)
  assert.equal(aCentimos('1.234,56'), 123_456)
  assert.equal(aCentimos('40 €'), 4000)
  assert.equal(aCentimos(''), null)
  assert.equal(aCentimos('pizza'), null)
  assert.equal(aCentimos('-5'), null)
})

test('el desglose por categoria suma el total', () => {
  const cats = porCategoria(GASTOS_INICIALES)
  assert.equal(cats.reduce((n, c) => n + c.cent, 0), total(GASTOS_INICIALES))
  assert.equal(cats[0].categoria, 'alojamiento', 'lo que mas cuesta es dormir')
})

test('«1 gasto», no «1 gastos»', () => {
  assert.equal(plural(0, 'gasto', 'gastos'), '0 gastos')
  assert.equal(plural(1, 'gasto', 'gastos'), '1 gasto')
  assert.equal(plural(9, 'gasto', 'gastos'), '9 gastos')
})

test('el boton de «ya esta» se pinta de verdad', async () => {
  // Un boton que no se renderiza con todas las pruebas en verde ya ha pasado
  // dos veces en este proyecto. Sin esto, las cuentas no cerrarian nunca:
  // nadie podria anotar que la transferencia se hizo.
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../src/ui/Saldo.jsx', import.meta.url), 'utf8')
  assert.match(src, /className="sal-hecho"/)
  assert.match(src, /anotarLiquidacion\(/)
})

// -------------------------------------------------- desde la silla de cada uno
//
// La pantalla la miran nueve personas, no solo quien la encargó. Los nombres
// eran «Nosotros / Papás / Hermana»: Fernando entraba con su código y leía
// «Papás» para sus suegros, «Hermana» para su propia casa y «Nosotros» para la
// de su cuñado. Las tres mal, y ninguna prueba lo veía.

test('nadie lee el nombre de otra casa como si fuera la suya', () => {
  const todos = TRAVELERS.filter((t) => hogarDe(t.id))
  for (const t of todos) {
    const mio = hogarDe(t.id).id
    for (const h of HOGARES) {
      const txt = etiquetaHogar(h.id, mio)
      if (h.id === mio) assert.equal(txt, 'Vosotros', `${t.id} deberia leer «Vosotros» en su casa`)
      else assert.notEqual(txt, 'Vosotros', `${t.id} lee «Vosotros» en la casa de otro`)
    }
  }
})

test('los nombres de los hogares no dan por hecho quien mira', () => {
  // «Papás», «Hermana», «Mamá», «Suegros»… solo son ciertos desde una silla.
  for (const h of HOGARES) {
    assert.doesNotMatch(h.short, /nosotros|pap[áa]s|hermana$|mam[áa]|suegr/i,
      `«${h.short}» solo vale para una persona`)
    // Un nombre de hogar tiene que llevar el nombre de alguien.
    assert.ok(h.miembros.some((id) => {
      const t = TRAVELERS.find((x) => x.id === id)
      return t && h.short.includes(t.short.split(' ')[0])
    }), `«${h.short}» no menciona a nadie de la casa`)
  }
})

test('Fernando ve tres nombres distintos y ninguno equivocado', () => {
  const suyo = hogarDe('fernando').id
  const vistos = HOGARES.map((h) => etiquetaHogar(h.id, suyo))
  assert.deepEqual(vistos, ['Camilo y Juliana', 'Julián y Cielo', 'Vosotros'])
  assert.equal(new Set(vistos).size, 3, 'ningun nombre repetido')
})

test('sin sesion, todos los hogares se llaman por su nombre', () => {
  // Si `miHogar` es null (aun cargando, o un niño con el movil de su madre),
  // nadie es «Vosotros»: es preferible un nombre neutro a uno equivocado.
  const vistos = HOGARES.map((h) => etiquetaHogar(h.id, null))
  assert.ok(!vistos.includes('Vosotros'))
})

// ----------------------------------------------------- el cambio de pesos

test('los pesos se convierten en enteros, sin pasar por decimales', async () => {
  const { copAEur } = await import('../src/services/cambio.js')
  // 200.000 COP a 3.676,59 por euro
  assert.equal(copAEur(20_000_000, 3676.59), 5440)
  assert.equal(copAEur(0, 3676.59), 0)
  // Sin tasa no se inventa nada.
  assert.equal(copAEur(20_000_000, null), null)
  assert.equal(copAEur(20_000_000, 0), null)
  assert.equal(copAEur(null, 3676.59), null)
})

test('el copiloto tiene los cuatro verbos de gastos, y sugerir no escribe', async () => {
  const { readFileSync } = await import('node:fs')
  // Declarada en un archivo y ejecutada en otro: se comprueban los dos, que
  // es justo lo que hace falta para que una herramienta sirva de algo.
  const d = readFileSync(new URL('../functions/lib/declaraciones.js', import.meta.url), 'utf8')
  const h = readFileSync(new URL('../functions/lib/herramientas.js', import.meta.url), 'utf8')
  for (const t of ['anotarGasto', 'listarGastos', 'quitarGasto', 'sugerirGastos']) {
    assert.match(d, new RegExp(`name: '${t}'`), `falta la herramienta ${t}`)
    assert.match(h, new RegExp(`nombre === '${t}'`), `${t} declarada pero sin ejecutar`)
  }
  const g = readFileSync(new URL('../functions/gastos.js', import.meta.url), 'utf8')
  // `sugerir` solo lee. Si algun dia escribe, esto salta.
  const cuerpo = g.slice(g.indexOf('export async function sugerir'))
  assert.ok(!/\.add\(|\.set\(|\.delete\(|\.update\(/.test(cuerpo), 'sugerir no puede escribir')
  // Y lo sembrado no se borra desde el copiloto.
  assert.match(g, /origen === 'seed'/)
})

test('cada pagador sembrado tiene su justificante', () => {
  // «Quién pagó» mueve dinero real entre hermanos. Ninguno puede descansar
  // sobre la memoria de nadie: Camilo hizo casi todas las reservas, pero con
  // la tarjeta de su padre, y confundir reservar con pagar le daría un saldo
  // a favor de casi 5.000 € que no ha puesto.
  for (const g of GASTOS_INICIALES) {
    assert.ok(g.nota, `${g.id}: sin nota que diga de dónde sale el pagador`)
  }
})

// ------------------------------------------- el punto ambiguo del español

test('un importe con puntos de millar se lee bien', () => {
  // «3.676.590» devolvía null: al pasar 1.000 € a pesos, el campo quedaba con
  // un número que la propia app no sabía leer.
  assert.equal(aCentimos('3.676.590'), 367_659_000)
  assert.equal(aCentimos('1.000'), 100_000, 'nadie escribe «1.000» por un euro')
  assert.equal(aCentimos('1.234,56'), 123_456)
  assert.equal(aCentimos('12.50'), 1250, 'dos decimales: punto decimal, a la inglesa')
  assert.equal(aCentimos('250000'), 25_000_000)
  assert.equal(aCentimos('1.000,50'), 100_050)
})

test('ida y vuelta entre euros y pesos sin perder el importe', async () => {
  const { copAEur, eurACop } = await import('../src/services/cambio.js')
  const tasa = 3676.59
  for (const eur of [100_000, 4250, 1, 999_999]) {
    const cop = eurACop(eur, tasa)
    assert.equal(copAEur(cop, tasa), eur, `${eur} céntimos no vuelven de los pesos`)
  }
  // 1.000 € son 3.676.590 pesos, no 1.000 pesos.
  assert.equal(pesos(eurACop(100_000, tasa)), '3.676.590')
})

test('lo que se escribe en pesos se puede volver a leer', async () => {
  const { eurACop } = await import('../src/services/cambio.js')
  // El texto que pinta la app al cambiar de moneda tiene que poder
  // reintroducirse en el mismo campo. Aquí se rompía el círculo.
  const texto = pesos(eurACop(100_000, 3676.59))
  assert.equal(aCentimos(texto), 367_659_000)
})

test('sin tasa no se convierte nada', async () => {
  const { eurACop } = await import('../src/services/cambio.js')
  assert.equal(eurACop(100_000, null), null)
  assert.equal(eurACop(null, 3676.59), null)
})

test('la lista de gastos abre el gasto de verdad', async () => {
  // El borrado vivía en el servidor y en las reglas desde el primer día, sin
  // un solo botón que lo llamara: la lista era papel pintado. La mitad
  // invisible de una función es una función que no está.
  const { readFileSync } = await import('node:fs')
  const c = readFileSync(new URL('../src/app/surfaces/Cuentas.jsx', import.meta.url), 'utf8')
  assert.match(c, /className="ctas-g-abrir"/, 'la fila tiene que ser tocable')
  assert.match(c, /<NuevoGasto gasto=\{editando\}/, 'y abrir el gasto')

  const n = readFileSync(new URL('../src/ui/NuevoGasto.jsx', import.meta.url), 'utf8')
  assert.match(n, /editarGasto\(/, 'y poder guardarlo')
  assert.match(n, /borrarGasto\(/, 'y poder quitarlo')
  // Sin confirmar no se borra dinero de nadie.
  assert.match(n, /confirmando/)
  // Lo sembrado se explica, no se deja editar en silencio.
  assert.match(n, /esSembrado/)
})

// ------------------------------------- la invariante, pase lo que pase

test('los saldos suman cero incluso con un gasto sin adultos', () => {
  // Una entrada solo para los dos niños, o una lista de participantes mal
  // guardada. Alguien puso el dinero: si nadie lo debe, aparece un crédito de
  // la nada y las cuentas dejan de cuadrar. Lo asume quien lo pagó.
  const raros = [
    { importeCent: 5000, pagadoPor: 'camilo', participantes: ['juan-felipe', 'juan-guillermo'] },
    { importeCent: 3000, pagadoPor: 'cielo', participantes: [] },
    { importeCent: 7000, pagadoPor: 'fernando', participantes: 'all' },
  ]
  const s = saldos(raros, TRAVELERS, GROUPS)
  assert.equal(Object.values(s).reduce((n, c) => n + c.saldo, 0), 0)
  // Y el que pagó lo de los niños no queda con un crédito falso.
  assert.equal(s.camilo.pagado - s.camilo.debe, -Math.round(7000 * 2 / 7))
})

test('tienePagadores avisa antes de guardar un gasto que no reparte', () => {
  assert.equal(tienePagadores('all', TRAVELERS, GROUPS), true)
  assert.equal(tienePagadores(['camilo'], TRAVELERS, GROUPS), true)
  assert.equal(tienePagadores(['juan-felipe'], TRAVELERS, GROUPS), false)
  assert.equal(tienePagadores([], TRAVELERS, GROUPS), false)
})

test('un gasto entre tres personas sueltas se parte en tres', () => {
  const s = saldos(
    [{ importeCent: 9000, pagadoPor: 'camilo', participantes: ['camilo', 'julian-padre', 'fernando'] }],
    TRAVELERS, GROUPS,
  )
  assert.equal(s.camilo.saldo, 6000)
  assert.equal(s.padres.saldo, -3000)
  assert.equal(s.hermana.saldo, -3000)
})

test('las transferencias se pueden deshacer desde la pantalla', async () => {
  // Segunda vez que construyo el servidor sin el botón. Que salte solo.
  const { readFileSync } = await import('node:fs')
  const s = readFileSync(new URL('../src/ui/Saldado.jsx', import.meta.url), 'utf8')
  assert.match(s, /borrarLiquidacion\(/)
  assert.match(s, /editarLiquidacion\(/)
  const c = readFileSync(new URL('../src/app/surfaces/Cuentas.jsx', import.meta.url), 'utf8')
  assert.match(c, /<Saldado/, 'y la pantalla tiene que montarlo')
})

test('el copiloto reparte entre una sola persona sin repartirlo entre nueve', async () => {
  const { readFileSync } = await import('node:fs')
  const g = readFileSync(new URL('../functions/gastos.js', import.meta.url), 'utf8')
  // «camilo» sin coma caía al `else` y se repartía entre los nueve.
  assert.match(g, /Array\.isArray\(args\.participantes\)/)
  assert.match(g, /ADULTOS/)
})

test('el abuelo cubre a Julián David', () => {
  // Acordado el 30 de agosto de 2026. Está aquí para que no se deshaga sin
  // querer: si alguien lo devuelve a la casa de su madre, esto lo dice.
  assert.equal(hogarDe('julian-david').id, 'padres')
  assert.equal(hogarDe('juliana-hermana').id, 'hermana')
  assert.equal(hogarDe('fernando').id, 'hermana')

  // Y lo que eso significa en dinero sobre lo ya reservado.
  const s = saldos(GASTOS_INICIALES, TRAVELERS, GROUPS)
  assert.equal(s.hermana.debe, 187865, 'dos adultos, no tres')
  assert.equal(s.padres.debe, 281804, 'tres adultos, no dos')
  assert.equal(Object.values(s).reduce((n, c) => n + c.saldo, 0), 0)
})

test('plural() trae el numero CON separador de miles, y nadie se lo antepone', async () => {
  // «18.420 18420 reseñas» salio en una captura real el 1 de septiembre:
  // tres call sites hacian `miles(n) + plural(n, …)` y plural ya traia el
  // numero, sin separador. La regla queda dentro de plural().
  const { plural } = await import('../src/domain/cuentas.js')
  assert.equal(plural(18420, 'reseña', 'reseñas'), '18.420 reseñas')
  assert.equal(plural(1, 'reseña', 'reseñas'), '1 reseña')
  const { readFileSync } = await import('node:fs')
  for (const f of ['../src/app/surfaces/Copiloto.jsx', '../src/ui/ReciboRuta.jsx', '../src/ui/BorradorRuta.jsx']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8')
    assert.ok(!/miles\([^)]*\)\s*\}?\s*\$?\{?plural\(/.test(src), `${f} duplica el numero`)
  }
})
