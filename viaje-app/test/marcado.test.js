import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analizar, negritas } from '../src/domain/marcado.js'

/** El texto EXACTO que salió con asteriscos en la pantalla del 30 de agosto. */
const REAL = `¡Listo! Aquí les dejo las opciones para llegar a IFEMA desde Sol el día de la carrera:

*   **En transporte público:** Se tardan como 1 hora y 9 minutos.
*   **En coche:** Unos 29 minutos, pero ojo con el tráfico y el parqueo por el evento.
*   **En bici:** Unos 46 minutos. ¡Para los más deportistas!

¿Cuál les suena mejor?`

test('la respuesta que salía con asteriscos se convierte en lista y negritas', () => {
  const b = analizar(REAL)
  assert.deepEqual(b.map((x) => x.tipo), ['p', 'lista', 'p'])
  assert.equal(b[1].puntos.length, 3)
  // El «**En coche:**» es una negrita, no cuatro asteriscos.
  assert.deepEqual(b[1].puntos[1][0], { fuerte: true, texto: 'En coche:' })
  // Y en ningún trozo queda un asterisco suelto.
  const todo = b.flatMap((x) => (x.tipo === 'lista' ? x.puntos.flat() : x.trozos))
  assert.ok(todo.every((t) => !t.texto.includes('*')), 'quedan asteriscos en el texto')
})

test('reconoce las tres formas de viñeta que alterna el modelo', () => {
  for (const marca of ['* ', '- ', '1. ']) {
    const b = analizar(`${marca}uno\n${marca}dos`)
    assert.equal(b[0].tipo, 'lista', `no reconoce «${marca}»`)
    assert.equal(b[0].puntos.length, 2)
  }
})

test('un texto normal sigue siendo un párrafo', () => {
  const b = analizar('El metro tarda 39 minutos desde Sol.')
  assert.deepEqual(b, [{ tipo: 'p', trozos: [{ fuerte: false, texto: 'El metro tarda 39 minutos desde Sol.' }] }])
})

test('las líneas seguidas se juntan en un párrafo y el hueco lo separa', () => {
  const b = analizar('uno\ndos\n\ntres')
  assert.equal(b.length, 2)
  assert.equal(b[0].trozos[0].texto, 'uno dos')
})

test('no se pierde texto por el camino', () => {
  // Un analizador que se come una frase es peor que uno que deja asteriscos.
  const b = analizar(REAL)
  const pintado = b.flatMap((x) => (x.tipo === 'lista' ? x.puntos.flat() : x.trozos))
    .map((t) => t.texto).join(' ')
  for (const frase of ['1 hora y 9 minutos', 'el parqueo por el evento', '¿Cuál les suena mejor?']) {
    assert.ok(pintado.includes(frase), `se ha perdido «${frase}»`)
  }
})

test('un asterisco suelto no rompe nada', () => {
  assert.deepEqual(negritas('2 * 3 = 6'), [{ fuerte: false, texto: '2 * 3 = 6' }])
  assert.equal(analizar('').length, 0)
  assert.equal(analizar(null).length, 0)
})
