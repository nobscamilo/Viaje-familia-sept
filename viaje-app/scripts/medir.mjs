/**
 * Mide desbordes de verdad, en vez de mirar una captura y adivinar.
 *
 * Nace del 29 de agosto: la hoja de «Anotar un gasto» se salía de la pantalla
 * y con dos capturas seguidas no supe por que. Medida, la respuesta salio en
 * un segundo: los hijos median 534 px dentro de una hoja de 460, porque una
 * pista `auto` de CSS Grid se dimensiona al MAX-CONTENT del hijo mas ancho y
 * desborda el contenedor aunque este tenga ancho fijo. Se arregla con
 * `grid-template-columns: minmax(0, 1fr)`.
 *
 * Una captura dice QUE algo esta mal. Una medida dice CUANTO y DONDE.
 *
 *   node scripts/medir.mjs '/cuentas?anotar'
 *   node scripts/medir.mjs '/cuentas?anotar' 375
 *
 * Necesita el navegador de Playwright:  npx playwright install chromium
 * Compila a /tmp/local-dist si no existe, igual que scripts/capturar.sh.
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const RUTA = process.argv[2] ?? '/'
const ANCHOS = process.argv[3] ? [Number(process.argv[3])] : [1280, 430, 390, 375]
const DIST = '/tmp/local-dist'

if (!existsSync(`${DIST}/index.html`)) {
  console.log('Compilando…')
  execSync(`VITE_FIREBASE_API_KEY='' VITE_FIREBASE_PROJECT_ID='' npx vite build --outDir ${DIST} --base ./`,
    { stdio: 'inherit' })
}

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const srv = http.createServer((req, res) => {
  let p = path.join(DIST, decodeURI(req.url.split('?')[0]))
  // Reserva SPA: /cuentas no es un archivo, es una ruta.
  if (!existsSync(p) || statSync(p).isDirectory()) p = path.join(DIST, 'index.html')
  res.setHeader('content-type', TIPOS[path.extname(p)] ?? 'text/plain')
  res.end(readFileSync(p))
})
await new Promise((r) => srv.listen(4400, r))

/**
 * Playwright NO esta en `package.json` a proposito: instalarlo se trae ~150 MB
 * de navegadores en cada `npm install`, y esta herramienta se usa unas pocas
 * veces al mes. Es la unica dependencia opcional del proyecto, y por eso tiene
 * que decir en voz alta como instalarse en vez de reventar con un stack.
 */
const { chromium } = await import('playwright').catch(() => {
  console.error('Falta Playwright. Instalalo solo para medir:\n' +
    '  npm i --no-save playwright && npx playwright install chromium')
  process.exit(1)
})
const nav = await chromium.launch()
let fallos = 0

for (const ancho of ANCHOS) {
  const pag = await nav.newPage({ viewport: { width: ancho, height: 900 } })
  await pag.goto(`http://localhost:4400${RUTA}`, { waitUntil: 'networkidle' })
  await pag.waitForTimeout(600)

  const r = await pag.evaluate(() => {
    const limite = document.documentElement.clientWidth
    const fuera = []
    for (const el of document.querySelectorAll('*')) {
      const c = el.getBoundingClientRect()
      if (c.width === 0) continue
      let p = el.parentElement
      let enScroll = false
      while (p && p !== document.body) {
        const sx = window.getComputedStyle(p).overflowX
        if (sx === 'auto' || sx === 'scroll') { enScroll = true; break }
        p = p.parentElement
      }
      if (enScroll) continue
      if (c.right > limite + 1 || c.left < -1) {
        fuera.push({
          que: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`,
          izq: Math.round(c.left), der: Math.round(c.right), ancho: Math.round(c.width),
          padre: el.parentElement ? Math.round(el.parentElement.getBoundingClientRect().width) : null,
        })
      }
    }
    return { limite, scroll: document.documentElement.scrollWidth, fuera: fuera.slice(0, 10) }
  })

  const mal = r.scroll > r.limite || r.fuera.length > 0
  if (mal) fallos++
  console.log(`\n  ${mal ? 'DESBORDA' : 'ok      '} ${ancho} px · scrollWidth ${r.scroll}`)
  for (const f of r.fuera) {
    console.log(`      ${f.que.padEnd(28)} ${String(f.ancho).padStart(5)} px dentro de un padre de ${f.padre} · de ${f.izq} a ${f.der}`)
  }
  await pag.close()
}

await nav.close()
srv.close()
console.log(fallos ? `\n  ${fallos} anchos desbordan.\n` : `\n  ${ANCHOS.length} anchos, ninguno desborda.\n`)
process.exit(fallos ? 1 : 0)
