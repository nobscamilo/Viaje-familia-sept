// Guardia del proyecto: ningun archivo de src/ o functions/ por encima de 400 lineas.
// Es la regla que impide que vuelva a aparecer un App.jsx de 8.309 lineas.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const LIMIT = 400
const ROOTS = ['src', 'functions']
const EXTS = new Set(['.js', '.jsx', '.mjs', '.css'])
const offenders = []

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) { walk(full); continue }
    if (!EXTS.has(extname(entry))) continue
    const lines = readFileSync(full, 'utf8').split('\n').length
    if (lines > LIMIT) offenders.push({ full, lines })
  }
}

for (const root of ROOTS) {
  try { walk(root) } catch { /* la carpeta puede no existir todavia */ }
}

if (offenders.length) {
  console.error(`\n${offenders.length} archivo(s) por encima de ${LIMIT} lineas:\n`)
  for (const o of offenders.sort((a, b) => b.lines - a.lines)) {
    console.error(`  ${String(o.lines).padStart(5)}  ${o.full}`)
  }
  console.error('\nParte el archivo antes de seguir.\n')
  process.exit(1)
}
console.log(`OK: ningun archivo supera ${LIMIT} lineas.`)
